import { safeLogger } from "../../../shared/safeLogger.js";

export function sendPaymentError(res, error, logger = safeLogger, context = {}) {
  const statusCode = error?.statusCode;
  if (Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 500) {
    return res.status(statusCode).json({
      code: error?.code ?? "PAYMENT_REQUEST_REJECTED",
      message: error.message || "No fue posible completar la solicitud de pago.",
      requestId: context.requestId,
    });
  }

  const databaseCode = typeof error?.code === "string" && /^P\d{4}$/.test(error.code)
    ? error.code
    : null;
  logger.error("payments.unexpected_error", {
    requestId: context.requestId,
    actorId: context.actorId,
    code: databaseCode ?? "UNEXPECTED_ERROR",
    outcome: "error",
  });
  return res.status(500).json({
    code: "INTERNAL_ERROR",
    message: "No fue posible completar la operacion de pago.",
    requestId: context.requestId,
  });
}
