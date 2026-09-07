import { roleFromPayload, ROLES } from "../../../../../shared/authorization.js";
import requireCapability, { PERMISSIONS as P } from "../../../middlewares/requireCapability.js";
import requirePin from "../../../middlewares/requirePin.js";
import { Router } from "express";

import checkJwt from "../../../middlewares/checkJwt.js";
import DemoOrdersController from "../controller/demoOrders.controller.js";

export function createDemoOrdersRouter({
  authenticate = checkJwt,
  controller = new DemoOrdersController(),
  validatePin = requirePin,
} = {}) {
  const router = Router();
  router.use(authenticate, (req,res,next) => roleFromPayload(req.auth?.payload) === ROLES.SOPORTE
    ? next() : res.status(403).json({message:"El demo es exclusivo de testing tecnico."}));

  // Fuente temporal de pedidos compartidos por Kanban y calendario.
  // Permite probar sincronizacion de fechas y etapas antes de persistir en MySQL/Prisma.
  router.get("/", requireCapability(P.READ_ORDERS), controller.getOrders);
  router.get("/payment-orders", requireCapability(P.READ_PAYMENTS), controller.getPaymentOrders);
  router.get("/payment-status", requireCapability(P.READ_PAYMENTS), controller.getPaymentStatuses);
  router.get("/announcements", requireCapability(P.READ_MESSAGES), controller.getAnnouncements);
  router.get("/sales-notes/available", requireCapability(P.READ_SALES_NOTES), controller.getAvailableSalesNotes);
  router.patch("/:orderId/delivery-date", requireCapability(P.UPDATE_DELIVERY_DATE), validatePin, controller.updateDeliveryDate);
  router.patch("/:orderId/payment-status", requireCapability(P.UPDATE_PAYMENT_STATUS), validatePin, controller.updatePaymentStatus);
  router.patch("/:orderId/request-payment-deconfirmation", requireCapability(P.REVISE_PAYMENT_STATUS), validatePin, controller.requestPaymentDeconfirmation);
  router.patch("/:orderId/approve-payment-deconfirmation", requireCapability(P.REVIEW_ORDERS), validatePin, controller.approvePaymentDeconfirmation);
  router.patch("/:orderId/move", requireCapability(P.MOVE_ORDERS), validatePin, controller.updateGeneralStep);

  return router;
}

export default createDemoOrdersRouter();
