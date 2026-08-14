import { config } from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import getPrismaClient, { disconnectPrismaClient } from "../src/database/prisma.js";

config();

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const serverRootDirectory = path.resolve(currentDirectory, "..");
const projectRootDirectory = path.resolve(serverRootDirectory, "..");
const projectDirectoryName = path.basename(projectRootDirectory);
const salesNotesDirectory = path.resolve(projectRootDirectory, "data", "NVS");

function buildStoredSalesNotePath(filename) {
  return path.join(projectDirectoryName, "data", "NVS", filename);
}

function getSalesNoteNumber(filename) {
  return path.basename(filename, ".pdf");
}

function getOrderIdFromFilename(filename) {
  const match = /^Pedido(\d+)\.pdf$/i.exec(filename);

  return match ? Number(match[1]) : null;
}

async function getNextDocumentId(prisma) {
  const result = await prisma.documento.aggregate({
    _max: { id_documento: true },
  });

  return Number(result._max.id_documento ?? 0) + 1;
}

async function upsertSalesNoteDocument(prisma, filename) {
  const orderId = getOrderIdFromFilename(filename);

  if (!orderId) {
    return { filename, status: "skipped", reason: "nombre no compatible" };
  }

  const order = await prisma.pedidos.findUnique({
    where: { id_pedido: orderId },
    select: { id_pedido: true },
  });

  if (!order) {
    return { filename, status: "skipped", reason: `pedido ${orderId} no existe` };
  }

  const storedPath = buildStoredSalesNotePath(filename);
  let document = await prisma.documento.findFirst({
    where: { ruta_pdf: storedPath },
  });

  if (!document) {
    document = await prisma.documento.create({
      data: {
        id_documento: await getNextDocumentId(prisma),
        ruta_pdf: storedPath,
        fecha_registro: new Date(),
        id_pedido: orderId,
      },
    });
  } else if (document.id_pedido !== orderId) {
    document = await prisma.documento.update({
      where: { id_documento: document.id_documento },
      data: { id_pedido: orderId },
    });
  }

  await prisma.nota_Venta.upsert({
    where: { id_documento: document.id_documento },
    create: {
      id_documento: document.id_documento,
      numero_nota_venta: getSalesNoteNumber(filename),
    },
    update: {
      numero_nota_venta: getSalesNoteNumber(filename),
    },
  });

  return {
    filename,
    status: "synced",
    id_pedido: orderId,
    id_documento: document.id_documento,
    ruta_pdf: storedPath,
  };
}

async function main() {
  const prisma = getPrismaClient();
  const filenames = (await fs.readdir(salesNotesDirectory))
    .filter((filename) => /^Pedido\d+\.pdf$/i.test(filename))
    .sort((left, right) => Number(getOrderIdFromFilename(left)) - Number(getOrderIdFromFilename(right)));

  const results = [];

  for (const filename of filenames) {
    results.push(await upsertSalesNoteDocument(prisma, filename));
  }

  console.table(results);
}

main()
  .catch((error) => {
    console.error("No fue posible sincronizar las Notas de Venta dummy.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrismaClient();
  });
