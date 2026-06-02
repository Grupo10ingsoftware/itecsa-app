import assert from "node:assert/strict";
import { test } from "node:test";
import requirePermission from "../src/middlewares/requirePermission.js";

function executeMiddleware(payload, permission = "update:payment-status") {
    let statusCode;
    let body;
    let nextCalled = false;
    const middleware = requirePermission(permission);
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

    middleware(req, res, () => {
        nextCalled = true;
    });

    return { statusCode, body, nextCalled };
}

test("permite cuando el token contiene el permiso requerido", () => {
    const result = executeMiddleware({
        permissions: ["view:payments-module", "update:payment-status"],
    });

    assert.equal(result.nextCalled, true);
    assert.equal(result.statusCode, undefined);
});

test("rechaza cuando el permiso requerido no esta presente", () => {
    const result = executeMiddleware({
        permissions: ["view:payments-module"],
    });

    assert.equal(result.nextCalled, false);
    assert.equal(result.statusCode, 403);
    assert.deepEqual(result.body, {
        message: "El usuario autenticado no tiene el permiso requerido.",
    });
});

test("rechaza cuando el claim permissions no existe", () => {
    const result = executeMiddleware({});

    assert.equal(result.nextCalled, false);
    assert.equal(result.statusCode, 403);
});

test("rechaza cuando el claim permissions esta malformado", () => {
    const result = executeMiddleware({
        permissions: "update:payment-status",
    });

    assert.equal(result.nextCalled, false);
    assert.equal(result.statusCode, 403);
});

test("exige configurar un permiso valido al crear el middleware", () => {
    assert.throws(() => requirePermission(" "), TypeError);
});
