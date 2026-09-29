import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import { test } from "node:test";

import {
  BUSINESS_PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLES,
  ROLES_CLAIM,
} from "../../shared/authorization.js";
import { resolveEnvironmentConfig } from "../src/config/environment.js";
import { createDemoOrdersRouter } from "../src/modules/demoOrders/routes/demoOrders.routes.js";
import { createOrderRouter } from "../src/modules/orders/routes/order.routes.js";
import SalesNoteSourceService from "../src/modules/orders/service/salesNoteSource.service.js";
import Server from "../src/server.js";

const productionEnvironment = {
  NODE_ENV: "production",
  ENABLE_DEMO_ROUTES: "false",
};

async function listen(app, t) {
  const server = app.listen(0, "127.0.0.1");
  t.after(() => server.close());
  await once(server, "listening");
  return `http://127.0.0.1:${server.address().port}`;
}

test("valida NODE_ENV explícito y opt-in demo estricto", () => {
  assert.deepEqual(resolveEnvironmentConfig({ NODE_ENV: "development" }), {
    nodeEnv: "development",
    demoFeaturesEnabled: false,
  });
  assert.deepEqual(
    resolveEnvironmentConfig({
      NODE_ENV: "test",
      ENABLE_DEMO_ROUTES: "true",
    }),
    { nodeEnv: "test", demoFeaturesEnabled: true },
  );
  assert.throws(() => resolveEnvironmentConfig({}), /NODE_ENV debe definirse/);
  assert.throws(
    () => resolveEnvironmentConfig({ NODE_ENV: "staging" }),
    /NODE_ENV debe definirse/,
  );
  assert.throws(
    () =>
      resolveEnvironmentConfig({
        NODE_ENV: "development",
        ENABLE_DEMO_ROUTES: "yes",
      }),
    /ENABLE_DEMO_ROUTES solo admite/,
  );
  assert.throws(
    () =>
      resolveEnvironmentConfig({
        NODE_ENV: "production",
        ENABLE_DEMO_ROUTES: "true",
      }),
    /no puede habilitarse en production/,
  );
});

test("production no monta demo ni debug y conserva rutas reales para Soporte", async (t) => {
  const server = new Server({ env: productionEnvironment });
  const supportPayload = {
    sub: "auth0|support",
    [ROLES_CLAIM]: [ROLES.SOPORTE],
    permissions: [...ROLE_PERMISSIONS[ROLES.SOPORTE]],
  };

  assert.deepEqual(ROLE_PERMISSIONS[ROLES.SOPORTE], BUSINESS_PERMISSIONS);

  const app = express();
  app.use(
    "/support-test/orders",
    createOrderRouter({
      authenticate(req, _res, next) {
        req.auth = { payload: supportPayload };
        next();
      },
      controller: {
        getOrders(_req, res) {
          return res.status(200).json({ feature: "real-orders" });
        },
      },
    }),
  );

  app.use(server.app);
  const baseUrl = await listen(app, t);
  const demoResponses = await Promise.all([
    fetch(`${baseUrl}/api/demo-orders`),
    fetch(`${baseUrl}/api/demo-orders/payment-orders`),
    fetch(`${baseUrl}/api/demo-orders/sales-notes/available`),
    fetch(`${baseUrl}/api/demo-orders/demo-001/move`, { method: "PATCH" }),
  ]);
  const debug = await fetch(`${baseUrl}/api/auth/pin/debug-reset`, {
    method: "POST",
  });
  const realFeature = await fetch(`${baseUrl}/support-test/orders`);

  assert.deepEqual(demoResponses.map((response) => response.status), [
    404,
    404,
    404,
    404,
  ]);
  assert.equal(debug.status, 404);
  assert.equal(realFeature.status, 200);
  assert.deepEqual(await realFeature.json(), { feature: "real-orders" });
});

test("demo requiere opt-in explícito en development y test", async (t) => {
  const disabled = new Server({ env: { NODE_ENV: "development" } });
  const disabledUrl = await listen(disabled.app, t);
  assert.equal((await fetch(`${disabledUrl}/api/demo-orders`)).status, 404);
  assert.equal(
    (
      await fetch(`${disabledUrl}/api/auth/pin/debug-reset`, {
        method: "POST",
      })
    ).status,
    404,
  );

  const enabled = new Server({
    env: { NODE_ENV: "development", ENABLE_DEMO_ROUTES: "true" },
  });
  enabled.app.use((error, _req, res, _next) => {
    return res.status(error.status ?? 500).end();
  });
  const previousAudience = process.env.AUTH0_AUDIENCE;
  const previousDomain = process.env.AUTH0_DOMAIN;
  process.env.AUTH0_AUDIENCE = "https://api.test";
  process.env.AUTH0_DOMAIN = "tenant.example";
  t.after(() => {
    if (previousAudience === undefined) delete process.env.AUTH0_AUDIENCE;
    else process.env.AUTH0_AUDIENCE = previousAudience;
    if (previousDomain === undefined) delete process.env.AUTH0_DOMAIN;
    else process.env.AUTH0_DOMAIN = previousDomain;
  });
  const enabledUrl = await listen(enabled.app, t);
  assert.equal((await fetch(`${enabledUrl}/api/demo-orders`)).status, 401);
  assert.equal(
    (
      await fetch(`${enabledUrl}/api/auth/pin/debug-reset`, {
        method: "POST",
      })
    ).status,
    401,
  );
});

test("Soporte conserva acceso a la ruta demo cuando se habilita explícitamente", async (t) => {
  const app = express();
  app.use(
    "/api/demo-orders",
    createDemoOrdersRouter({
      authenticate(req, _res, next) {
        req.auth = {
          payload: {
            sub: "auth0|support",
            [ROLES_CLAIM]: [ROLES.SOPORTE],
            permissions: ROLE_PERMISSIONS[ROLES.SOPORTE],
          },
        };
        next();
      },
    }),
  );
  const baseUrl = await listen(app, t);

  const response = await fetch(`${baseUrl}/api/demo-orders`);
  const orders = await response.json();

  assert.equal(response.status, 200);
  assert.equal(orders.length, 15);
});

test("la fixture de Notas de Venta falla cerrada sin demo habilitado", async () => {
  const disabled = new SalesNoteSourceService({
    demoFeatureEnabled: () => false,
  });
  await assert.rejects(
    () => disabled.getByNumber("NV-2026-1001"),
    { code: "DEMO_FEATURES_DISABLED", statusCode: 503 },
  );

  const enabled = new SalesNoteSourceService({
    demoFeatureEnabled: () => true,
  });
  const note = await enabled.getByNumber("NV-2026-22405");
  assert.equal(note.numeroNota, "22405");
});

test("rechaza configuraciones divergentes de APP_ENV y NODE_ENV", () => {
  for (const [APP_ENV, NODE_ENV] of [["production", "development"], ["development", "production"], ["test", "development"]]) {
    assert.throws(() => resolveEnvironmentConfig({ APP_ENV, NODE_ENV }), /deben coincidir/);
  }
});
