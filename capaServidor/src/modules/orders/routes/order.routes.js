import { Router } from "express";
import {
    UPDATE_PAYMENT_STATUS_PERMISSION,
} from "../../../config/status.js";
import checkJwt from "../../../middlewares/checkJwt.js";
import requirePermission from "../../../middlewares/requirePermission.js";
import OrderController from "../controller/orders.controller.js";
import orderDetailRoutes from "./orderDetail.routes.js";
import paymentRecordRoutes from "../../payments/routes/paymentRecord.routes.js";
export function createOrderRouter({
    authenticate = checkJwt,
    authorizePaymentStatusUpdate = requirePermission(
        UPDATE_PAYMENT_STATUS_PERMISSION,
    ),
    controller = new OrderController(),
} = {}) {
    const router = Router();

    router.get("/", authenticate, controller.getOrders);
    router.get("/kanban", authenticate, controller.getOrders);
    router.use("/:orderId/details", orderDetailRoutes);
    router.use("/:orderId/payment-records", paymentRecordRoutes);
    router.get("/:orderId", authenticate, controller.getOrder);
    router.post("/", authenticate, controller.createOrder);
    router.patch(
        "/:orderId/payment-status",
        authenticate,
        // authorizePaymentStatusUpdate,
        controller.updatePaymentStatus,
    );
    router.patch("/:orderId/move", authenticate, controller.updateGeneralStep);

    return router;
}

export default createOrderRouter();
