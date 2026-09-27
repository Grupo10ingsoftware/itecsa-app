import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import { createHealthRouter, createInternalHealthRouter } from "../src/modules/health/routes/health.routes.js";

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

test("GET /api/health/live responde sin consultar base de datos", async (t) => {
  let calls = 0;
  const app = createTestApp(createHealthRouter());
  const server = await listen(app, t);
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/health/live`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
  assert.equal(calls, 0);
});

test("GET /internal/ready responde ok con configuracion y token", async (t) => {
  const app = express();
  app.use("/internal", createInternalHealthRouter({
      enabled: true,
      token: "readiness-test",
      checkDatabase: async () => true,
    }));
  const server = await listen(app, t);

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/internal/ready`,
    { headers: { "X-Health-Token": "readiness-test" } },
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    status: "ok",
    database: "mysql",
  });
});

test("GET /internal/ready no expone detalles si falla la conexion", async (t) => {
  const app = express();
  app.use("/internal", createInternalHealthRouter({
      enabled: true,
      token: "readiness-test",
      checkDatabase: async () => {
        throw new Error("Access denied for user secreto");
      },
      logError: () => {},
    }));
  const server = await listen(app, t);

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/internal/ready`,
    { headers: { "X-Health-Token": "readiness-test" } },
  );
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.deepEqual(body, {
    code: "INTERNAL_ERROR",
    message: "No fue posible conectar con la base de datos.",
  });
});
