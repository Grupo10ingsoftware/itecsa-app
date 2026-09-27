import assert from "node:assert/strict";
import test from "node:test";

import PaymentRecordController from "../src/modules/payments/controller/paymentRecord.controller.js";
import PaymentStatusController from "../src/modules/payments/controller/paymentStatus.controller.js";
import { sendPaymentError } from "../src/modules/payments/controller/paymentError.js";

function response() {
  return {
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("los cinco endpoints de Payments ocultan errores internos", async () => {
  const recordController = new PaymentRecordController({ service: {} });
  const statusController = new PaymentStatusController();
  const privateError = Object.assign(new Error("SQL private customer detail"), { code: "P2021" });
  const scenarios = [
    [recordController, "getPaymentRecord", "getPaymentRecord"],
    [recordController, "getPaymentRecordsByOrderId", "getPaymentRecordsByOrderId"],
    [recordController, "getConfirmationDetails", "getConfirmationDetails"],
    [statusController, "getPaymentStatus", "getPaymentStatus"],
    [statusController, "getPaymentStatuses", "getPaymentStatuses"],
  ];
  const originalError = console.error;
  console.error = () => {};
  try {
    for (const [controller, handler, serviceMethod] of scenarios) {
      controller.service[serviceMethod] = async () => { throw privateError; };
      const res = response();
      await controller[handler]({ requestId: "payment-request", params: { orderId: "1", paymentRecordId: "2", id: "2" } }, res);
      assert.equal(res.code, 500, handler);
      assert.equal(res.body.requestId, "payment-request");
      assert.equal(res.body.code, "INTERNAL_ERROR");
      assert.doesNotMatch(JSON.stringify(res.body), /SQL private|P2021/);
    }
  } finally {
    console.error = originalError;
  }
});

test("Payments conserva los errores esperados y registra solo metadatos seguros", () => {
  const expected = Object.assign(new Error("Pedido no encontrado"), { statusCode: 404 });
  const missing = response();
  sendPaymentError(missing, expected);
  assert.equal(missing.code, 404);
  assert.equal(missing.body.message, expected.message);
  assert.equal(missing.body.code, "PAYMENT_REQUEST_REJECTED");

  const events = [];
  const failed = response();
  sendPaymentError(failed, Object.assign(new Error("SQL private detail"), { code: "P2021" }), {
    error: (event, metadata) => events.push({ event, ...metadata }),
  }, { requestId: "payment-request" });
  assert.equal(failed.code, 500);
  assert.deepEqual(events, [{ event: "payments.unexpected_error", requestId: "payment-request", actorId: undefined, code: "P2021", outcome: "error" }]);
});
