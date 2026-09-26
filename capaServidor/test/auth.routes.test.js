import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import {
    Auth0ServiceError,
} from "../src/modules/users/service/auth0Management.service.js";
import {
    createVerifyAuthSessionHandler,
    createPasswordResetRequestHandler,
} from "../src/modules/auth/controller/auth.controller.js";
import {
    createAuthRouter,
    createPasswordResetRateLimit,
} from "../src/modules/auth/routes/auth.routes.js";

const VALID_PAYLOAD = {
    sub: "auth0|user-id",
    "https://itecsa.local/email": "usuario.controlado@example.cl",
    "https://itecsa.local/roles": ["Operario Ventas"],
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

async function executeVerify(payload) {
    const res = responseRecorder();
    const handler = createVerifyAuthSessionHandler({
        users: createUsersRepositoryMock(),
        logger: {},
    });

    await handler({ auth: { payload } }, res);

    return res;
}

function createUsersRepositoryMock({
    user = null,
    auth0User = null,
    onFindByEmail,
    onFindByAuth0Id,
    onUpdateRoleByAuth0Id,
} = {}) {
    return {
        async findByEmail(email) {
            await onFindByEmail?.(email);
            return user;
        },
        async findByAuth0Id(auth0UserId) {
            await onFindByAuth0Id?.(auth0UserId);
            return auth0User;
        },
        async updateRoleByAuth0Id(auth0UserId, rolUsuario) {
            await onUpdateRoleByAuth0Id?.(auth0UserId, rolUsuario);
            return {
                ...(auth0User ?? {}),
                idAuth0: auth0UserId,
                rolUsuario,
            };
        },
    };
}

async function executePasswordReset({
    body = { email: "usuario@example.cl" },
    users = createUsersRepositoryMock(),
    requestPasswordEmail = async () => ({ requested: true }),
} = {}) {
    const res = responseRecorder();
    const handler = createPasswordResetRequestHandler({
        users,
        requestPasswordEmail,
        logger: {},
    });

    await handler({ body }, res);

    return res;
}

test("devuelve permisos Auth0 en la verificacion de sesion", async () => {
    const res = await executeVerify({
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
        rolUsuario: "Operario Ventas",
        isAdministrador: false,
        permissions: ["view:orders-module", "view:kanban-module"],
        pinStatus: "active",
    });
});

test("devuelve permisos vacios si Auth0 no incluye permissions", async () => {
    const res = await executeVerify(VALID_PAYLOAD);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.permissions, []);
});

test("acepta Soporte como rol oficial sin identificarlo como Administrador Produccion", async () => {
    const res = await executeVerify({
        ...VALID_PAYLOAD,
        "https://itecsa.local/roles": ["Soporte"],
        permissions: ["manage:users-visually", "view:kanban-module"],
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.rolUsuario, "Soporte");
    assert.equal(res.body.isAdministrador, false);
    assert.deepEqual(res.body.permissions, [
        "manage:users-visually",
        "view:kanban-module",
    ]);
});

test("no sobrescribe el rol interno desde un token", async () => {
    let receivedLookup;
    let receivedUpdate;
    const handler = createVerifyAuthSessionHandler({
        users: createUsersRepositoryMock({
            auth0User: {
                idAuth0: VALID_PAYLOAD.sub,
                rolUsuario: "Operario Cobranzas",
            },
            onFindByAuth0Id(auth0UserId) {
                receivedLookup = auth0UserId;
            },
            onUpdateRoleByAuth0Id(auth0UserId, rolUsuario) {
                receivedUpdate = { auth0UserId, rolUsuario };
            },
        }),
        logger: {},
    });
    const res = responseRecorder();

    await handler(
        {
            auth: {
                payload: {
                    ...VALID_PAYLOAD,
                    "https://itecsa.local/roles": ["Administrador Produccion"],
                },
            },
        },
        res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.rolUsuario, "Administrador Produccion");
    assert.equal(res.body.isAdministrador, true);
    assert.equal(receivedLookup, undefined);
    assert.equal(receivedUpdate, undefined);
});

test("no actualiza el rol interno si ya coincide con Auth0", async () => {
    let updateCalls = 0;
    const handler = createVerifyAuthSessionHandler({
        users: createUsersRepositoryMock({
            auth0User: {
                idAuth0: VALID_PAYLOAD.sub,
                rolUsuario: "Operario Ventas",
            },
            onUpdateRoleByAuth0Id() {
                updateCalls += 1;
            },
        }),
        logger: {},
    });
    const res = responseRecorder();

    await handler({ auth: { payload: VALID_PAYLOAD } }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(updateCalls, 0);
});


test("rechaza permissions malformado", async () => {
    const res = await executeVerify({
        ...VALID_PAYLOAD,
        permissions: "view:orders-module",
    });

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, {
        message: "La sesion autenticada no tiene un rol valido para ITECSA.",
    });
});

test("rechaza solicitud de recuperacion con email invalido", async () => {
    let calls = 0;
    const invalidBodies = [
        null,
        [],
        {},
        { email: "" },
        { email: "correo-invalido" },
        { email: "usuario@example.cl", extra: "campo" },
    ];

    for (const body of invalidBodies) {
        const res = await executePasswordReset({
            body,
            requestPasswordEmail: async () => {
                calls += 1;
            },
        });

        assert.equal(res.statusCode, 400);
    }

    assert.equal(calls, 0);
});

test("cuentas activas, inexistentes y desvinculadas reciben la misma respuesta publica", async () => {
    const publicResponses = [];
    let auth0Calls = 0;
    const accounts = [
        {
            name: "active",
            users: createUsersRepositoryMock({
                user: {
                    correoUsuario: "usuario@example.cl",
                    estadoUsuario: "Activo",
                },
            }),
            shouldSend: true,
        },
        {
            name: "missing",
            users: createUsersRepositoryMock(),
            shouldSend: false,
        },
        {
            name: "disabled",
            users: createUsersRepositoryMock({
                user: {
                    correoUsuario: "usuario@example.cl",
                    estadoUsuario: "Desvinculado",
                },
            }),
            shouldSend: false,
        },
    ];

    for (const account of accounts) {
        const res = await executePasswordReset({
            users: account.users,
            requestPasswordEmail: async ({ email }) => {
                auth0Calls += 1;
                assert.equal(account.shouldSend, true, `${account.name} must not send`);
                assert.equal(email, "usuario@example.cl");
            },
            logger: {},
        });
        publicResponses.push({ status: res.statusCode, body: res.body });
    }

    assert.deepEqual(publicResponses, [
        {
            status: 200,
            body: {
                status: "accepted",
                message:
                    "Si existe una cuenta habilitada asociada a este correo, recibirás instrucciones para restablecer tu contraseña.",
            },
        },
        publicResponses[0],
        publicResponses[0],
    ]);
    assert.equal(auth0Calls, 1);
    assert.equal(JSON.stringify(publicResponses).includes("not_registered"), false);
    assert.equal(JSON.stringify(publicResponses).includes("disabled"), false);
    assert.equal(JSON.stringify(publicResponses).includes("user_exists"), false);
});

test("no elegibles se determinan internamente sin invocar Auth0", async () => {
    let auth0Calls = 0;
    for (const user of [
        null,
        { correoUsuario: "usuario@example.cl", estadoUsuario: "Desvinculado" },
        { correoUsuario: "usuario@example.cl", estadoUsuario: "Pendiente rol" },
    ]) {
        const res = await executePasswordReset({
            users: createUsersRepositoryMock({ user }),
            requestPasswordEmail: async () => {
                auth0Calls += 1;
            },
            logger: {},
        });
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.status, "accepted");
    }
    assert.equal(auth0Calls, 0);
});

test("un error Auth0 no revela si la cuenta existe", async () => {
    const loggerCalls = [];
    const res = await executePasswordReset({
        users: createUsersRepositoryMock({
            user: {
                correoUsuario: "usuario@example.cl",
                estadoUsuario: "Activo",
            },
        }),
        requestPasswordEmail: async () => {
            throw new Auth0ServiceError(
                "AUTH0_PASSWORD_EMAIL_FAILED",
                "detalle interno",
            );
        },
        logger: {
            error: (...args) => loggerCalls.push(args),
        },
    });

<<<<<<< HEAD
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.code, "INTERNAL_ERROR");
    assert.equal(res.body.message, "Ocurrio un error interno.");
    assert.match(res.body.requestId, /^[0-9a-f-]{36}$/);
=======
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, "accepted");
    assert.equal(JSON.stringify(loggerCalls).includes("usuario@example.cl"), false);
    assert.equal(JSON.stringify(loggerCalls).includes("detalle interno"), false);
>>>>>>> 98444449 (Se solucionan los hallazgos H03, H04 y H05)
});

test("monta recuperacion de contrasena como ruta publica sin checkJwt", async (t) => {
    let authCalls = 0;
    let emailRequested = false;
    const app = express();
    app.use(express.json());
    app.use(
        "/api/auth",
        createAuthRouter({
            authenticate(req, res, next) {
                authCalls += 1;
                next();
            },
            passwordResetRateLimit(req, res, next) {
                next();
            },
            users: createUsersRepositoryMock({
                user: {
                    correoUsuario: "usuario@example.cl",
                    estadoUsuario: "Activo",
                },
            }),
            requestPasswordEmail: async () => {
                emailRequested = true;
            },
            logger: {},
        }),
    );
    const server = app.listen(0);
    t.after(() => server.close());
    await once(server, "listening");

    const response = await fetch(
        `http://127.0.0.1:${server.address().port}/api/auth/password-reset/request`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "usuario@example.cl" }),
        },
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, {
        status: "accepted",
        message:
            "Si existe una cuenta habilitada asociada a este correo, recibirás instrucciones para restablecer tu contraseña.",
    });
    assert.equal(authCalls, 0);
    assert.equal(emailRequested, true);
});

test("limita intentos repetidos de recuperacion", async (t) => {
    const app = express();
    app.use(express.json());
    app.use(
        "/api/auth",
        createAuthRouter({
            passwordResetRateLimit: createPasswordResetRateLimit({
                attempts: new Map(),
                maxAttemptsPerIp: 2,
                maxAttemptsPerEmail: 5,
                now: () => 100,
            }),
            users: createUsersRepositoryMock(),
            requestPasswordEmail: async () => {},
            logger: {},
        }),
    );
    const server = app.listen(0);
    t.after(() => server.close());
    await once(server, "listening");

    const url = `http://127.0.0.1:${server.address().port}/api/auth/password-reset/request`;
    const request = () =>
        fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "usuario@example.cl" }),
        });

    assert.equal((await request()).status, 200);
    assert.equal((await request()).status, 200);
    const limitedResponse = await request();
    const body = await limitedResponse.json();

    assert.equal(limitedResponse.status, 429);
    assert.deepEqual(body, {
        message:
            "Demasiados intentos de recuperación. Intenta nuevamente más tarde.",
    });
});

for (const role of ["Administrador Produccion", "Operario Produccion", "Operario Ventas", "Operario Cobranzas", "Gerencia", "Soporte"]) {
    test(`verifica el rol oficial ${role}`, async () => {
        const res = await executeVerify({ ...VALID_PAYLOAD, "https://itecsa.local/roles": [role] });
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.rolUsuario, role);
        assert.equal(res.body.isAdministrador, role === "Administrador Produccion");
    });
}
for (const role of ["Administrador Producción", "Operario Producción", "Administrador", "Producción", "Ventas", "Cobranzas", "Administración Cobranzas"]) {
    test(`rechaza en sesión el rol no vigente ${role}`, async () => {
        const res = await executeVerify({ ...VALID_PAYLOAD, "https://itecsa.local/roles": [role] });
        assert.equal(res.statusCode, 403);
    });
}
