import { Router } from "express";

import checkJwt from "../../../middlewares/checkJwt.js";
import OrderDetailController from "../controller/orderDetail.controller.js";

export function createOrderDetailRouter({
  authenticate = checkJwt,
  controller = new OrderDetailController(),
} = {}) {
  const router = Router({ mergeParams: true });

  router.get("/", authenticate, controller.getDetailsByOrderId);
  router.get("/:detailId", authenticate, controller.getOrderDetail);
  router.post("/", authenticate, controller.postOrderDetail);
  router.post(
    "/:detailId/subprocesses/:subprocessId/complete",
    authenticate,
    controller.completeSubprocess,
  );

  return router;
}

export default createOrderDetailRouter();
