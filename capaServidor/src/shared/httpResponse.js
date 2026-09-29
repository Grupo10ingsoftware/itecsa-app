import { safeLogger } from "./safeLogger.js";

export function sendControllerError(req, res, error, fallbackMessage = "No fue posible completar la solicitud.") {
    const status = Number(error?.status ?? error?.statusCode);
    if (Number.isInteger(status) && status >= 400 && status < 500) {
        return res.status(status).json({
            code: error?.code ?? "REQUEST_REJECTED",
            message: error?.message || fallbackMessage,
            requestId: req?.requestId,
        });
    }

    safeLogger.error("controller.unexpected_error", {
        requestId: req?.requestId,
        actorId: req?.currentUser?.idUsuario,
        code: typeof error?.code === "string" ? error.code : "UNEXPECTED_ERROR",
        outcome: "error",
    });
    return res.status(500).json({
        code: "INTERNAL_ERROR",
        message: fallbackMessage,
        requestId: req?.requestId,
    });
}
