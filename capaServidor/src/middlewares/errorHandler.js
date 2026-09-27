import { normalizeErrorStatus } from "../shared/appError.js";
import { safeLogger } from "../shared/safeLogger.js";

export function notFoundHandler(req, res) {
    return res.status(404).json({
        code: "NOT_FOUND",
        message: "Recurso no encontrado.",
        requestId: req.requestId,
    });
}

export function errorHandler(error, req, res, _next) {
    const status = normalizeErrorStatus(error);
    const exposed = status < 500 && error?.expose !== false;

    if (status >= 500) {
        safeLogger.error("http.unexpected_error", {
            requestId: req.requestId,
            actorId: req.currentUser?.idUsuario,
            code: typeof error?.code === "string" ? error.code : "UNEXPECTED_ERROR",
            outcome: "error",
        });
    }

    return res.status(status).json({
        code: exposed && error?.code ? error.code : "INTERNAL_ERROR",
        message: exposed
            ? error.message
            : "No fue posible completar la solicitud.",
        requestId: req.requestId,
        ...(exposed && error?.details ? error.details : {}),
    });
}
