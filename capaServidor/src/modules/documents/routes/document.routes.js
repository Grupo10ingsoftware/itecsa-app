import { Router } from "express";

import DocumentController from "../controller/document.controller.js";

export function createDocumentRouter(documentController = new DocumentController()) {
  const router = Router();

  router.get("/nvs/:filename", documentController.getSalesNotePdf);

  return router;
}

export default createDocumentRouter();
