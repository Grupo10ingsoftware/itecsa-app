import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import { createOrdersRouter } from "../src/routes/orders.routes.js";

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

test("monta checkJwt antes de requirePermission y de actualizar pago", async (t) => {
    const calls = [];
    const app = createTestApp(
        createOrdersRouter({
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
            updateStatus: (orderId, paymentStatus) => {
                calls.push("updatePaymentStatus");
                return {
                    id: orderId,
                    paymentStatus,
                    orderStatus: "Listo para produccion",
                };
            },
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

test("responde 403 si el token no contiene update:payment-status", async (t) => {
    let updateCalled = false;
    const app = createTestApp(
        createOrdersRouter({
            authenticate(req, res, next) {
                req.auth = { payload: { permissions: ["view:payments-module"] } };
                next();
            },
            updateStatus: () => {
                updateCalled = true;
            },
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

test("rechaza payload sin paymentStatus", async (t) => {
    const app = createTestApp(
        createOrdersRouter({
            authenticate(req, res, next) {
                req.auth = {
                    payload: { permissions: ["update:payment-status"] },
                };
                next();
            },
        }),
    );
    const server = await listen(app, t);

    const response = await fetch(
        `http://127.0.0.1:${server.address().port}/api/orders/1/payment-status`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "Confirmado" }),
        },
    );

    assert.equal(response.status, 400);
});
