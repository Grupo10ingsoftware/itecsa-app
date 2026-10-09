import assert from "node:assert/strict";
import test from "node:test";

import PaymentRecordController from "../src/modules/payments/controller/paymentRecord.controller.js";
import PaymentStatusController from "../src/modules/payments/controller/paymentStatus.controller.js";

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
      assert.match(res.body.requestId, /^[0-9a-f-]{36}$/);
      assert.equal(res.body.code, "INTERNAL_ERROR");
      assert.doesNotMatch(JSON.stringify(res.body), /SQL private|P2021/);
    }
  } finally {
    console.error = originalError;
  }
});
