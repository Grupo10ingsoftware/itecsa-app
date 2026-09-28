import assert from "node:assert/strict";
import test from "node:test";

import OrderController from "../src/modules/orders/controller/orders.controller.js";
import OrderDetailController from "../src/modules/orders/controller/orderDetail.controller.js";
import { sendOrderOperationError } from "../src/modules/orders/service/salesOrder.errors.js";

function response() {
  return {
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("un fallo interno en Orders no revela el mensaje de la base", async () => {
  const controller = new OrderController({ service: {
    getPaymentWorkspace: async () => { throw new Error("SQL private detail"); },
  } });
  const res = response();
  await controller.getPaymentWorkspace({ requestId: "request-1" }, res);
  assert.equal(res.code, 500);
  assert.doesNotMatch(JSON.stringify(res.body), /SQL private detail/);
  assert.equal(res.body.requestId, "request-1");
  assert.equal(res.body.code, "INTERNAL_ERROR");
});

test("un fallo interno en el detalle no revela el mensaje de la base", async () => {
  const controller = new OrderDetailController();
  controller.service = { getDetailsByOrderId: async () => { throw new Error("SQL private detail"); } };
  const res = response();
  await controller.getDetailsByOrderId({ params: { orderId: "1" } }, res);
  assert.equal(res.code, 500);
  assert.doesNotMatch(JSON.stringify(res.body), /SQL private detail/);
});

test("los errores de negocio conservan estado y mensaje", () => {
  const res = response();
  const error = new Error("Estado no permite la accion");
  error.statusCode = 409;
  sendOrderOperationError(res, error);
  assert.equal(res.code, 409);
  assert.equal(res.body.message, error.message);
});
