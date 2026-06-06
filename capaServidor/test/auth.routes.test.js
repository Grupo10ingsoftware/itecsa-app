import assert from "node:assert/strict";
import { test } from "node:test";
import { verifyAuthSessionHandler } from "../src/modules/auth/controller/auth.controller.js";

const VALID_PAYLOAD = {
    sub: "auth0|user-id",
    "https://itecsa.local/email": "usuario.controlado@example.cl",
    "https://itecsa.local/roles": ["Ventas"],
};

function responseRecorder() {
    return {
        statusCode: undefined,
        body: undefined,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
    };
}

function executeVerify(payload) {
    const res = responseRecorder();

    verifyAuthSessionHandler({ auth: { payload } }, res);

    return res;
}

test("devuelve permisos Auth0 en la verificacion de sesion", () => {
    const res = executeVerify({
        ...VALID_PAYLOAD,
        permissions: [
            "view:orders-module",
            "view:kanban-module",
            "",
            null,
        ],
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
        sub: VALID_PAYLOAD.sub,
        email: VALID_PAYLOAD["https://itecsa.local/email"],
        rolUsuario: "Ventas",
        isAdministrador: false,
        permissions: ["view:orders-module", "view:kanban-module"],
    });
});

test("devuelve permisos vacios si Auth0 no incluye permissions", () => {
    const res = executeVerify(VALID_PAYLOAD);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.permissions, []);
});

test("rechaza permissions malformado", () => {
    const res = executeVerify({
        ...VALID_PAYLOAD,
        permissions: "view:orders-module",
    });

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, {
        message: "La sesion autenticada no tiene un rol valido para ITECSA.",
    });
});
