import { payloadFor } from "./authorization.fixture.js";
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
        getPaymentWorkspace(req, res) {
            return res.status(200).json({ orders: [], paymentStatuses: [] });
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
        sendToReview(req, res) {
            return res.status(200).json({});
        },
        cancelProduction(req, res) {
            return res.status(200).json({});
        },
        completeSubprocess(req, res) {
            return res.status(200).json({});
        },
        updatePaymentStatus,
    };
}

test("usa el endpoint liviano y protegido para cargar cobranzas", async (t) => {
    const calls = [];
    const app = createTestApp(
        createOrderRouter({
            authenticate(req, _res, next) {
                req.auth = { payload: payloadFor() };
                calls.push("checkJwt");
                next();
            },
            controller: {
                ...createController(() => {}),
                getPaymentWorkspace(_req, res) {
                    calls.push("getPaymentWorkspace");
                    return res.status(200).json({
                        orders: [{ id_pedido: 1 }],
                        paymentStatuses: [{ id_estado_pago: 1 }],
                    });
                },
            },
        }),
    );
    const server = await listen(app, t);

    const response = await fetch(
        `http://127.0.0.1:${server.address().port}/api/orders/payments`,
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(calls, ["checkJwt", "getPaymentWorkspace"]);
    assert.equal(body.orders[0].id_pedido, 1);
});

test("monta checkJwt antes de listar pedidos", async (t) => {
    const calls = [];
    const app = createTestApp(
        createOrderRouter({
            authenticate(req, res, next) {
            req.auth = {payload:payloadFor()};
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
            req.auth = {payload:payloadFor()};
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
            validatePin(req, res, next) {
                calls.push("requirePin");
                next();
            },
            controller: createController((req, res) => {
                calls.push("updatePaymentStatus");
                return res.status(200).json({
                    id: req.params.orderId,
                    paymentStatusId: req.body.paymentStatusId,
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
            body: JSON.stringify({ paymentStatusId: 2 }),
        },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(calls, [
        "checkJwt",
        "requirePermission",
        "requirePin",
        "updatePaymentStatus",
    ]);
});

test("monta checkJwt y requirePin antes de completar subproceso", async (t) => {
    const calls = [];
    const app = createTestApp(
        createOrderRouter({
            authenticate(req, res, next) {
            req.auth = {payload:payloadFor()};
                calls.push("checkJwt");
                next();
            },
            validatePin(req, res, next) {
                calls.push("requirePin");
                next();
            },
            controller: {
                ...createController(() => {}),
                completeSubprocess(req, res) {
                    calls.push("completeSubprocess");
                    return res.status(200).json({ completed: true });
                },
            },
        }),
    );
    const server = await listen(app, t);

    const response = await fetch(
        `http://127.0.0.1:${server.address().port}/api/orders/1/details/2/subprocesses/3/complete`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" },
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, { completed: true });
    assert.deepEqual(calls, ["checkJwt", "requirePin", "completeSubprocess"]);
});

test("monta autenticacion y rol administrativo antes de enviar a revision", async (t) => {
    const calls = [];
    const app = createTestApp(
        createOrderRouter({
            authenticate(req, res, next) {
            req.auth = {payload:payloadFor()};
                calls.push("checkJwt");
                next();
            },
            authorizeAdministrativeRole(req, res, next) {
                calls.push("requireAdministrativeRole");
                next();
            },
            controller: {
                ...createController(() => {}),
                sendToReview(req, res) {
                    calls.push("sendToReview");
                    return res.status(200).json({ id: req.params.orderId });
                },
            },
        }),
    );
    const server = await listen(app, t);

    const response = await fetch(
        `http://127.0.0.1:${server.address().port}/api/orders/1/review`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comment: "Corregir diseño" }) },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(calls, ["checkJwt", "requireAdministrativeRole", "sendToReview"]);
});

test("exige autenticacion, rol Administrador Produccion y PIN antes de cancelar", async (t) => {
    const calls = [];
    const app = createTestApp(
        createOrderRouter({
            authenticate(req, res, next) {
            req.auth = {payload:payloadFor()};
                calls.push("checkJwt");
                next();
            },
            authorizeCancellation(req, res, next) {
                calls.push("requireAdministratorRole");
                next();
            },
            validatePin(req, res, next) {
                calls.push("requirePin");
                req.pinActor = { idUsuario: 10 };
                next();
            },
            controller: {
                ...createController(() => {}),
                cancelProduction(req, res) {
                    calls.push("cancelProduction");
                    return res.status(200).json({ id: req.params.orderId });
                },
            },
        }),
    );
    const server = await listen(app, t);

    const response = await fetch(
        `http://127.0.0.1:${server.address().port}/api/orders/1/cancel-production`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pin: "123456", comment: "Cliente cancelo" }),
        },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(calls, [
        "checkJwt",
        "requireAdministratorRole",
        "requirePin",
        "cancelProduction",
    ]);
});

test("responde 403 si el token no contiene update:payment-status", async (t) => {
    let updateCalled = false;
    const app = createTestApp(
        createOrderRouter({
            authenticate(req, res, next) {
            req.auth = {payload:payloadFor()};
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
            body: JSON.stringify({ paymentStatusId: 2 }),
        },
    );
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(updateCalled, false);
    assert.deepEqual(body, {
        message: "No tienes autorizacion para esta accion.",
    });
});
