import { Router } from "express";
import checkJwt from "../../../middlewares/checkJwt.js";
import requireCapability, { PERMISSIONS as P } from "../../../middlewares/requireCapability.js";
import ProductionCapacityController from "../controller/productionCapacity.controller.js";

export function createProductionCapacityRouter({ authenticate = checkJwt, authorize = requireCapability(P.MANAGE_CAPACITY), controller = new ProductionCapacityController() } = {}) {
  const router = Router();
  router.get("/", authenticate, requireCapability(P.READ_CAPACITY), controller.list);
  router.patch("/", authenticate, authorize, controller.update);
  return router;
}
export default createProductionCapacityRouter();
