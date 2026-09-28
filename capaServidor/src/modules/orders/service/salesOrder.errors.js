import { safeLogger } from "../../../shared/safeLogger.js";

export class SalesOrderError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "SalesOrderError";
    this.statusCode = statusCode;
  }
}

export function sendOrderError(res, error, logger = safeLogger, context = {}) {
  if (error instanceof SalesOrderError) {
    return res.status(error.statusCode).json({ code: "ORDER_REQUEST_REJECTED", message: error.message, requestId: context.requestId });
  }
  const publicMessages = {
    400: "La solicitud de pedido no es valida.",
    403: "No tienes acceso a esta operacion.",
    404: "Recurso de pedido no encontrado.",
    409: "El pedido presenta un conflicto con su estado actual.",
  };
  if (publicMessages[error?.statusCode]) {
    return res.status(error.statusCode).json({ code: "ORDER_REQUEST_REJECTED", message: publicMessages[error.statusCode], requestId: context.requestId });
  }
  // No registrar cuerpos, SQL, mensajes de dependencias ni datos del cliente.
  const databaseCode = typeof error?.code === "string" && /^P\d{4}$/.test(error.code)
    ? error.code
    : null;
  logger.error("orders.unexpected_error", {
    requestId: context.requestId,
    actorId: context.actorId,
    code: databaseCode ?? "UNEXPECTED_ERROR",
    outcome: "error",
  });
  return res.status(500).json({ code: "INTERNAL_ERROR", message: "No fue posible completar la operacion del pedido.", requestId: context.requestId });
}

export function sendOrderOperationError(res, error, logger = safeLogger, context = {}) {
  const statusCode = error?.statusCode;
  if (Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 500) {
    return res.status(statusCode).json({ code: error?.code ?? "ORDER_REQUEST_REJECTED", message: error.message || "No fue posible completar la operacion.", requestId: context.requestId });
  }
  return sendOrderError(res, error, logger, context);
}
