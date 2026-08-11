import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";

import { createDemoOrdersRouter } from "../src/modules/demoOrders/routes/demoOrders.routes.js";

function authenticate(req, res, next) {
  req.auth = { payload: { sub: "auth0|test-user" } };
  next();
}

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/demo-orders", createDemoOrdersRouter({ authenticate }));
  return app;
}

async function listen(app, t) {
  const server = app.listen(0);
  t.after(() => server.close());
  await once(server, "listening");
  return server;
}

test("GET /api/demo-orders lista los 15 pedidos compartidos", async (t) => {
  const server = await listen(createTestApp(), t);

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/demo-orders`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.length, 15);
  assert.equal(body.filter((order) => order.product === "Lanyard").length, 5);
  assert.equal(body.filter((order) => order.product === "Tarjeta").length, 5);
  assert.equal(body.filter((order) => order.product === "Mixto").length, 5);
});

test("PATCH delivery-date actualiza la fecha compartida del pedido", async (t) => {
  const server = await listen(createTestApp(), t);
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/demo-orders`;

  const patchResponse = await fetch(`${baseUrl}/demo-001/delivery-date`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dueDate: "2026-06-25" }),
  });
  const patchedOrder = await patchResponse.json();

  const listResponse = await fetch(baseUrl);
  const orders = await listResponse.json();
  const listedOrder = orders.find((order) => order.id === "demo-001");

  assert.equal(patchResponse.status, 200);
  assert.equal(patchedOrder.dueDate, "2026-06-25");
  assert.equal(listedOrder.dueDate, "2026-06-25");
  assert.equal(listedOrder.items.every((item) => item.dueDate === "2026-06-25"), true);
});

test("PATCH delivery-date rechaza fines de semana", async (t) => {
  const server = await listen(createTestApp(), t);

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/demo-orders/demo-002/delivery-date`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dueDate: "2026-06-13" }),
    },
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.deepEqual(body, { message: "La fecha de entrega debe ser un dia habil." });
});

test("GET payment-orders expone pedidos demo para cobranza", async (t) => {
  const server = await listen(createTestApp(), t);

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/demo-orders/payment-orders`,
  );
  const body = await response.json();
  const pendingOrder = body.find((order) => order.id_pedido === "demo-007");

  assert.equal(response.status, 200);
  assert.equal(body.length, 15);
  assert.equal(pendingOrder.estado_pago, "Pendiente");
  assert.equal(pendingOrder.id_etapa_general, 0);
  assert.equal(pendingOrder.numero_nota_venta, "NV-2026-2007");
});

test("PATCH payment-status confirma pago y permite desconfirmar dentro de la ventana", async (t) => {
  const server = await listen(createTestApp(), t);
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/demo-orders`;

  const response = await fetch(`${baseUrl}/demo-007/payment-status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "cobranza@itecsa.cl",
      password: "demo-password",
      paymentStatusId: 2,
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.estado_pago, "Confirmado");
  assert.equal(body.id_estado_pago, 2);
  assert.equal(body.id_etapa_general, 1);
  assert.equal(typeof body.paymentConfirmedAt, "string");

  const deconfirmResponse = await fetch(`${baseUrl}/demo-007/payment-status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "cobranza@itecsa.cl",
      password: "demo-password",
      paymentStatusId: 1,
    }),
  });
  const deconfirmedBody = await deconfirmResponse.json();

  assert.equal(deconfirmResponse.status, 200);
  assert.equal(deconfirmedBody.estado_pago, "Pendiente");
  assert.equal(deconfirmedBody.id_estado_pago, 1);
  assert.equal(deconfirmedBody.id_etapa_general, 0);
});

test("PATCH payment-status exige credenciales", async (t) => {
  const server = await listen(createTestApp(), t);

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/demo-orders/demo-001/payment-status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatusId: 2 }),
    },
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.deepEqual(body, {
    message: "Debe ingresar correo y contrasena para validar el cambio.",
  });
});
