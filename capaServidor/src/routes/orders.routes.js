import { Router } from "express";
import {
    UPDATE_PAYMENT_STATUS_PERMISSION,
} from "../config/status.js";
import checkJwt from "../middlewares/checkJwt.js";
import requirePermission from "../middlewares/requirePermission.js";
import {
    OrdersServiceError,
    updatePaymentStatus,
} from "../services/ordersMock.service.js";

function invalidRequest(message) {
    return { valid: false, message };
}

function validatePaymentStatusRequest(body) {
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
        return invalidRequest("Los datos del estado de pago no son validos.");
    }

    if (
        typeof body.paymentStatus !== "string" ||
        body.paymentStatus.trim().length === 0
    ) {
        return invalidRequest("El campo paymentStatus es obligatorio.");
    }

    return { valid: true, paymentStatus: body.paymentStatus.trim() };
}

function handleOrdersServiceError(error, res) {
    if (error instanceof OrdersServiceError) {
        return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({ message: "No fue posible procesar el pedido." });
}

export function createUpdatePaymentStatusHandler({
    updateStatus = updatePaymentStatus,
} = {}) {
    return function updatePaymentStatusHandler(req, res) {
        const validatedRequest = validatePaymentStatusRequest(req.body);

        if (!validatedRequest.valid) {
            return res.status(400).json({ message: validatedRequest.message });
        }

        try {
            const order = updateStatus(
                req.params.id,
                validatedRequest.paymentStatus,
            );

            return res.status(200).json({ order });
        } catch (error) {
            return handleOrdersServiceError(error, res);
        }
    };
}

export function createOrdersRouter({
    authenticate = checkJwt,
    authorizePaymentStatusUpdate = requirePermission(
        UPDATE_PAYMENT_STATUS_PERMISSION,
    ),
    updateStatus,
} = {}) {
    const router = Router();

    router.patch(
        "/:id/payment-status",
        authenticate,
        authorizePaymentStatusUpdate,
        createUpdatePaymentStatusHandler({ updateStatus }),
    );

    return router;
}

export default createOrdersRouter();
