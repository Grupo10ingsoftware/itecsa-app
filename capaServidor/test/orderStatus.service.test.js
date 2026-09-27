import assert from "node:assert/strict";
import test from "node:test";

import OrderStatusService from "../src/modules/orders/service/orderStatus.service.js";
import OrderStatusController from "../src/modules/orders/controller/orderStatus.controller.js";

test("la lectura de estados propaga errores del repositorio al controlador", async () => {
  const databaseError = new Error("database unavailable");
  const service = new OrderStatusService({ repo: {
    getAll: async () => { throw databaseError; },
  } });

  await assert.rejects(service.getAll(), (error) => error === databaseError);
});

test("el controlador responde 500 si falla la lectura de estados", async () => {
  const controller = new OrderStatusController();
  controller.service = new OrderStatusService({ repo: {
    getAll: async () => { throw new Error("database unavailable"); },
  } });
  const res = {
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };

  await controller.getOrderStatuses({}, res);
  assert.equal(res.code, 500);
  assert.equal(res.body.message, "Error al obtener estados");
});
