import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import getPrismaClient from "../../../database/prisma.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const serverRootDirectory = path.resolve(currentDirectory, "../../../..");
const projectRootDirectory = path.resolve(serverRootDirectory, "..");
const projectDirectoryName = path.basename(projectRootDirectory);
const signaturesDirectory = path.resolve(projectRootDirectory, "data", "Firmas");
const SIGNATURE_MARK_MARGIN = 72;
const SIGNATURE_MARK_FONT_SIZE = 9;

export const PAYMENT_SIGNATURE_ERROR_MESSAGES = {
  MISSING_SALES_NOTE: "El pedido no tiene una Nota de Venta asociada para firmar.",
  MISSING_USER_SIGNATURE: "El usuario autenticado no tiene firma electronica registrada.",
  UNSUPPORTED_SIGNATURE_TYPE:
    "La firma electronica debe ser XML, CMS o PDF para firmar la Nota de Venta.",
};

const SIGNATURE_ATTACHMENT_MIME_TYPES = new Map([
  [".pdf", "application/pdf"],
  [".xml", "application/xml"],
  [".cms", "application/cms"],
  [".p7s", "application/pkcs7-signature"],
  [".p7m", "application/pkcs7-mime"],
]);

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

export function resolveStoredSignaturePath(storedPath) {
  const resolvedPath = getPathInsideProject(storedPath);

  if (!resolvedPath || !resolvedPath.startsWith(`${signaturesDirectory}${path.sep}`)) {
    return null;
  }

  return resolvedPath;
}

function getSignatureAttachmentMimeType(signaturePath) {
  const extension = path.extname(signaturePath).toLowerCase();
  const mimeType = SIGNATURE_ATTACHMENT_MIME_TYPES.get(extension);

  if (!mimeType) {
    const error = new Error(PAYMENT_SIGNATURE_ERROR_MESSAGES.UNSUPPORTED_SIGNATURE_TYPE);
    error.statusCode = 400;
    throw error;
  }

  return mimeType;
}

async function attachSignatureEvidence(pdfDoc, signaturePath) {
  const signatureBytes = await fs.readFile(signaturePath);
  const fileName = path.basename(signaturePath);
  const now = new Date();

  await pdfDoc.attach(signatureBytes, fileName, {
    mimeType: getSignatureAttachmentMimeType(signaturePath),
    description: "Evidencia de firma electronica asociada a la Nota de Venta.",
    creationDate: now,
    modificationDate: now,
  });

  return fileName;
}

function sanitizePdfText(value) {
  return String(value).replace(/[^\x20-\x7E]/g, "");
}

async function drawSignatureEvidenceMark(pdfDoc, signatureFileName) {
  const pages = pdfDoc.getPages();
  const page = pages.at(-1);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pageSize = page.getSize();
  const lines = [
    "Documento firmado electronicamente",
    `Evidencia adjunta: ${sanitizePdfText(signatureFileName)}`,
  ];

  lines.forEach((line, index) => {
    page.drawText(line, {
      x: SIGNATURE_MARK_MARGIN,
      y: SIGNATURE_MARK_MARGIN + (lines.length - index - 1) * 12,
      size: SIGNATURE_MARK_FONT_SIZE,
      font,
      color: rgb(0.16, 0.16, 0.16),
      maxWidth: pageSize.width - SIGNATURE_MARK_MARGIN * 2,
    });
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
    const signatureFileName = await attachSignatureEvidence(pdfDoc, signaturePath);

    await drawSignatureEvidenceMark(pdfDoc, signatureFileName);

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

    // La firma persistida reemplaza el PDF vigente de la Nota de Venta.
    await fs.writeFile(originalPdfPath, signedPdfBytes);

    return {
      hash: createHash("sha256").update(signedPdfBytes).digest("hex"),
    };
  }

  async getUserSignature(userId) {
    const user = await this.client.usuario.findUnique({
      where: { id_usuario: Number(userId) },
      select: { id_usuario: true, ruta_firma: true },
    });

    if (!user?.ruta_firma) {
      const error = new Error(PAYMENT_SIGNATURE_ERROR_MESSAGES.MISSING_USER_SIGNATURE);
      error.statusCode = 409;
      throw error;
    }

    return user;
  }

  async updateExistingSignatureFile({ salesNoteDocument, signature }) {
    const user = await this.getUserSignature(signature.id_usuario);
    const signedPdf = await this.generateSignedPdf({ salesNoteDocument, user });

    return this.client.firma_Documento.update({
      where: { id_firma_documento: signature.id_firma_documento },
      data: {
        hash_firma: signedPdf.hash,
      },
    });
  }

  async previewSignedPaymentDocument(orderId, userId) {
    const salesNoteDocument = await this.getOrderSalesNote(orderId);

    if (!salesNoteDocument?.id_documento || !salesNoteDocument?.ruta_pdf) {
      const error = new Error(PAYMENT_SIGNATURE_ERROR_MESSAGES.MISSING_SALES_NOTE);
      error.statusCode = 409;
      throw error;
    }

    const user = await this.getUserSignature(userId);

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
      // Repara el PDF firmado sin duplicar registros Firma_Documento/Firma_Pago.
      return this.updateExistingSignatureFile({
        salesNoteDocument,
        signature: existingPaymentSignature,
      });
    }

    const user = await this.getUserSignature(userId);

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
