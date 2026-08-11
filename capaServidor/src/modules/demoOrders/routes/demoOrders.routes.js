import { Router } from "express";

import checkJwt from "../../../middlewares/checkJwt.js";
import DemoOrdersController from "../controller/demoOrders.controller.js";

export function createDemoOrdersRouter({
  authenticate = checkJwt,
  controller = new DemoOrdersController(),
} = {}) {
  const router = Router();

  // Fuente temporal de pedidos compartidos por Kanban y calendario.
  // Permite probar sincronizacion de fechas y etapas antes de persistir en MySQL/Prisma.
  router.get("/", authenticate, controller.getOrders);
  router.get("/payment-orders", authenticate, controller.getPaymentOrders);
  router.get("/payment-status", authenticate, controller.getPaymentStatuses);
  router.get("/sales-notes/available", authenticate, controller.getAvailableSalesNotes);
  router.patch("/:orderId/delivery-date", authenticate, controller.updateDeliveryDate);
  router.patch("/:orderId/payment-status", authenticate, controller.updatePaymentStatus);
  router.patch("/:orderId/move", authenticate, controller.updateGeneralStep);

  return router;
}

export default createDemoOrdersRouter();
