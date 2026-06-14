import fs from "node:fs";

import DocumentRepo from "../repo/document.repo.js";

export class DocumentController {
  constructor(documentRepo = new DocumentRepo()) {
    this.documentRepo = documentRepo;
  }

  getSalesNotePdf = (req, res) => {
    const pdfPath = this.documentRepo.resolveSalesNotePdfPath(req.params.filename);

    if (!pdfPath) {
      return res.status(400).json({
        message: "El archivo solicitado no es una Nota de Venta valida.",
      });
    }

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
  };
}

export default DocumentController;
