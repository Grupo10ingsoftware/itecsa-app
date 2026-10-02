import assert from "node:assert/strict";
import test from "node:test";

import OrderController from "../src/modules/orders/controller/orders.controller.js";
import OrderDetailController from "../src/modules/orders/controller/orderDetail.controller.js";
import { SalesOrderError } from "../src/modules/orders/service/salesOrder.errors.js";

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
  assert.match(res.body.requestId, /^[0-9a-f-]{36}$/);
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

test("un error de dominio de Orders conserva el mensaje aprobado por el servidor", async () => {
  const controller = new OrderController({ service: {
    getPaymentWorkspace: async () => { throw new SalesOrderError("Pedido no encontrado", 404); },
  } });
  const res = response();
  await controller.getPaymentWorkspace({ app: { locals: { errorLogger: { error() {} } } } }, res);
  assert.equal(res.code, 404);
  assert.equal(res.body.code, "ORDER_REQUEST_REJECTED");
  assert.equal(res.body.message, "Pedido no encontrado");
});