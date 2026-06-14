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
    const fallbackController = new OrderController();
    const routeController = {
        getOrders: controller.getOrders ?? fallbackController.getOrders,
        getOrder: controller.getOrder ?? fallbackController.getOrder,
        previewPaymentSignature:
            controller.previewPaymentSignature ??
            fallbackController.previewPaymentSignature,
        getPaymentSignatureEvidence:
            controller.getPaymentSignatureEvidence ??
            fallbackController.getPaymentSignatureEvidence,
        createOrder: controller.createOrder ?? fallbackController.createOrder,
        updatePaymentStatus:
            controller.updatePaymentStatus ?? fallbackController.updatePaymentStatus,
        updateGeneralStep:
            controller.updateGeneralStep ?? fallbackController.updateGeneralStep,
    };

    router.get("/", authenticate, routeController.getOrders);
    router.get("/kanban", authenticate, routeController.getOrders);
    router.use("/:orderId/details", orderDetailRoutes);
    router.use("/:orderId/payment-records", paymentRecordRoutes);
    router.get(
        "/:orderId/payment-signature-preview",
        authenticate,
        authorizePaymentStatusUpdate,
        routeController.previewPaymentSignature,
    );
    router.get(
        "/:orderId/payment-signature-evidence",
        authenticate,
        routeController.getPaymentSignatureEvidence,
    );
    router.get("/:orderId", authenticate, routeController.getOrder);
    router.post("/", authenticate, routeController.createOrder);
    router.patch(
        "/:orderId/payment-status",
        authenticate,
        authorizePaymentStatusUpdate,
        routeController.updatePaymentStatus,
    );
    router.patch("/:orderId/move", authenticate, routeController.updateGeneralStep);

    return router;
}

export default createOrderRouter();
