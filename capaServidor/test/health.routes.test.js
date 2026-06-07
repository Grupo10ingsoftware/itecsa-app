import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import { createHealthRouter } from "../src/modules/health/routes/health.routes.js";

function createTestApp(router) {
  const app = express();
  app.use("/api/health", router);
  return app;
}

async function listen(app, t) {
  const server = app.listen(0);
  t.after(() => server.close());
  await once(server, "listening");
  return server;
}

test("GET /api/health/db responde ok si la base de datos conecta", async (t) => {
  const app = createTestApp(
    createHealthRouter({
      checkDatabase: async () => true,
    }),
  );
  const server = await listen(app, t);

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/health/db`,
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    status: "ok",
    database: "mysql",
  });
});

test("GET /api/health/db no expone detalles si falla la conexion", async (t) => {
  const app = createTestApp(
    createHealthRouter({
      checkDatabase: async () => {
        throw new Error("Access denied for user secreto");
      },
      logError: () => {},
    }),
  );
  const server = await listen(app, t);

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/health/db`,
  );
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.deepEqual(body, {
    message: "No fue posible conectar con la base de datos.",
  });
});
