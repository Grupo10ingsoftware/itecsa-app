import { config } from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import getPrismaClient, {
  disconnectPrismaClient,
} from "../src/database/prisma.js";
import PaymentSignatureService from "../src/modules/documents/service/paymentSignature.service.js";

config();

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const serverRootDirectory = path.resolve(currentDirectory, "..");
const projectRootDirectory = path.resolve(serverRootDirectory, "..");
const projectDirectoryName = path.basename(projectRootDirectory);
const applyChanges = process.argv.includes("--apply");
const confirmedOrderId = 1;
const pendingOrderIds = [2, 3, 6, 8];
const targetOrderIds = [confirmedOrderId, ...pendingOrderIds];

function resolveStoredProjectPath(storedPath) {
  if (typeof storedPath !== "string" || storedPath.trim().length === 0) {
    return null;
  }

  const normalizedPath = storedPath.replace(/\\/g, "/");
  const projectPrefix = `${projectDirectoryName}/`;
  const relativePath = normalizedPath.startsWith(projectPrefix)
    ? normalizedPath.slice(projectPrefix.length)
    : normalizedPath;
  const resolvedPath = path.resolve(projectRootDirectory, relativePath);

  if (
    resolvedPath !== projectRootDirectory &&
    !resolvedPath.startsWith(`${projectRootDirectory}${path.sep}`)
  ) {
    return null;
  }

  return resolvedPath;
}

async function getRequiredStatusIds(prisma) {
  const [pendingPayment, confirmedPayment, paymentStep, productionReadyStep] =
    await Promise.all([
      prisma.estado_Pago.findFirst({
        where: { nombre_estado_pago: "Pendiente" },
      }),
      prisma.estado_Pago.findFirst({
        where: { nombre_estado_pago: "Confirmado" },
      }),
      prisma.estado_Pedido.findFirst({
        where: { orden_kanban: 0 },
      }),
      prisma.estado_Pedido.findFirst({
        where: { orden_kanban: 1 },
      }),
    ]);

  if (!pendingPayment || !confirmedPayment || !paymentStep || !productionReadyStep) {
    throw new Error("No fue posible resolver los estados base de pago/pedido.");
  }

  return {
    confirmedPaymentId: confirmedPayment.id_estado_Pago,
    pendingPaymentId: pendingPayment.id_estado_Pago,
    paymentStepId: paymentStep.id_estado_pedido,
    productionReadyStepId: productionReadyStep.id_estado_pedido,
  };
}

async function readTargetOrders(prisma) {
  return prisma.pedidos.findMany({
    where: { id_pedido: { in: targetOrderIds } },
    include: {
      Documento: {
        include: {
          Nota_Venta: true,
          Firma_Documento: {
            include: { Firma_Pago: true },
          },
        },
      },
      Registro_Pago: {
        orderBy: { id_registro_pago: "desc" },
      },
    },
    orderBy: { id_pedido: "asc" },
  });
}

function collectPlan(orders, statusIds) {
  const confirmedOrder = orders.find(
    (order) => Number(order.id_pedido) === confirmedOrderId,
  );
  const confirmedDocument = confirmedOrder?.Documento.find(
    (document) => document.Nota_Venta,
  );
  const confirmedSignature = confirmedDocument?.Firma_Documento.find(
    (signature) => signature.Firma_Pago,
  );
  const latestConfirmedPaymentRecord = confirmedOrder?.Registro_Pago.find(
    (record) => Number(record.id_estado_pago) === statusIds.confirmedPaymentId,
  );
  const signingUserId =
    confirmedSignature?.id_usuario ?? latestConfirmedPaymentRecord?.id_usuario;
  const pendingOrders = orders.filter((order) =>
    pendingOrderIds.includes(Number(order.id_pedido)),
  );
  const pendingPaymentSignatureIds = pendingOrders.flatMap((order) =>
    order.Documento.flatMap((document) =>
      document.Firma_Documento
        .filter((signature) => signature.Firma_Pago)
        .map((signature) => signature.id_firma_documento),
    ),
  );
  const pendingDocumentIds = pendingOrders.flatMap((order) =>
    order.Documento
      .filter((document) => document.Nota_Venta)
      .map((document) => document.id_documento),
  );
  const pdfBackups = orders.flatMap((order) =>
    order.Documento
      .filter((document) => document.Nota_Venta && document.ruta_pdf)
      .map((document) => ({
        orderId: order.id_pedido,
        ruta_pdf: document.ruta_pdf,
        sourcePath: resolveStoredProjectPath(document.ruta_pdf),
      })),
  );

  return {
    confirmedOrderId,
    pendingOrderIds,
    signingUserId,
    keepPaymentRecordId: latestConfirmedPaymentRecord?.id_registro_pago ?? null,
    pendingPaymentSignatureIds,
    pendingDocumentIds,
    paymentRecordsToDelete: orders.flatMap((order) => {
      if (pendingOrderIds.includes(Number(order.id_pedido))) {
        return order.Registro_Pago.map((record) => record.id_registro_pago);
      }

      if (Number(order.id_pedido) === confirmedOrderId) {
        return order.Registro_Pago
          .filter(
            (record) =>
              record.id_registro_pago !==
              latestConfirmedPaymentRecord?.id_registro_pago,
          )
          .map((record) => record.id_registro_pago);
      }

      return [];
    }),
    pdfBackups,
  };
}

async function backupPdfs(plan) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDirectory = path.resolve(
    projectRootDirectory,
    "data",
    "backups",
    `payment-demo-cleanup-${timestamp}`,
  );
  const backups = [];

  await fs.mkdir(backupDirectory, { recursive: true });

  for (const pdf of plan.pdfBackups) {
    if (!pdf.sourcePath) continue;

    const destinationPath = path.resolve(
      backupDirectory,
      `Pedido${pdf.orderId}-${path.basename(pdf.sourcePath)}`,
    );

    await fs.copyFile(pdf.sourcePath, destinationPath);
    backups.push({
      sourcePath: pdf.sourcePath,
      destinationPath,
    });
  }

  return { backupDirectory, backups };
}

async function restoreBackups(backups) {
  for (const backup of backups) {
    await fs.copyFile(backup.destinationPath, backup.sourcePath);
  }
}

async function applyCleanup(prisma, statusIds, plan) {
  if (!plan.signingUserId) {
    throw new Error("Pedido1 no tiene usuario disponible para regenerar la firma.");
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.pedidos.update({
        where: { id_pedido: confirmedOrderId },
        data: {
          id_estado_pago: statusIds.confirmedPaymentId,
          id_estado_pedido: statusIds.productionReadyStepId,
        },
      });

      await tx.pedidos.updateMany({
        where: { id_pedido: { in: pendingOrderIds } },
        data: {
          id_estado_pago: statusIds.pendingPaymentId,
          id_estado_pedido: statusIds.paymentStepId,
        },
      });

      if (plan.paymentRecordsToDelete.length > 0) {
        await tx.registro_Pago.deleteMany({
          where: { id_registro_pago: { in: plan.paymentRecordsToDelete } },
        });
      }

      if (plan.pendingPaymentSignatureIds.length > 0) {
        await tx.firma_Pago.deleteMany({
          where: {
            id_firma_documento: { in: plan.pendingPaymentSignatureIds },
          },
        });
        await tx.firma_Documento.deleteMany({
          where: {
            id_firma_documento: { in: plan.pendingPaymentSignatureIds },
          },
        });
      }

      if (plan.pendingDocumentIds.length > 0) {
        await tx.nota_Venta.updateMany({
          where: { id_documento: { in: plan.pendingDocumentIds } },
          data: { firmado: 0 },
        });
      }

      const confirmedDocument = await tx.documento.findFirst({
        where: { id_pedido: confirmedOrderId },
        include: { Nota_Venta: true },
      });

      if (confirmedDocument?.id_documento) {
        await tx.nota_Venta.update({
          where: { id_documento: confirmedDocument.id_documento },
          data: { firmado: 1 },
        });
      }

      if (!plan.keepPaymentRecordId) {
        await tx.registro_Pago.create({
          data: {
            fecha_registro: new Date(),
            observacion: "Estado demo reparado: pago confirmado.",
            id_pedido: confirmedOrderId,
            id_usuario: Number(plan.signingUserId),
            id_estado_pago: statusIds.confirmedPaymentId,
          },
        });
      }

      const signatureService = new PaymentSignatureService({ prisma: tx });
      await signatureService.signPaymentDocument(
        confirmedOrderId,
        plan.signingUserId,
      );
    },
    {
      timeout: 20000,
      maxWait: 10000,
    },
  );
}

async function main() {
  const prisma = getPrismaClient();

  try {
    const statusIds = await getRequiredStatusIds(prisma);
    const orders = await readTargetOrders(prisma);
    const plan = collectPlan(orders, statusIds);

    console.log(JSON.stringify({
      mode: applyChanges ? "apply" : "dry-run",
      ...plan,
    }, null, 2));

    if (!applyChanges) {
      console.log("Dry-run completado. Ejecuta con --apply para aplicar cambios.");
      return;
    }

    const backup = await backupPdfs(plan);
    console.log(`Backups creados en ${backup.backupDirectory}`);

    try {
      await applyCleanup(prisma, statusIds, plan);
    } catch (error) {
      await restoreBackups(backup.backups);
      throw error;
    }

    console.log("Limpieza demo de pagos aplicada correctamente.");
  } finally {
    await disconnectPrismaClient();
  }
}

main().catch((error) => {
  console.error("No fue posible reparar la demo de pagos.", error);
  process.exitCode = 1;
});
