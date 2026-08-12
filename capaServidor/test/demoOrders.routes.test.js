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

test("PATCH payment-status confirma pago y la desconfirmacion requiere solicitud y aprobacion", async (t) => {
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

  const requestResponse = await fetch(`${baseUrl}/demo-007/request-payment-deconfirmation`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "cobranza@itecsa.cl",
    }),
  });
  const requestedBody = await requestResponse.json();

  assert.equal(requestResponse.status, 200);
  assert.equal(requestedBody.estado_pago, "Confirmado");
  assert.equal(requestedBody.id_etapa_general, 1);
  assert.equal(requestedBody.paymentDeconfirmationRequested, true);

  const approveResponse = await fetch(`${baseUrl}/demo-007/approve-payment-deconfirmation`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin.produccion@itecsa.cl",
      password: "demo-password",
    }),
  });
  const approvedBody = await approveResponse.json();

  assert.equal(approveResponse.status, 200);
  assert.equal(approvedBody.paymentStatus, "Pendiente");
  assert.equal(approvedBody.paymentStatusId, 1);
  assert.equal(approvedBody.generalStepId, 0);
  assert.equal(approvedBody.paymentDeconfirmationRequested, false);

  const announcementsResponse = await fetch(`${baseUrl}/announcements`);
  const announcements = await announcementsResponse.json();

  assert.equal(announcements.some(
    (announcement) =>
      announcement.type === "payment_deconfirmation_requested" &&
      announcement.orderId === "demo-007",
  ), true);
  assert.equal(announcements.some(
    (announcement) =>
      announcement.type === "payment_deconfirmation_approved" &&
      announcement.orderId === "demo-007",
  ), true);
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

test("PATCH payment-status no permite desconfirmar directo un pago confirmado", async (t) => {
  const server = await listen(createTestApp(), t);
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/demo-orders`;

  const response = await fetch(`${baseUrl}/demo-010/payment-status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "cobranza@itecsa.cl",
      password: "demo-password",
      paymentStatusId: 1,
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 409);
  assert.deepEqual(body, {
    message: "La desconfirmacion debe ser solicitada por cobranza y aprobada desde Kanban.",
  });
});

test("GET announcements lista anuncios demo del kanban", async (t) => {
  const server = await listen(createTestApp(), t);

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/demo-orders/announcements`,
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.length >= 2, true);
  assert.equal(body.some((announcement) => announcement.type === "payment_deconfirmation_requested"), true);
});

test("PATCH move a en produccion registra anuncio de cambio de columna", async (t) => {
  const server = await listen(createTestApp(), t);
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/demo-orders`;

  const moveResponse = await fetch(`${baseUrl}/demo-002/move`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      generalStepId: 2,
      operatorEmail: "admin.produccion@itecsa.cl",
    }),
  });
  const movedOrder = await moveResponse.json();

  const announcementsResponse = await fetch(`${baseUrl}/announcements`);
  const announcements = await announcementsResponse.json();
  const moveAnnouncement = announcements.find(
    (announcement) =>
      announcement.type === "kanban_move_to_production" &&
      announcement.orderId === "demo-002",
  );

  assert.equal(moveResponse.status, 200);
  assert.equal(movedOrder.generalStepId, 2);
  assert.equal(announcementsResponse.status, 200);
  assert.equal(moveAnnouncement.summary, "Admin hizo efectivo el cambio de estado del pedido NV-2026-2002");
});
