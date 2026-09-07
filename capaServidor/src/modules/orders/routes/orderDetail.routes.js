import requireCapability, { PERMISSIONS as P } from "../../../middlewares/requireCapability.js";
import { Router } from "express";

import checkJwt from "../../../middlewares/checkJwt.js";
import OrderDetailController from "../controller/orderDetail.controller.js";

export function createOrderDetailRouter({
  authenticate = checkJwt,
  controller = new OrderDetailController(),
} = {}) {
  const router = Router({ mergeParams: true });

  router.get("/", authenticate, requireCapability(P.READ_ORDERS), controller.getDetailsByOrderId);
  router.get("/:detailId", authenticate, requireCapability(P.READ_ORDERS), controller.getOrderDetail);
  router.post("/", authenticate, (_req,res) => res.status(403).json({message:"Operacion interna; utiliza el flujo de negocio autorizado."}));

  return router;
}

export default createOrderDetailRouter();