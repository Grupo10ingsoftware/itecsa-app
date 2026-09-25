import { Router } from "express";

import checkJwt from "../../../middlewares/checkJwt.js";
import requireCapability, { PERMISSIONS as P } from "../../../middlewares/requireCapability.js";
import ProductionLoadController from "../controller/productionLoad.controller.js";

export function createProductionLoadRouter({
  authenticate = checkJwt,
  controller = new ProductionLoadController(),
} = {}) {
  const router = Router();

  router.get("/today", authenticate, requireCapability(P.READ_CAPACITY), controller.getToday);
  router.patch(
    "/today",
    authenticate,
    requireCapability(P.MANAGE_PRODUCTION_LOAD, P.MANAGE_CAPACITY),
    controller.saveToday,
  );

  return router;
}

export default createProductionLoadRouter();
