import { createHash } from "node:crypto";
import { config } from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import getPrismaClient, {
  disconnectPrismaClient,
} from "../src/database/prisma.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const serverRootDirectory = path.resolve(currentDirectory, "..");
config({ path: path.resolve(serverRootDirectory, ".env") });

const projectRootDirectory = path.resolve(serverRootDirectory, "..");
const projectDirectoryName = path.basename(projectRootDirectory);
const applyChanges = process.argv.includes("--apply");
const demoOrderIds = [1, 2, 3, 6, 8];
const cleanPdfSourceOrderId = 2;
const targetOrderIds = demoOrderIds.filter(
  (orderId) => orderId !== cleanPdfSourceOrderId,
);
const cleanPdfPath = path.resolve(
  projectRootDirectory,
  "data",
  "NVS",
  `Pedido${cleanPdfSourceOrderId}.pdf`,
);

function normalizeStoredPath(storedPath) {
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

async function fileHash(filePath) {
  const bytes = await fs.readFile(filePath);

  return createHash("sha256").update(bytes).digest("hex");
}

async function getRequiredStatusIds(prisma) {
  const [pendingPayment, paymentStep] = await Promise.all([
    prisma.estado_Pago.findFirst({
      where: { nombre_estado_pago: "Pendiente" },
    }),
    prisma.estado_Pedido.findFirst({
      where: { orden_kanban: 0 },
    }),
  ]);

  if (!pendingPayment || !paymentStep) {
    throw new Error("No fue posible resolver los estados base Pendiente/Confirmacion de Pago.");
  }

  return {
    pendingPaymentId: pendingPayment.id_estado_Pago,
    paymentStepId: paymentStep.id_estado_pedido,
  };
}

async function readOrderRows(prisma) {
  const orderIds = targetOrderIds.join(",");

  return prisma.$queryRawUnsafe(`
    SELECT
      p.id_pedido,
      p.id_estado_pago,
      ep.nombre_estado_pago,
      p.id_estado_pedido,
      epe.nombre_etapa,
      epe.orden_kanban,
      d.id_documento,
      d.ruta_pdf,
      nv.firmado,
      COUNT(DISTINCT fp.id_firma_documento) AS firmas_pago
    FROM Pedidos p
    LEFT JOIN Estado_Pago ep ON ep.id_estado_Pago = p.id_estado_pago
    LEFT JOIN Estado_Pedido epe ON epe.id_estado_pedido = p.id_estado_pedido
    LEFT JOIN Documento d ON d.id_pedido = p.id_pedido
    LEFT JOIN Nota_Venta nv ON nv.id_documento = d.id_documento
    LEFT JOIN Firma_Documento fd ON fd.id_documento = d.id_documento
    LEFT JOIN Firma_Pago fp ON fp.id_firma_documento = fd.id_firma_documento
    WHERE p.id_pedido IN (${orderIds})
    GROUP BY
      p.id_pedido,
      p.id_estado_pago,
      ep.nombre_estado_pago,
      p.id_estado_pedido,
      epe.nombre_etapa,
      epe.orden_kanban,
      d.id_documento,
      d.ruta_pdf,
      nv.firmado
    ORDER BY p.id_pedido
  `);
}

async function readPaymentRecords(prisma) {
  return prisma.registro_Pago.findMany({
    where: { id_pedido: { in: targetOrderIds } },
    select: {
      id_registro_pago: true,
      id_pedido: true,
      id_estado_pago: true,
      id_usuario: true,
      fecha_registro: true,
      observacion: true,
    },
    orderBy: { id_registro_pago: "asc" },
  });
}

async function readPaymentSignatureIds(prisma) {
  const orderIds = targetOrderIds.join(",");

  return prisma.$queryRawUnsafe(`
    SELECT DISTINCT
      fd.id_firma_documento,
      d.id_pedido,
      d.id_documento
    FROM Documento d
    INNER JOIN Firma_Documento fd ON fd.id_documento = d.id_documento
    INNER JOIN Firma_Pago fp ON fp.id_firma_documento = fd.id_firma_documento
    WHERE d.id_pedido IN (${orderIds})
    ORDER BY d.id_pedido, fd.id_firma_documento
  `);
}

async function readUserSignatureRouteUpdates(prisma) {
  const users = await prisma.usuario.findMany({
    where: { ruta_firma: { endsWith: ".png" } },
    select: {
      id_usuario: true,
      correo_usuario: true,
      ruta_firma: true,
    },
    orderBy: { id_usuario: "asc" },
  });
  const updates = [];

  for (const user of users) {
    const nextRutaFirma = user.ruta_firma.replace(/\.png$/i, ".pdf");
    const nextSignaturePath = normalizeStoredPath(nextRutaFirma);

    if (!nextSignaturePath) {
      throw new Error(`La ruta PDF de firma del usuario ${user.id_usuario} no es valida.`);
    }

    await fs.access(nextSignaturePath);
    updates.push({
      idUsuario: user.id_usuario,
      correoUsuario: user.correo_usuario,
      previousRutaFirma: user.ruta_firma,
      nextRutaFirma,
    });
  }

  return updates;
}

function buildPlan({
  rows,
  paymentRecords,
  paymentSignatures,
  userSignatureRouteUpdates,
}) {
  const confirmedOrderIds = [
    ...new Set(
      rows
        .filter((row) => row.nombre_estado_pago === "Confirmado")
        .map((row) => Number(row.id_pedido)),
    ),
  ];
  const pdfsToRestore = rows
    .filter((row) => {
      const orderId = Number(row.id_pedido);
      const isConfirmed = row.nombre_estado_pago === "Confirmado";
      const isSigned = Number(row.firmado ?? 0) === 1 || Number(row.firmas_pago ?? 0) > 0;

      return (
        orderId !== cleanPdfSourceOrderId &&
        row.ruta_pdf &&
        (isConfirmed || isSigned)
      );
    })
    .map((row) => ({
      orderId: Number(row.id_pedido),
      idDocumento: row.id_documento,
      storedPath: row.ruta_pdf,
      filePath: normalizeStoredPath(row.ruta_pdf),
    }));

  return {
    targetOrderIds,
    confirmedOrderIds,
    paymentRecordIdsToDelete: paymentRecords.map((record) => record.id_registro_pago),
    paymentSignatureIdsToDelete: paymentSignatures.map((signature) =>
      Number(signature.id_firma_documento),
    ),
    noteDocumentIdsToMarkUnsigned: rows
      .filter((row) => row.id_documento)
      .map((row) => Number(row.id_documento)),
    pdfsToRestore,
    userSignatureRouteUpdates,
  };
}

async function backupPdfs(plan) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDirectory = path.resolve(
    projectRootDirectory,
    "data",
    "backups",
    `payment-demo-reset-${timestamp}`,
  );
  const backups = [];

  await fs.mkdir(backupDirectory, { recursive: true });

  for (const pdf of plan.pdfsToRestore) {
    if (!pdf.filePath) {
      continue;
    }

    const destinationPath = path.resolve(
      backupDirectory,
      `Pedido${pdf.orderId}-${path.basename(pdf.filePath)}`,
    );

    await fs.copyFile(pdf.filePath, destinationPath);
    backups.push({
      sourcePath: pdf.filePath,
      destinationPath,
    });
  }

  return { backupDirectory, backups };
}

async function restoreBackups(backups) {
  await Promise.all(
    backups.map((backup) =>
      fs.copyFile(backup.destinationPath, backup.sourcePath),
    ),
  );
}

async function restoreCleanPdfs(plan) {
  await fs.access(cleanPdfPath);

  for (const pdf of plan.pdfsToRestore) {
    if (!pdf.filePath) {
      throw new Error(`La ruta PDF del pedido ${pdf.orderId} no es valida.`);
    }

    await fs.copyFile(cleanPdfPath, pdf.filePath);
  }
}

async function applyReset(prisma, statusIds, plan) {
  await prisma.$transaction(
    async (tx) => {
      await tx.pedidos.updateMany({
        where: { id_pedido: { in: targetOrderIds } },
        data: {
          id_estado_pago: statusIds.pendingPaymentId,
          id_estado_pedido: statusIds.paymentStepId,
        },
      });

      if (plan.paymentRecordIdsToDelete.length > 0) {
        await tx.registro_Pago.deleteMany({
          where: {
            id_registro_pago: { in: plan.paymentRecordIdsToDelete },
          },
        });
      }

      if (plan.paymentSignatureIdsToDelete.length > 0) {
        await tx.firma_Pago.deleteMany({
          where: {
            id_firma_documento: { in: plan.paymentSignatureIdsToDelete },
          },
        });
        await tx.firma_Documento.deleteMany({
          where: {
            id_firma_documento: { in: plan.paymentSignatureIdsToDelete },
          },
        });
      }

      if (plan.noteDocumentIdsToMarkUnsigned.length > 0) {
        await tx.nota_Venta.updateMany({
          where: {
            id_documento: { in: plan.noteDocumentIdsToMarkUnsigned },
          },
          data: { firmado: 0 },
        });
      }

      for (const update of plan.userSignatureRouteUpdates) {
        await tx.usuario.update({
          where: { id_usuario: update.idUsuario },
          data: { ruta_firma: update.nextRutaFirma },
        });
      }
    },
    {
      timeout: 20000,
      maxWait: 10000,
    },
  );
}

function serializePlan(plan, extra = {}) {
  return JSON.stringify(
    {
      ...extra,
      ...plan,
      pdfsToRestore: plan.pdfsToRestore.map((pdf) => ({
        orderId: pdf.orderId,
        idDocumento: pdf.idDocumento,
        storedPath: pdf.storedPath,
        filePath: pdf.filePath,
      })),
      userSignatureRouteUpdates: plan.userSignatureRouteUpdates,
    },
    null,
    2,
  );
}

async function main() {
  const prisma = getPrismaClient();

  try {
    const [
      statusIds,
      rows,
      paymentRecords,
      paymentSignatures,
      userSignatureRouteUpdates,
    ] = await Promise.all([
      getRequiredStatusIds(prisma),
      readOrderRows(prisma),
      readPaymentRecords(prisma),
      readPaymentSignatureIds(prisma),
      readUserSignatureRouteUpdates(prisma),
    ]);
    const plan = buildPlan({
      rows,
      paymentRecords,
      paymentSignatures,
      userSignatureRouteUpdates,
    });
    const cleanPdfHash = await fileHash(cleanPdfPath);

    console.log(serializePlan(plan, {
      mode: applyChanges ? "apply" : "dry-run",
      statusIds,
      cleanPdfSourceOrderId,
      cleanPdfPath,
      cleanPdfHash,
    }));

    if (!applyChanges) {
      console.log("Dry-run completado. Ejecuta con --apply para aplicar cambios.");
      return;
    }

    const backup = await backupPdfs(plan);
    console.log(`Backups creados en ${backup.backupDirectory}`);

    try {
      await applyReset(prisma, statusIds, plan);
      await restoreCleanPdfs(plan);
    } catch (error) {
      await restoreBackups(backup.backups);
      throw error;
    }

    console.log("Reset demo de pagos aplicado correctamente.");
  } finally {
    await disconnectPrismaClient();
  }
}

main().catch((error) => {
  console.error("No fue posible resetear la demo de pagos.", error);
  process.exitCode = 1;
});
