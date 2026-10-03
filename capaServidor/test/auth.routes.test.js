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
import { MemoryThrottleService } from "../src/modules/security/service/securityThrottle.service.js";

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
        minimumDelayMs: 0,
        random: () => 0,
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

test("verificacion reutiliza los datos del usuario que ya valido el middleware", async () => {
    const handler = createVerifyAuthSessionHandler();
    const res = responseRecorder();
    await handler({
        auth: { payload: VALID_PAYLOAD },
        currentUser: {
            nombreUsuario: "Prueba",
            apellidoUsuario: "Sesion",
            rutUsuario: "11111111-1",
            estadoUsuario: "Activo",
        },
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.primerNombre, "Prueba");
    assert.equal(res.body.apellidoPaterno, "Sesion");
    assert.equal(res.body.rutUsuario, "11111111-1");
    assert.equal(res.body.estadoUsuario, "Activo");
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
    const handler = createVerifyAuthSessionHandler({
        users: createUsersRepositoryMock({
            auth0User: {
                idAuth0: VALID_PAYLOAD.sub,
                rolUsuario: "Operario Cobranzas",
            },
            onFindByAuth0Id(auth0UserId) {
                receivedLookup = auth0UserId;
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
});

test("no actualiza el rol interno si ya coincide con Auth0", async () => {
    const handler = createVerifyAuthSessionHandler({
        users: createUsersRepositoryMock({
            auth0User: {
                idAuth0: VALID_PAYLOAD.sub,
                rolUsuario: "Operario Ventas",
            },
        }),
        logger: {},
    });
    const res = responseRecorder();

    await handler({ auth: { payload: VALID_PAYLOAD } }, res);

    assert.equal(res.statusCode, 200);
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

test("responde no registrado sin llamar Auth0", async () => {
    let auth0Calls = 0;
    const res = await executePasswordReset({
        body: { email: "NO.REGISTRADO@EXAMPLE.CL" },
        users: createUsersRepositoryMock({
            onFindByEmail(email) {
                assert.equal(email, "no.registrado@example.cl");
            },
        }),
        requestPasswordEmail: async () => {
            auth0Calls += 1;
        },
    });

    assert.equal(res.statusCode, 202);
    assert.deepEqual(res.body, {
        status: "accepted",
        message: "Si la cuenta está activa, enviaremos las instrucciones de recuperación al correo indicado.",
    });
    assert.equal(auth0Calls, 0);
});

test("responde desactivado sin llamar Auth0 si el usuario esta desvinculado", async () => {
    let auth0Calls = 0;
    const res = await executePasswordReset({
        users: createUsersRepositoryMock({
            user: {
                correoUsuario: "usuario@example.cl",
                estadoUsuario: "Desvinculado",
            },
        }),
        requestPasswordEmail: async () => {
            auth0Calls += 1;
        },
    });

    assert.equal(res.statusCode, 202);
    assert.deepEqual(res.body, {
        status: "accepted",
        message: "Si la cuenta está activa, enviaremos las instrucciones de recuperación al correo indicado.",
    });
    assert.equal(auth0Calls, 0);
});

test("responde desactivado sin llamar Auth0 si el usuario no esta activo", async () => {
    let auth0Calls = 0;
    const res = await executePasswordReset({
        users: createUsersRepositoryMock({
            user: {
                correoUsuario: "usuario@example.cl",
                estadoUsuario: "Pendiente rol",
            },
        }),
        requestPasswordEmail: async () => {
            auth0Calls += 1;
        },
    });

    assert.equal(res.statusCode, 202);
    assert.equal(res.body.status, "accepted");
    assert.equal(auth0Calls, 0);
});

test("solicita correo Auth0 si el usuario esta activo", async () => {
    let requestedEmail;
    const res = await executePasswordReset({
        users: createUsersRepositoryMock({
            user: {
                correoUsuario: "usuario@example.cl",
                estadoUsuario: "Activo",
            },
        }),
        requestPasswordEmail: async ({ email }) => {
            requestedEmail = email;
            return { requested: true };
        },
    });

    assert.equal(res.statusCode, 202);
    assert.deepEqual(res.body, {
        status: "accepted",
        message: "Si la cuenta está activa, enviaremos las instrucciones de recuperación al correo indicado.",
    });
    assert.equal(requestedEmail, "usuario@example.cl");
});

test("mantiene respuesta uniforme si falla Auth0", async () => {
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
    });

    assert.equal(res.statusCode, 202);
    assert.deepEqual(res.body, {
        status: "accepted",
        message: "Si la cuenta está activa, enviaremos las instrucciones de recuperación al correo indicado.",
    });
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
            passwordResetMinimumDelayMs: 0,
            passwordResetRandom: () => 0,
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

    assert.equal(response.status, 202);
    assert.equal(body.status, "accepted");
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
                throttle: new MemoryThrottleService({ now: () => new Date(100) }),
            }),
            users: createUsersRepositoryMock(),
            requestPasswordEmail: async () => {},
            logger: {},
            passwordResetMinimumDelayMs: 0,
            passwordResetRandom: () => 0,
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

    assert.equal((await request()).status, 202);
    assert.equal((await request()).status, 202);
    assert.equal((await request()).status, 202);
    const limitedResponse = await request();
    const body = await limitedResponse.json();

    assert.equal(limitedResponse.status, 429);
    assert.equal(body.code, "RATE_LIMITED");
    assert.equal(limitedResponse.headers.get("retry-after"), "900");
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
