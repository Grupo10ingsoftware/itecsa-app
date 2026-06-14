import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import { createOrderRouter } from "../src/modules/orders/routes/order.routes.js";

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

function createController(updatePaymentStatus) {
    return {
        getOrders(req, res) {
            return res.status(200).json([]);
        },
        getOrder(req, res) {
            return res.status(200).json({});
        },
        createOrder(req, res) {
            return res.status(201).json({});
        },
        updateGeneralStep(req, res) {
            return res.status(200).json({});
        },
        getPaymentSignatureEvidence(req, res) {
            return res.status(200).send("evidence");
        },
        updatePaymentStatus,
    };
}

test("monta checkJwt antes de listar pedidos", async (t) => {
    const calls = [];
    const app = createTestApp(
        createOrderRouter({
            authenticate(req, res, next) {
                calls.push("checkJwt");
                next();
            },
            controller: {
                ...createController(() => {}),
                getOrders(req, res) {
                    calls.push("getOrders");
                    return res.status(200).json([]);
                },
            },
        }),
    );
    const server = await listen(app, t);

    const response = await fetch(
        `http://127.0.0.1:${server.address().port}/api/orders`,
    );

    assert.equal(response.status, 200);
    assert.deepEqual(calls, ["checkJwt", "getOrders"]);
});

test("monta checkJwt antes de requirePermission y de actualizar pago", async (t) => {
    const calls = [];
    const app = createTestApp(
        createOrderRouter({
            authenticate(req, res, next) {
                calls.push("checkJwt");
                req.auth = {
                    payload: { permissions: ["update:payment-status"] },
                };
                next();
            },
            authorizePaymentStatusUpdate(req, res, next) {
                calls.push("requirePermission");
                next();
            },
            controller: createController((req, res) => {
                calls.push("updatePaymentStatus");
                return res.status(200).json({
                    id: req.params.orderId,
                    paymentStatus: req.body.paymentStatus,
                });
            }),
        }),
    );
    const server = await listen(app, t);

    const response = await fetch(
        `http://127.0.0.1:${server.address().port}/api/orders/1/payment-status`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentStatus: "Confirmado" }),
        },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(calls, [
        "checkJwt",
        "requirePermission",
        "updatePaymentStatus",
    ]);
});

test("monta checkJwt antes de obtener evidencia de firma", async (t) => {
    const calls = [];
    const app = createTestApp(
        createOrderRouter({
            authenticate(req, res, next) {
                calls.push("checkJwt");
                next();
            },
            controller: {
                ...createController(() => {}),
                getPaymentSignatureEvidence(req, res) {
                    calls.push("getPaymentSignatureEvidence");
                    return res.status(200).send("evidence");
                },
            },
        }),
    );
    const server = await listen(app, t);

    const response = await fetch(
        `http://127.0.0.1:${server.address().port}/api/orders/1/payment-signature-evidence`,
    );
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.equal(body, "evidence");
    assert.deepEqual(calls, ["checkJwt", "getPaymentSignatureEvidence"]);
});

test("responde 403 si el token no contiene update:payment-status", async (t) => {
    let updateCalled = false;
    const app = createTestApp(
        createOrderRouter({
            authenticate(req, res, next) {
                req.auth = { payload: { permissions: ["view:payments-module"] } };
                next();
            },
            controller: createController((req, res) => {
                updateCalled = true;
                return res.status(200).json({});
            }),
        }),
    );
    const server = await listen(app, t);

    const response = await fetch(
        `http://127.0.0.1:${server.address().port}/api/orders/1/payment-status`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentStatus: "Confirmado" }),
        },
    );
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(updateCalled, false);
    assert.deepEqual(body, {
        message: "El usuario autenticado no tiene el permiso requerido.",
    });
});
