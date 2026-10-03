import assert from "node:assert/strict";
import { test } from "node:test";

import OrderController from "../src/modules/orders/controller/orders.controller.js";
import { SalesOrderError } from "../src/modules/orders/service/salesOrder.errors.js";

function responseRecorder() {
  return {
    body: undefined,
    statusCode: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function request() {
  return {
    params: { numeroNota: "NV-2026-24226" },
    currentUser: { idUsuario: 7 },
  };
}

test("la auditoria conserva la respuesta disponible y recibe el actor autenticado", async () => {
  const observations = [];
  const preview = {
    numeroNota: "24226",
    cliente: { nombre: "Cliente", rut: "76.123.456-7" },
    items: [],
  };
  const controller = new OrderController({
    service: { async getSalesNoteByNumber() { return preview; } },
    salesNoteMonitor: {
      async observeLookup(data) { observations.push(data); },
    },
  });
  const res = responseRecorder();

  await controller.getSalesNote(request(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body, preview);
  assert.equal(observations.length, 1);
  assert.equal(observations[0].actorUserId, 7);
  assert.equal(observations[0].outcome, "AVAILABLE");
  assert.match(observations[0].requestId, /^[0-9a-f-]{36}$/i);
});

test("clasifica resultados fallidos sin reemplazar los estados HTTP vigentes", async () => {
  const cases = [
    { statusCode: 404, expectedOutcome: "NOT_FOUND", expectedStatus: 404 },
    { statusCode: 409, expectedOutcome: "ALREADY_REGISTERED", expectedStatus: 409 },
    { statusCode: 500, expectedOutcome: "ERROR", expectedStatus: 500 },
  ];

  for (const item of cases) {
    const observations = [];
    const controller = new OrderController({
      service: {
        async getSalesNoteByNumber() {
          if (item.statusCode === 500) throw new Error("private database detail");
          throw new SalesOrderError("Mensaje vigente", item.statusCode);
        },
      },
      salesNoteMonitor: {
        async observeLookup(data) { observations.push(data); },
      },
      logger: { error() {} },
    });
    const res = responseRecorder();

    await controller.getSalesNote(request(), res);

    assert.equal(res.statusCode, item.expectedStatus);
    assert.equal(observations[0].outcome, item.expectedOutcome);
    if (item.statusCode === 500) {
      assert.equal(JSON.stringify(res.body).includes("private database detail"), false);
    }
  }
});

test("una falla completa del monitor no cambia el flujo ni produce 429", async () => {
  const logs = [];
  const controller = new OrderController({
    service: {
      async getSalesNoteByNumber() {
        return { numeroNota: "24226", cliente: {}, items: [] };
      },
    },
    salesNoteMonitor: {
      async observeLookup() { throw new Error("monitor unavailable"); },
    },
    logger: { error(entry) { logs.push(entry); } },
  });
  const res = responseRecorder();

  await controller.getSalesNote(request(), res);

  assert.equal(res.statusCode, 200);
  assert.notEqual(res.statusCode, 429);
  assert.equal(logs[0].event, "security.sales_note_lookup_monitor_failed");
});

test("la respuesta se emite antes de esperar la persistencia del monitor", async () => {
  let finishMonitoring;
  const monitoring = new Promise((resolve) => { finishMonitoring = resolve; });
  const controller = new OrderController({
    service: {
      async getSalesNoteByNumber() {
        return { numeroNota: "24226", cliente: {}, items: [] };
      },
    },
    salesNoteMonitor: {
      async observeLookup() { await monitoring; },
    },
  });
  const res = responseRecorder();

  const handler = controller.getSalesNote(request(), res);
  await Promise.resolve();

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.numeroNota, "24226");

  finishMonitoring();
  await handler;
});
