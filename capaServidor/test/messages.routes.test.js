import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import { createMessageRouter } from "../src/modules/messages/routes/message.routes.js";

function createTestApp(router) {
    const app = express();
    app.use(express.json());
    app.use("/api/messages", router);
    return app;
}

async function listen(app, t) {
    const server = app.listen(0);
    t.after(() => server.close());
    await once(server, "listening");
    return server;
}

function createController(calls) {
    return {
        getInbox(req, res) {
            calls.push("getInbox");
            return res.status(200).json({ messages: [] });
        },
        getNotifications(req, res) {
            calls.push("getNotifications");
            return res.status(200).json({ notifications: [], unreadCount: 0 });
        },
        markAsRead(req, res) {
            calls.push(`markAsRead:${req.params.messageId}`);
            return res.status(200).json({ id_mensaje: Number(req.params.messageId), leido: true });
        },
        hideNotification(req, res) {
            calls.push(`hideNotification:${req.params.messageId}`);
            return res.status(200).json({ id_mensaje: Number(req.params.messageId), oculto: true });
        },
        clearNotifications(req, res) {
            calls.push("clearNotifications");
            return res.status(200).json({ hiddenCount: 0 });
        },
        getMessage(req, res) {
            calls.push(`getMessage:${req.params.messageId}`);
            return res.status(200).json({ id_mensaje: Number(req.params.messageId) });
        },
    };
}

function authenticate(calls) {
    return (req, res, next) => {
        calls.push("checkJwt");
        req.auth = { payload: { sub: "auth0|test" } };
        next();
    };
}

test("monta checkJwt antes de listar bandeja de mensajes", async (t) => {
    const calls = [];
    const app = createTestApp(
        createMessageRouter({
            authenticate: authenticate(calls),
            controller: createController(calls),
        }),
    );
    const server = await listen(app, t);

    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/messages`);

    assert.equal(response.status, 200);
    assert.deepEqual(calls, ["checkJwt", "getInbox"]);
});

test("monta checkJwt antes de listar notificaciones", async (t) => {
    const calls = [];
    const app = createTestApp(
        createMessageRouter({
            authenticate: authenticate(calls),
            controller: createController(calls),
        }),
    );
    const server = await listen(app, t);

    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/messages/notifications`);

    assert.equal(response.status, 200);
    assert.deepEqual(calls, ["checkJwt", "getNotifications"]);
});

test("monta checkJwt antes de marcar un mensaje como leido", async (t) => {
    const calls = [];
    const app = createTestApp(
        createMessageRouter({
            authenticate: authenticate(calls),
            controller: createController(calls),
        }),
    );
    const server = await listen(app, t);

    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/messages/42/read`, {
        method: "PATCH",
    });

    assert.equal(response.status, 200);
    assert.deepEqual(calls, ["checkJwt", "markAsRead:42"]);
});

test("monta checkJwt antes de ocultar una notificacion", async (t) => {
    const calls = [];
    const app = createTestApp(
        createMessageRouter({
            authenticate: authenticate(calls),
            controller: createController(calls),
        }),
    );
    const server = await listen(app, t);

    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/messages/notifications/42`, {
        method: "DELETE",
    });

    assert.equal(response.status, 200);
    assert.deepEqual(calls, ["checkJwt", "hideNotification:42"]);
});
