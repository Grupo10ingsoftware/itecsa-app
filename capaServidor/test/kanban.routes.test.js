import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import {
    PAYMENT_CONFIRMATION_REQUIRED_MESSAGE,
} from "../src/config/status.js";
import { createOrderRouter } from "../src/modules/orders/routes/order.routes.js";

const KANBAN_ORDERS = [
    {
        id_pedido: 1,
        id_estado_pago: 1,
        id_etapa_general: 0,
    },
    {
        id_pedido: 6,
        id_estado_pago: 2,
        id_etapa_general: 1,
    },
    {
        id_pedido: 7,
        id_estado_pago: 2,
        id_etapa_general: 2,
    },
];

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

function createController(overrides = {}) {
    return {
        getOrders(req, res) {
            return res.status(200).json(KANBAN_ORDERS);
        },
        getOrder(req, res) {
            return res.status(200).json({});
        },
        createOrder(req, res) {
            return res.status(201).json({});
        },
        updatePaymentStatus(req, res) {
            return res.status(200).json({});
        },
        updateGeneralStep(req, res) {
            return res.status(200).json({
                id_pedido: Number(req.params.orderId),
                id_etapa_general: Number(req.body.generalStepId),
            });
        },
        ...overrides,
    };
}

test("GET /api/orders/kanban devuelve ordenes mock", async (t) => {
    const app = createTestApp(
        createOrderRouter({
            authenticate,
            controller: createController(),
        }),
    );
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
    const app = createTestApp(
        createOrderRouter({
            authenticate,
            controller: createController({
                updateGeneralStep(req, res) {
                    return res.status(409).json({
                        message: PAYMENT_CONFIRMATION_REQUIRED_MESSAGE,
                    });
                },
            }),
        }),
    );
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
    const app = createTestApp(
        createOrderRouter({
            authenticate,
            controller: createController(),
        }),
    );
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
