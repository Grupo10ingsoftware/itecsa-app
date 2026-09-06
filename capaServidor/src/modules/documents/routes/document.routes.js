import checkJwt from "../../../middlewares/checkJwt.js";
import requireCapability, { PERMISSIONS as P } from "../../../middlewares/requireCapability.js";
import { Router } from "express";

import DocumentController from "../controller/document.controller.js";

export function createDocumentRouter(documentController = new DocumentController(), authenticate = checkJwt) {
  const router = Router();

  router.get("/nvs/:filename", authenticate, requireCapability(P.READ_ORDERS), documentController.getSalesNotePdf);

  return router;
}

export default createDocumentRouter();
