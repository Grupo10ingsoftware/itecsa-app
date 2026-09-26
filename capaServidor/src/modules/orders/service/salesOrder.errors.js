import { randomUUID } from "node:crypto";

export class SalesOrderError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "SalesOrderError";
    this.statusCode = statusCode;
  }
}

export function sendOrderError(res, error, logger = console) {
  if (error instanceof SalesOrderError) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  const publicMessages = {
    400: "La solicitud de pedido no es valida.",
    403: "No tienes acceso a esta operacion.",
    404: "Recurso de pedido no encontrado.",
    409: "El pedido presenta un conflicto con su estado actual.",
  };
  if (publicMessages[error?.statusCode]) {
    return res.status(error.statusCode).json({ message: publicMessages[error.statusCode] });
  }
  const reference = randomUUID();
  // No registrar cuerpos, SQL, mensajes de dependencias ni datos del cliente.
  const databaseCode = typeof error?.code === "string" && /^P\d{4}$/.test(error.code)
    ? error.code
    : null;
  logger.error({ event: "orders.unexpected_error", reference, ...(databaseCode ? { databaseCode } : {}) });
  return res.status(500).json({ message: "No fue posible completar la operacion del pedido.", reference });
}

export function sendOrderOperationError(res, error, logger = console) {
  const statusCode = error?.statusCode;
  if (Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 500) {
    return res.status(statusCode).json({ message: error.message || "No fue posible completar la operacion." });
  }
  return sendOrderError(res, error, logger);
}
