import assert from "node:assert/strict";
import { test } from "node:test";
import requireAdministrador from "../src/middlewares/requireAdministrador.js";

const ROLES_CLAIM = "https://itecsa.local/roles";

function executeMiddleware(payload) {
    let statusCode;
    let body;
    let nextCalled = false;
    const req = { auth: { payload } };
    const res = {
        status(code) {
            statusCode = code;
            return this;
        },
        json(responseBody) {
            body = responseBody;
            return this;
        },
    };

    requireAdministrador(req, res, () => {
        nextCalled = true;
    });

    return { statusCode, body, nextCalled };
}

test("permite un usuario con solo el rol Administrador", () => {
    const result = executeMiddleware({ [ROLES_CLAIM]: ["Administrador"] });

    assert.equal(result.nextCalled, true);
    assert.equal(result.statusCode, undefined);
});

test("rechaza un usuario con un rol distinto", () => {
    const result = executeMiddleware({ [ROLES_CLAIM]: ["Gerencia"] });

    assert.equal(result.nextCalled, false);
    assert.equal(result.statusCode, 403);
});

test("rechaza un usuario sin roles", () => {
    const result = executeMiddleware({ [ROLES_CLAIM]: [] });

    assert.equal(result.nextCalled, false);
    assert.equal(result.statusCode, 403);
});

test("rechaza un usuario sin claim de roles", () => {
    const result = executeMiddleware({});

    assert.equal(result.nextCalled, false);
    assert.equal(result.statusCode, 403);
});

test("rechaza multiples roles aunque incluyan Administrador", () => {
    const result = executeMiddleware({
        [ROLES_CLAIM]: ["Administrador", "Gerencia"],
    });

    assert.equal(result.nextCalled, false);
    assert.equal(result.statusCode, 403);
});
