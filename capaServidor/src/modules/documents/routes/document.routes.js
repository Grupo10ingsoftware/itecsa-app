import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const serverRootDirectory = path.resolve(currentDirectory, "../../../..");
const projectRootDirectory = path.resolve(serverRootDirectory, "..");
const salesNotesDirectory = path.resolve(projectRootDirectory, "data", "NVS");
const signedSalesNotesDirectory = path.resolve(salesNotesDirectory, "Firmadas");

function isPdfFilename(filename) {
  return typeof filename === "string" && /^[^\\/]+\.pdf$/i.test(filename);
}

export function resolveSalesNotePdfPath(filename) {
  return resolvePdfPathInsideDirectory(salesNotesDirectory, filename);
}

export function resolveSignedSalesNotePdfPath(filename) {
  return resolvePdfPathInsideDirectory(signedSalesNotesDirectory, filename);
}

function resolvePdfPathInsideDirectory(directory, filename) {
  if (!isPdfFilename(filename)) {
    return null;
  }

  const safeFilename = path.basename(filename);
  const resolvedPath = path.resolve(directory, safeFilename);

  if (!resolvedPath.startsWith(`${directory}${path.sep}`)) {
    return null;
  }

  return resolvedPath;
}

function sendPdfFile(res, pdfPath) {
  if (!fs.existsSync(pdfPath)) {
    return res.status(404).json({
      message: "Nota de Venta no encontrada.",
    });
  }

  return res.sendFile(pdfPath, {
    headers: {
      "Content-Type": "application/pdf",
    },
  });
}

export function createDocumentRouter() {
  const router = Router();

  router.get("/nvs/:filename", (req, res) => {
    const pdfPath = resolveSalesNotePdfPath(req.params.filename);

    if (!pdfPath) {
      return res.status(400).json({
        message: "El archivo solicitado no es una Nota de Venta valida.",
      });
    }

    return sendPdfFile(res, pdfPath);
  });

  router.get("/nvs/firmadas/:filename", (req, res) => {
    const pdfPath = resolveSignedSalesNotePdfPath(req.params.filename);

    if (!pdfPath) {
      return res.status(400).json({
        message: "El archivo solicitado no es una Nota de Venta valida.",
      });
    }

    return sendPdfFile(res, pdfPath);
  });

  return router;
}

export default createDocumentRouter();
