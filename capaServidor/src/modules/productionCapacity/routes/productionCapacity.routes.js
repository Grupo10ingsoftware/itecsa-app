import { Router } from "express";
import checkJwt from "../../../middlewares/checkJwt.js";
import requireAdministratorRole from "../../../middlewares/requireAdministratorRole.js";
import ProductionCapacityController from "../controller/productionCapacity.controller.js";

export function createProductionCapacityRouter({ authenticate = checkJwt, authorize = requireAdministratorRole, controller = new ProductionCapacityController() } = {}) {
  const router = Router();
  router.get("/", authenticate, controller.list);
  router.patch("/", authenticate, authorize, controller.update);
  return router;
}
export default createProductionCapacityRouter();
