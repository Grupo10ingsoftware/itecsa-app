import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";

import { createProductionCalendarRouter } from "../src/modules/productionCalendar/routes/productionCalendar.routes.js";
import { calculateOperationalLoadByDate } from "../src/modules/productionCalendar/service/operationalLoad.service.js";

function authenticate(req, res, next) {
  req.auth = { payload: { sub: "auth0|test-user" } };
  next();
}

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/production-calendar", createProductionCalendarRouter({ authenticate }));
  return app;
}

async function listen(app, t) {
  const server = app.listen(0);
  t.after(() => server.close());
  await once(server, "listening");
  return server;
}

test("calcula carga de lanyards solo en dias habiles previos a la entrega", () => {
  const result = calculateOperationalLoadByDate({
    from: "2026-06-01",
    to: "2026-06-12",
    items: [
      {
        id: "one",
        orderNumber: "NV-1",
        productType: "Lanyard",
        quantity: 100,
        dueDate: "2026-06-11",
      },
    ],
  });

  const loads = new Map(result.days.map((day) => [day.date, day.lanyardsLoad]));

  assert.equal(loads.get("2026-06-04"), 20);
  assert.equal(loads.get("2026-06-05"), 20);
  assert.equal(loads.get("2026-06-08"), 20);
  assert.equal(loads.get("2026-06-09"), 20);
  assert.equal(loads.get("2026-06-10"), 20);
  assert.equal(loads.get("2026-06-11"), 0);
  assert.equal(loads.get("2026-06-06"), 0);
  assert.equal(loads.get("2026-06-07"), 0);
});

test("acumula la carga diaria de varias producciones de lanyards", () => {
  const result = calculateOperationalLoadByDate({
    from: "2026-06-08",
    to: "2026-06-10",
    items: [
      {
        id: "one",
        orderNumber: "NV-1",
        productType: "Lanyard",
        quantity: 100,
        dueDate: "2026-06-11",
      },
      {
        id: "two",
        orderNumber: "NV-2",
        productType: "Lanyard",
        quantity: 300,
        dueDate: "2026-06-11",
      },
    ],
  });

  const day = result.days.find((item) => item.date === "2026-06-10");

  assert.equal(day.lanyardsLoad, 50);
  assert.equal(day.percentage, 4);
  assert.equal(day.sources.length, 2);
});

test("POST /api/production-calendar/operational-load calcula carga operativa", async (t) => {
  const server = await listen(createTestApp(), t);

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/production-calendar/operational-load`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "2026-06-08",
        to: "2026-06-11",
        items: [
          {
            id: "one",
            orderNumber: "NV-1",
            productType: "Lanyard",
            quantity: 100,
            dueDate: "2026-06-11",
          },
        ],
      }),
    },
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.capacityPerDay, 1200);
  assert.equal(body.days.find((day) => day.date === "2026-06-10").lanyardsLoad, 20);
});
