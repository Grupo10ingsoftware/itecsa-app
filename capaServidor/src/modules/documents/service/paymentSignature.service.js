import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";

import getPrismaClient from "../../../database/prisma.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const serverRootDirectory = path.resolve(currentDirectory, "../../../..");
const projectRootDirectory = path.resolve(serverRootDirectory, "..");
const projectDirectoryName = path.basename(projectRootDirectory);
const MAX_SIGNATURE_WIDTH = 150;
const MAX_SIGNATURE_HEIGHT = 55;

export const PAYMENT_SIGNATURE_ERROR_MESSAGES = {
  MISSING_SALES_NOTE: "El pedido no tiene una Nota de Venta asociada para firmar.",
  MISSING_USER_SIGNATURE: "El usuario autenticado no tiene firma electronica registrada.",
  UNSUPPORTED_SIGNATURE_TYPE:
    "La firma electronica debe ser PNG, JPG o JPEG para firmar la Nota de Venta.",
};

function getPathInsideProject(storedPath) {
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

export function resolveStoredProjectPath(storedPath) {
  return getPathInsideProject(storedPath);
}

async function embedSignatureImage(pdfDoc, signaturePath) {
  const signatureBytes = await fs.readFile(signaturePath);
  const extension = path.extname(signaturePath).toLowerCase();

  if (extension === ".png") {
    return pdfDoc.embedPng(signatureBytes);
  }

  if (extension === ".jpg" || extension === ".jpeg") {
    return pdfDoc.embedJpg(signatureBytes);
  }

  const error = new Error(PAYMENT_SIGNATURE_ERROR_MESSAGES.UNSUPPORTED_SIGNATURE_TYPE);
  error.statusCode = 400;
  throw error;
}

function drawSignatureOnLastPage(pdfDoc, signatureImage) {
  const pages = pdfDoc.getPages();
  const page = pages.at(-1);
  const pageSize = page.getSize();
  const scale = Math.min(
    MAX_SIGNATURE_WIDTH / signatureImage.width,
    MAX_SIGNATURE_HEIGHT / signatureImage.height,
    1,
  );
  const width = signatureImage.width * scale;
  const height = signatureImage.height * scale;

  page.drawImage(signatureImage, {
    x: pageSize.width - width - 72,
    y: 72,
    width,
    height,
  });
}

async function nextId(client, modelName, fieldName) {
  const result = await client[modelName].aggregate({
    _max: { [fieldName]: true },
  });

  return Number(result._max[fieldName] ?? 0) + 1;
}

class PaymentSignatureService {
  constructor({ prisma } = {}) {
    this.prisma = prisma;
  }

  get client() {
    if (!this.prisma) {
      this.prisma = getPrismaClient();
    }

    return this.prisma;
  }

  async getOrderSalesNote(orderId) {
    const order = await this.client.pedidos.findUnique({
      where: { id_pedido: Number(orderId) },
      include: {
        Documento: {
          include: {
            Nota_Venta: true,
            Firma_Documento: {
              include: { Firma_Pago: true },
            },
          },
        },
      },
    });

    return (
      order?.Documento?.find((document) => document.Nota_Venta) ??
      order?.Documento?.find((document) => document.ruta_pdf) ??
      null
    );
  }

  async buildSignedPdfBytes({ salesNoteDocument, user }) {
    const originalPdfPath = getPathInsideProject(salesNoteDocument.ruta_pdf);
    const signaturePath = getPathInsideProject(user.ruta_firma);

    if (!originalPdfPath) {
      const error = new Error(PAYMENT_SIGNATURE_ERROR_MESSAGES.MISSING_SALES_NOTE);
      error.statusCode = 409;
      throw error;
    }

    if (!signaturePath) {
      const error = new Error(PAYMENT_SIGNATURE_ERROR_MESSAGES.MISSING_USER_SIGNATURE);
      error.statusCode = 409;
      throw error;
    }

    const originalPdfBytes = await fs.readFile(originalPdfPath);
    const pdfDoc = await PDFDocument.load(originalPdfBytes);
    const signatureImage = await embedSignatureImage(pdfDoc, signaturePath);

    drawSignatureOnLastPage(pdfDoc, signatureImage);

    return pdfDoc.save();
  }

  async generateSignedPdf({ salesNoteDocument, user }) {
    const signedPdfBytes = await this.buildSignedPdfBytes({
      salesNoteDocument,
      user,
    });
    const originalPdfPath = getPathInsideProject(salesNoteDocument.ruta_pdf);

    if (!originalPdfPath) {
      const error = new Error(PAYMENT_SIGNATURE_ERROR_MESSAGES.MISSING_SALES_NOTE);
      error.statusCode = 409;
      throw error;
    }

    await fs.writeFile(originalPdfPath, signedPdfBytes);

    return {
      hash: createHash("sha256").update(signedPdfBytes).digest("hex"),
    };
  }

  async previewSignedPaymentDocument(orderId, userId) {
    const salesNoteDocument = await this.getOrderSalesNote(orderId);

    if (!salesNoteDocument?.id_documento || !salesNoteDocument?.ruta_pdf) {
      const error = new Error(PAYMENT_SIGNATURE_ERROR_MESSAGES.MISSING_SALES_NOTE);
      error.statusCode = 409;
      throw error;
    }

    const user = await this.client.usuario.findUnique({
      where: { id_usuario: Number(userId) },
      select: { id_usuario: true, ruta_firma: true },
    });

    if (!user?.ruta_firma) {
      const error = new Error(PAYMENT_SIGNATURE_ERROR_MESSAGES.MISSING_USER_SIGNATURE);
      error.statusCode = 409;
      throw error;
    }

    return this.buildSignedPdfBytes({ salesNoteDocument, user });
  }

  async signPaymentDocument(orderId, userId) {
    const salesNoteDocument = await this.getOrderSalesNote(orderId);

    if (!salesNoteDocument?.id_documento || !salesNoteDocument?.ruta_pdf) {
      const error = new Error(PAYMENT_SIGNATURE_ERROR_MESSAGES.MISSING_SALES_NOTE);
      error.statusCode = 409;
      throw error;
    }

    const existingPaymentSignature = salesNoteDocument.Firma_Documento?.find(
      (signature) => signature.Firma_Pago,
    );

    if (existingPaymentSignature) {
      return existingPaymentSignature;
    }

    const user = await this.client.usuario.findUnique({
      where: { id_usuario: Number(userId) },
      select: { id_usuario: true, ruta_firma: true },
    });

    if (!user?.ruta_firma) {
      const error = new Error(PAYMENT_SIGNATURE_ERROR_MESSAGES.MISSING_USER_SIGNATURE);
      error.statusCode = 409;
      throw error;
    }

    const signedPdf = await this.generateSignedPdf({ salesNoteDocument, user });
    const signatureId = await nextId(
      this.client,
      "firma_Documento",
      "id_firma_documento",
    );

    const signature = await this.client.firma_Documento.create({
      data: {
        id_firma_documento: signatureId,
        hash_firma: signedPdf.hash,
        fecha_firma: new Date(),
        id_usuario: Number(userId),
        id_documento: salesNoteDocument.id_documento,
      },
    });

    await this.client.firma_Pago.create({
      data: { id_firma_documento: signatureId },
    });

    await this.client.nota_Venta.update({
      where: { id_documento: salesNoteDocument.id_documento },
      data: { firmado: 1 },
    });

    return signature;
  }
}

export default PaymentSignatureService;
