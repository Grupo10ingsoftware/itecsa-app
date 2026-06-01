import assert from "node:assert/strict";
import { once } from "node:events";
import { beforeEach, test } from "node:test";
import express from "express";
import {
    ORDER_STATUS,
    RF32_WAITING_PAYMENT_MESSAGE,
} from "../src/config/status.js";
import { createKanbanRouter } from "../src/routes/kanban.routes.js";
import { resetMockOrders } from "../src/services/ordersMock.service.js";

beforeEach(() => {
    resetMockOrders();
});

function createTestApp(router) {
    const app = express();
    app.use(express.json());
    app.use("/api/kanban", router);
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

test("GET /api/kanban devuelve columnas y ordenes mock", async (t) => {
    const app = createTestApp(createKanbanRouter({ authenticate }));
    const server = await listen(app, t);

    const response = await fetch(
        `http://127.0.0.1:${server.address().port}/api/kanban`,
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body.columns, [
        ORDER_STATUS.CONFIRMACION_PAGO,
        ORDER_STATUS.LISTO_PRODUCCION,
        ORDER_STATUS.EN_PRODUCCION,
        ORDER_STATUS.LISTO_ENTREGA,
    ]);
    assert.equal(body.orders.length >= 3, true);
});

test("PATCH move devuelve el mensaje exacto RF32 si el pago no esta confirmado", async (t) => {
    const app = createTestApp(createKanbanRouter({ authenticate }));
    const server = await listen(app, t);

    const response = await fetch(
        `http://127.0.0.1:${server.address().port}/api/kanban/orders/1/move`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                targetStatus: ORDER_STATUS.LISTO_PRODUCCION,
            }),
        },
    );
    const body = await response.json();

    assert.equal(response.status, 409);
    assert.deepEqual(body, { message: RF32_WAITING_PAYMENT_MESSAGE });
});

test("PATCH move permite Listo para produccion si el pago esta confirmado", async (t) => {
    const app = createTestApp(createKanbanRouter({ authenticate }));
    const server = await listen(app, t);

    const response = await fetch(
        `http://127.0.0.1:${server.address().port}/api/kanban/orders/3/move`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                targetStatus: ORDER_STATUS.LISTO_PRODUCCION,
            }),
        },
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.order.orderStatus, ORDER_STATUS.LISTO_PRODUCCION);
});
