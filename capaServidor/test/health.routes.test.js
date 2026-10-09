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

test("GET /api/health/live informa version sin cache y sin consultar base de datos", async (t) => {
  const app = createTestApp(createHealthRouter({ version: "a".repeat(40) }));
  const server = await listen(app, t);
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/health/live`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { status: "ok", version: "a".repeat(40) });
  assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/api/health/db`)).status, 404);
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
  assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/internal/ready`)).status, 404);
});

test("GET /internal/ready no expone detalles si falla la conexion", async (t) => {
  const app = express();
  app.use("/internal", createInternalHealthRouter({
      enabled: true,
      token: "readiness-test",
      checkDatabase: async () => {
        throw new Error("Access denied for user secreto");
      },
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
