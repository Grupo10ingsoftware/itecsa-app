import assert from "node:assert/strict";
import { test } from "node:test";
import MessageService from "../src/modules/messages/service/message.service.js";

function createService({ user = { idUsuario: 7 }, repoOverrides = {} } = {}) {
    const calls = [];
    const repo = {
        async listInbox(payload) {
            calls.push(["listInbox", payload]);
            return { messages: [], total: 0, page: payload.page, perPage: payload.perPage };
        },
        async listNotifications(userId, limit) {
            calls.push(["listNotifications", userId, limit]);
            return [];
        },
        async countUnreadNotifications(userId) {
            calls.push(["countUnreadNotifications", userId]);
            return 0;
        },
        async findUserMessage(userId, messageId) {
            calls.push(["findUserMessage", userId, messageId]);
            return { id_mensaje: messageId, leido: false, oculto: false };
        },
        async markAsRead(userId, messageId) {
            calls.push(["markAsRead", userId, messageId]);
            return { id_mensaje: messageId, leido: true };
        },
        async hideNotification(userId, messageId) {
            calls.push(["hideNotification", userId, messageId]);
            return { id_mensaje: messageId, oculto: true };
        },
        ...repoOverrides,
    };
    const userRepo = {
        async findByAuth0Id(auth0UserId) {
            calls.push(["findByAuth0Id", auth0UserId]);
            return user;
        },
    };

    return {
        calls,
        service: new MessageService({ repo, userRepo }),
    };
}

test("getInbox resuelve usuario interno y normaliza filtros", async () => {
    const { calls, service } = createService();

    const result = await service.getInbox("auth0|abc", {
        status: "unread",
        sort: "oldest",
        page: "2",
        perPage: "15",
    });

    assert.equal(result.page, 2);
    assert.equal(result.perPage, 15);
    assert.deepEqual(calls[0], ["findByAuth0Id", "auth0|abc"]);
    assert.equal(calls[1][0], "listInbox");
    assert.equal(calls[1][1].userId, 7);
    assert.equal(calls[1][1].status, "unread");
    assert.equal(calls[1][1].sort, "oldest");
});

test("getNotifications consulta mensajes visibles y contador sin leer", async () => {
    const { calls, service } = createService();

    const result = await service.getNotifications("auth0|abc", { limit: "5" });

    assert.deepEqual(result, { notifications: [], unreadCount: 0 });
    assert.deepEqual(calls, [
        ["findByAuth0Id", "auth0|abc"],
        ["listNotifications", 7, 5],
        ["countUnreadNotifications", 7],
    ]);
});

test("markAsRead marca solo mensajes existentes no leidos", async () => {
    const { calls, service } = createService();

    const result = await service.markAsRead("auth0|abc", "42");

    assert.deepEqual(result, { id_mensaje: 42, leido: true });
    assert.deepEqual(calls, [
        ["findByAuth0Id", "auth0|abc"],
        ["findUserMessage", 7, 42],
        ["markAsRead", 7, 42],
    ]);
});

test("hideNotification oculta solo mensajes existentes", async () => {
    const { calls, service } = createService();

    const result = await service.hideNotification("auth0|abc", "42");

    assert.deepEqual(result, { id_mensaje: 42, oculto: true });
    assert.deepEqual(calls, [
        ["findByAuth0Id", "auth0|abc"],
        ["findUserMessage", 7, 42],
        ["hideNotification", 7, 42],
    ]);
});
