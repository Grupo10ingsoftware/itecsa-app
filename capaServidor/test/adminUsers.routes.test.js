import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import { Auth0ServiceError } from "../src/modules/users/service/auth0Management.service.js";
import {
    createAdminUserHandler,
    createPasswordSetupEmailHandler,
} from "../src/modules/users/controller/adminUsers.controller.js";
import { createAdminUsersRouter } from "../src/modules/users/routes/adminUsers.routes.js";

const VALID_BODY = {
    primerNombre: "Ana",
    apellidoPaterno: "Perez",
    correoUsuario: "ana.perez@itecsa.cl",
    rolUsuario: "Ventas",
};
const VALID_PASSWORD_EMAIL_BODY = {
    correoUsuario: "ana.perez@itecsa.cl",
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

async function executeHandler({ body = VALID_BODY, createUser, requestPasswordEmail }) {
    const res = responseRecorder();
    const handler = createAdminUserHandler({ createUser, requestPasswordEmail });

    await handler({ body }, res);

    return res;
}

async function executePasswordEmailHandler({
    body = VALID_PASSWORD_EMAIL_BODY,
    requestPasswordEmail,
}) {
    const res = responseRecorder();
    const handler = createPasswordSetupEmailHandler({ requestPasswordEmail });

    await handler({ body }, res);

    return res;
}

test("responde 201 cuando asigna rol y solicita correo", async () => {
    let createUserPayload;
    const res = await executeHandler({
        createUser: async (payload) => {
            createUserPayload = payload;
            return {
                userId: "auth0|created-user",
                roleAssignmentCompleted: true,
            };
        },
        requestPasswordEmail: async () => ({ requested: true }),
    });

    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.body, {
        idUsuarioAutenticacionExterna: "auth0|created-user",
        correoUsuario: VALID_BODY.correoUsuario,
        rolUsuario: VALID_BODY.rolUsuario,
        passwordSetupEmailRequested: true,
    });
    assert.deepEqual(createUserPayload, {
        email: VALID_BODY.correoUsuario,
        primerNombre: VALID_BODY.primerNombre,
        apellidoPaterno: VALID_BODY.apellidoPaterno,
        rolUsuario: VALID_BODY.rolUsuario,
    });
});

test("responde 200 cuando solicita reenvio de correo de contrasena", async () => {
    let requestedEmail;
    const res = await executePasswordEmailHandler({
        requestPasswordEmail: async ({ email }) => {
            requestedEmail = email;
            return { requested: true };
        },
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
        correoUsuario: VALID_PASSWORD_EMAIL_BODY.correoUsuario,
        passwordSetupEmailRequested: true,
    });
    assert.equal(requestedEmail, VALID_PASSWORD_EMAIL_BODY.correoUsuario);
});

test("responde 400 y no llama Auth0 si el reenvio de correo es invalido", async () => {
    const invalidBodies = [
        null,
        [],
        {},
        { correoUsuario: " " },
        { correoUsuario: "no-es-correo" },
        { correoUsuario: VALID_PASSWORD_EMAIL_BODY.correoUsuario, password: "x" },
    ];
    let calls = 0;

    for (const body of invalidBodies) {
        const res = await executePasswordEmailHandler({
            body,
            requestPasswordEmail: async () => {
                calls += 1;
            },
        });

        assert.equal(res.statusCode, 400);
    }

    assert.equal(calls, 0);
});

test("responde 500 generico si falla el reenvio de correo", async () => {
    const res = await executePasswordEmailHandler({
        requestPasswordEmail: async () => {
            throw new Auth0ServiceError(
                "AUTH0_PASSWORD_EMAIL_FAILED",
                "detalle interno Auth0",
            );
        },
    });

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, {
        message: "No fue posible solicitar el correo de establecimiento de contrasena.",
    });
    assert.equal(JSON.stringify(res.body).includes("Auth0"), false);
});

test("responde 201 recuperable si falla el correo tras crear y asignar rol", async () => {
    const res = await executeHandler({
        createUser: async () => ({
            userId: "auth0|created-user",
            roleAssignmentCompleted: true,
        }),
        requestPasswordEmail: async () => {
            throw new Error("internal email failure");
        },
    });

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.passwordSetupEmailRequested, false);
    assert.equal(res.body.recoverable, true);
    assert.equal(
        res.body.message,
        "La cuenta fue creada, pero no se pudo solicitar el correo de establecimiento de contrasena.",
    );
});

test("responde 201 recuperable y no solicita correo si falla la asignacion RBAC", async () => {
    let emailRequested = false;
    const res = await executeHandler({
        createUser: async () => ({
            userId: "auth0|created-user",
            roleAssignmentCompleted: false,
        }),
        requestPasswordEmail: async () => {
            emailRequested = true;
        },
    });

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.roleAssignmentCompleted, false);
    assert.equal(res.body.passwordSetupEmailRequested, false);
    assert.equal(res.body.recoverable, true);
    assert.equal(emailRequested, false);
});

test("responde 400 para payload incompleto, correo invalido, rol no permitido o campo extra", async () => {
    const invalidBodies = [
        {},
        { correoUsuario: VALID_BODY.correoUsuario },
        { rolUsuario: VALID_BODY.rolUsuario },
        { ...VALID_BODY, correoUsuario: " " },
        { ...VALID_BODY, correoUsuario: "no-es-correo" },
        { ...VALID_BODY, rolUsuario: "Supervisor" },
        { ...VALID_BODY, primerNombre: " " },
        { ...VALID_BODY, apellidoPaterno: " " },
        { ...VALID_BODY, password: "prohibida" },
    ];
    let calls = 0;

    for (const body of invalidBodies) {
        const res = await executeHandler({
            body,
            createUser: async () => {
                calls += 1;
            },
        });

        assert.equal(res.statusCode, 400);
    }

    assert.equal(calls, 0);
});

test("responde 409 para correo ya registrado en Auth0", async () => {
    const res = await executeHandler({
        createUser: async () => {
            throw new Auth0ServiceError(
                "USER_EMAIL_ALREADY_EXISTS",
                "mensaje interno Auth0",
            );
        },
    });

    assert.equal(res.statusCode, 409);
    assert.deepEqual(res.body, {
        message: "Ya existe un usuario con ese correo.",
    });
});

test("responde 500 generico sin exponer fallos internos de Auth0", async () => {
    const res = await executeHandler({
        createUser: async () => {
            throw new Auth0ServiceError(
                "AUTH0_LIST_ROLES_FAILED",
                "detalle privado del tenant",
            );
        },
    });

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { message: "No fue posible crear el usuario." });
    assert.equal(JSON.stringify(res.body).includes("tenant"), false);
});

test("monta autenticacion y autorizacion antes de crear el usuario", async (t) => {
    const calls = [];
    const app = express();
    app.use(express.json());
    app.use(
        "/api/admin",
        createAdminUsersRouter({
            authenticate(req, res, next) {
                calls.push("checkJwt");
                next();
            },
            authorize(req, res, next) {
                calls.push("requireAdministrador");
                next();
            },
            createUser: async () => {
                calls.push("createUser");
                return {
                    userId: "auth0|created-user",
                    roleAssignmentCompleted: true,
                };
            },
            requestPasswordEmail: async () => {
                calls.push("requestPasswordEmail");
            },
        }),
    );
    const server = app.listen(0);
    t.after(() => server.close());
    await once(server, "listening");

    const response = await fetch(
        `http://127.0.0.1:${server.address().port}/api/admin/users`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(VALID_BODY),
        },
    );

    assert.equal(response.status, 201);
    assert.deepEqual(calls, [
        "checkJwt",
        "requireAdministrador",
        "createUser",
        "requestPasswordEmail",
    ]);
});

test("monta autenticacion y autorizacion antes de reenviar correo", async (t) => {
    const calls = [];
    const app = express();
    app.use(express.json());
    app.use(
        "/api/admin",
        createAdminUsersRouter({
            authenticate(req, res, next) {
                calls.push("checkJwt");
                next();
            },
            authorize(req, res, next) {
                calls.push("requireAdministrador");
                next();
            },
            requestPasswordEmail: async () => {
                calls.push("requestPasswordEmail");
            },
        }),
    );
    const server = app.listen(0);
    t.after(() => server.close());
    await once(server, "listening");

    const response = await fetch(
        `http://127.0.0.1:${server.address().port}/api/admin/users/password-setup-email`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(VALID_PASSWORD_EMAIL_BODY),
        },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(calls, [
        "checkJwt",
        "requireAdministrador",
        "requestPasswordEmail",
    ]);
});
