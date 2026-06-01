import { Router } from "express";
import checkJwt from "../middlewares/checkJwt.js";
import {
    OrdersServiceError,
    getKanbanBoard,
    moveOrder,
} from "../services/ordersMock.service.js";

function invalidRequest(message) {
    return { valid: false, message };
}

function validateMoveRequest(body) {
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
        return invalidRequest("Los datos del movimiento no son validos.");
    }

    if (
        typeof body.targetStatus !== "string" ||
        body.targetStatus.trim().length === 0
    ) {
        return invalidRequest("El campo targetStatus es obligatorio.");
    }

    return { valid: true, targetStatus: body.targetStatus.trim() };
}

function handleOrdersServiceError(error, res) {
    if (error instanceof OrdersServiceError) {
        return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({ message: "No fue posible procesar el Kanban." });
}

export function createGetKanbanBoardHandler({
    getBoard = getKanbanBoard,
} = {}) {
    return function getKanbanBoardHandler(req, res) {
        return res.status(200).json(getBoard());
    };
}

export function createMoveOrderHandler({ move = moveOrder } = {}) {
    return function moveOrderHandler(req, res) {
        const validatedRequest = validateMoveRequest(req.body);

        if (!validatedRequest.valid) {
            return res.status(400).json({ message: validatedRequest.message });
        }

        try {
            const order = move(req.params.id, validatedRequest.targetStatus);

            return res.status(200).json({ order });
        } catch (error) {
            return handleOrdersServiceError(error, res);
        }
    };
}

export function createKanbanRouter({
    authenticate = checkJwt,
    getBoard,
    move,
} = {}) {
    const router = Router();

    router.get("/", authenticate, createGetKanbanBoardHandler({ getBoard }));
    router.patch(
        "/orders/:id/move",
        authenticate,
        createMoveOrderHandler({ move }),
    );

    return router;
}

export default createKanbanRouter();
