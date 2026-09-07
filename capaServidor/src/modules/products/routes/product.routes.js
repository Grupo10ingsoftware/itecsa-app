import requireCapability, { PERMISSIONS as P } from "../../../middlewares/requireCapability.js";
import { Router } from "express";

import checkJwt from "../../../middlewares/checkJwt.js";
import ProductTypeController from "../controller/product.controller.js";

export function createProductTypeRouter({
  authenticate = checkJwt,
  controller = new ProductTypeController(),
} = {}) {
  const router = Router();

  router.get("/", authenticate, requireCapability(P.READ_ORDERS), controller.getProductTypes);
  router.get("/name/:nombreProducto", authenticate, requireCapability(P.READ_ORDERS), controller.getProductTypeByName);
  router.get("/:productTypeId", authenticate, requireCapability(P.READ_ORDERS), controller.getProductTypeById);
  router.post("/", authenticate, (_req,res) => res.status(403).json({message:"Operacion interna; utiliza el flujo de negocio autorizado."}));

  return router;
}

export default createProductTypeRouter();