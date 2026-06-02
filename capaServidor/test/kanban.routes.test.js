import assert from "node:assert/strict";
import { once } from "node:events";
import { beforeEach, test } from "node:test";
import express from "express";
import {
    PAYMENT_CONFIRMATION_REQUIRED_MESSAGE,
} from "../src/config/status.js";
import { createOrderRouter } from "../src/modules/orders/routes/order.routes.js";
import { resetMockOrders } from "../src/modules/orders/service/order.service.js";

beforeEach(() => {
    resetMockOrders();
});

function createTestApp(router) {
    const app = express();
    app.use(express.json());
    app.use("/api/orders", router);
    return app;
}

async function listen(app, t) {
    const server = app.listen(0);
    t.after(() => server.close());
    await once(server, "listening");
    return server;
}

function authenticate(req, res, next) {
    req.auth = { payload: { sub: "auth0|test-user" } };
    next();
}

test("GET /api/orders/kanban devuelve ordenes mock", async (t) => {
    const app = createTestApp(createOrderRouter({ authenticate }));
    const server = await listen(app, t);

    const response = await fetch(
        `http://127.0.0.1:${server.address().port}/api/orders/kanban`,
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(Array.isArray(body), true);
    assert.equal(body.length >= 3, true);
});

test("PATCH move devuelve el mensaje de pago pendiente si el pago no esta confirmado", async (t) => {
    const app = createTestApp(createOrderRouter({ authenticate }));
    const server = await listen(app, t);

    const response = await fetch(
        `http://127.0.0.1:${server.address().port}/api/orders/1/move`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ generalStepId: 1 }),
        },
    );
    const body = await response.json();

    assert.equal(response.status, 409);
    assert.deepEqual(body, { message: PAYMENT_CONFIRMATION_REQUIRED_MESSAGE });
});

test("PATCH move permite Listo para produccion si el pago esta confirmado", async (t) => {
    const app = createTestApp(createOrderRouter({ authenticate }));
    const server = await listen(app, t);

    const response = await fetch(
        `http://127.0.0.1:${server.address().port}/api/orders/6/move`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ generalStepId: 1 }),
        },
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.id_etapa_general, 1);
});
