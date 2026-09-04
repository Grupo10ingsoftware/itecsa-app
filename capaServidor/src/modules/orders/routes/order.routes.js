import { Router } from "express";
import {
    UPDATE_PAYMENT_STATUS_PERMISSION,
} from "../../../config/status.js";
import checkJwt from "../../../middlewares/checkJwt.js";
import requirePermission from "../../../middlewares/requirePermission.js";
import requirePin from "../../../middlewares/requirePin.js";
import OrderController from "../controller/orders.controller.js";
import orderDetailRoutes from "./orderDetail.routes.js";
import paymentRecordRoutes from "../../payments/routes/paymentRecord.routes.js";

export function createOrderRouter({
    authenticate = checkJwt,
    authorizePaymentStatusUpdate = requirePermission(
        UPDATE_PAYMENT_STATUS_PERMISSION,
    ),
    controller = new OrderController(),
    validatePin = requirePin,
} = {}) {
    const router = Router();
    const fallbackController = new OrderController();
    const routeController = {
        getOrders: controller.getOrders ?? fallbackController.getOrders,
        getOrder: controller.getOrder ?? fallbackController.getOrder,
        getSalesNote: controller.getSalesNote ?? fallbackController.getSalesNote,
        createOrder: controller.createOrder ?? fallbackController.createOrder,
        updatePaymentStatus:
            controller.updatePaymentStatus ?? fallbackController.updatePaymentStatus,
        updateGeneralStep:
            controller.updateGeneralStep ?? fallbackController.updateGeneralStep,
        updateDeliveryDate:
            controller.updateDeliveryDate ?? fallbackController.updateDeliveryDate,
        completeSubprocess:
            controller.completeSubprocess ?? fallbackController.completeSubprocess,
    };

    router.get("/", authenticate, routeController.getOrders);
    router.get("/kanban", authenticate, routeController.getOrders);
    router.get("/sales-notes/:numeroNota", authenticate, routeController.getSalesNote);
    router.use("/:orderId/details", orderDetailRoutes);
    router.use("/:orderId/payment-records", paymentRecordRoutes);
    router.get("/:orderId", authenticate, routeController.getOrder);
    router.post("/", authenticate, routeController.createOrder);
    router.patch(
        "/:orderId/payment-status",
        authenticate,
        authorizePaymentStatusUpdate,
        validatePin,
        routeController.updatePaymentStatus,
    );
    router.patch("/:orderId/move", authenticate, validatePin, routeController.updateGeneralStep);
    router.patch("/:orderId/delivery-date", authenticate, validatePin, routeController.updateDeliveryDate);
    router.patch(
        "/:orderId/details/:detailId/subprocesses/:subprocessId/complete",
        authenticate,
        validatePin,
        routeController.completeSubprocess,
    );

    return router;
}

export default createOrderRouter();
