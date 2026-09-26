import { randomUUID } from "node:crypto";

export function sendPaymentError(res, error, logger = console) {
  const statusCode = error?.statusCode;
  if (Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 500) {
    return res.status(statusCode).json({
      message: error.message || "No fue posible completar la solicitud de pago.",
    });
  }

  const reference = randomUUID();
  const databaseCode = typeof error?.code === "string" && /^P\d{4}$/.test(error.code)
    ? error.code
    : null;
  logger.error({
    event: "payments.unexpected_error",
    reference,
    ...(databaseCode ? { databaseCode } : {}),
  });
  return res.status(500).json({
    message: "No fue posible completar la operacion de pago.",
    reference,
  });
}
