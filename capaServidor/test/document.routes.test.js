import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";

import { createDocumentRouter } from "../src/modules/documents/routes/document.routes.js";

function createTestApp() {
  const app = express();
  app.use("/api/documents", createDocumentRouter());
  return app;
}

async function listen(app, t) {
  const server = app.listen(0);
  t.after(() => server.close());
  await once(server, "listening");
  return server;
}

test("sirve una Nota de Venta PDF dummy existente", async (t) => {
  const server = await listen(createTestApp(), t);

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/documents/nvs/Pedido1.pdf`,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/pdf");
});

test("responde 404 cuando la Nota de Venta no existe", async (t) => {
  const server = await listen(createTestApp(), t);

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/documents/nvs/Pedido999.pdf`,
  );
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.deepEqual(body, { message: "Nota de Venta no encontrada." });
});

test("rechaza archivos que no son PDF", async (t) => {
  const server = await listen(createTestApp(), t);

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/documents/nvs/README.md`,
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.deepEqual(body, {
    message: "El archivo solicitado no es una Nota de Venta valida.",
  });
});

test("rechaza intentos de path traversal", async (t) => {
  const server = await listen(createTestApp(), t);

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/documents/nvs/..%5CPedido1.pdf`,
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.deepEqual(body, {
    message: "El archivo solicitado no es una Nota de Venta valida.",
  });
});
