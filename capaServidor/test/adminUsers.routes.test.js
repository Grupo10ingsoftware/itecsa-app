import { manageableRoles, ROLES } from "../../shared/authorization.js";
import { invoke, payloadFor } from "./authorization.fixture.js";
import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import { Auth0ServiceError } from "../src/modules/users/service/auth0Management.service.js";
import {
    createAdminUserHandler,
    createAdminUsersSummaryHandler,
    createListAdminUsersHandler,
    createPasswordSetupEmailHandler,
    createUpdateAdminUserHandler,
    createUpdateAdminUserStatusHandler,
} from "../src/modules/users/controller/adminUsers.controller.js";
import { createAdminUsersRouter } from "../src/modules/users/routes/adminUsers.routes.js";

const VALID_BODY = {
    nombreUsuario: "Ana",
    apellidoUsuario: "Perez",
    rutUsuario: "12.345.678-9",
    correoUsuario: "ana.perez@itecsa.cl",
    rolUsuario: "Operario Ventas",
};
const VALID_PASSWORD_EMAIL_BODY = {
    correoUsuario: "ana.perez@itecsa.cl",
};
const DEFAULT_INTERNAL_USER = {
    idUsuario: 10,
    idAuth0: "auth0|created-user",
    correoUsuario: VALID_BODY.correoUsuario,
    rutUsuario: VALID_BODY.rutUsuario,
    nombreUsuario: VALID_BODY.nombreUsuario,
    apellidoUsuario: VALID_BODY.apellidoUsuario,
    rolUsuario: VALID_BODY.rolUsuario,
    estadoUsuario: "Activo",
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

function createUsersRepositoryMock({
    existingUser = null,
    existingUserByAuth0Id = DEFAULT_INTERNAL_USER,
    createdUser = DEFAULT_INTERNAL_USER,
    listResult = {
        usuarios: [DEFAULT_INTERNAL_USER],
        total: 1,
        page: 1,
        perPage: 10,
    },
    summaryResult = {
        totalUsuarios: 1,
        vinculados: 1,
        desvinculados: 0,
    },
    onFindByEmail,
    onFindByAuth0Id,
    onList,
    onGetSummary,
    onCreate,
    onUpdateByAuth0Id,
    onUpdateStatusByAuth0Id,
} = {}) {
    return {
        async findByEmail(correoUsuario) {
            await onFindByEmail?.(correoUsuario);
            return existingUser;
        },
        async findByAuth0Id(userId) {
            await onFindByAuth0Id?.(userId);
            return existingUserByAuth0Id;
        },
        async list(filters) {
            await onList?.(filters);
            return listResult;
        },
        async getSummary() {
            await onGetSummary?.();
            return summaryResult;
        },
        async create(payload) {
            await onCreate?.(payload);
            return createdUser;
        },
        async updateByAuth0Id(userId, payload) {
            await onUpdateByAuth0Id?.(userId, payload);
            return {
                ...DEFAULT_INTERNAL_USER,
                idAuth0: userId,
                ...payload,
            };
        },
        async updateStatusByAuth0Id(userId, estadoUsuario) {
            await onUpdateStatusByAuth0Id?.(userId, estadoUsuario);
            return {
                ...DEFAULT_INTERNAL_USER,
                idAuth0: userId,
                estadoUsuario,
            };
        },
    };
}

async function executeHandler({
    body = VALID_BODY,
    createUser,
    requestPasswordEmail,
    users = createUsersRepositoryMock(),
}) {
    const res = responseRecorder();
    const handler = createAdminUserHandler({
        createUser,
        requestPasswordEmail,
        users,
    });

    await invoke(handler, { body }, res);

    return res;
}

async function executePasswordEmailHandler({
    body = VALID_PASSWORD_EMAIL_BODY,
    requestPasswordEmail,
}) {
    const res = responseRecorder();
    const handler = createPasswordSetupEmailHandler({ requestPasswordEmail, users: createUsersRepositoryMock({existingUser: DEFAULT_INTERNAL_USER}) });

    await invoke(handler, { body }, res);

    return res;
}

async function executeListHandler({ query = {}, users = createUsersRepositoryMock() } = {}) {
    const res = responseRecorder();
    const handler = createListAdminUsersHandler({ users });

    await invoke(handler, { query }, res);

    return res;
}

async function executeSummaryHandler({ users = createUsersRepositoryMock() } = {}) {
    const res = responseRecorder();
    const handler = createAdminUsersSummaryHandler({ users });

    await invoke(handler, {}, res);

    return res;
}

async function executeUpdateHandler({
    body = {
        nombreUsuario: "Ana Maria",
        apellidoUsuario: "Perez",
        correoUsuario: "ana.maria@itecsa.cl",
        rolUsuario: "Gerencia",
    },
    params = { userId: "auth0|created-user" },
    updateUser,
    users = createUsersRepositoryMock(),
} = {}) {
    const res = responseRecorder();
    const handler = createUpdateAdminUserHandler({ updateUser, users });

    await invoke(handler, { auth: { payload: {} }, body, params }, res);

    return res;
}

async function executeStatusHandler({
    body = { estadoUsuario: "Desvinculado" },
    params = { userId: "auth0|created-user" },
    updateStatus,
    users = createUsersRepositoryMock(),
} = {}) {
    const res = responseRecorder();
    const handler = createUpdateAdminUserStatusHandler({ updateStatus, users });

    await invoke(handler, { auth: { payload: {} }, body, params }, res);

    return res;
}

test("responde 200 con listado interno y filtros normalizados", async () => {
    let receivedFilters;
    const res = await executeListHandler({
        query: {
            page: "2",
            perPage: "20",
            search: "  ana  ",
            estadoUsuario: "Vinculado",
            rolUsuario: "Gerencia",
        },
        users: createUsersRepositoryMock({
            listResult: {
                usuarios: [DEFAULT_INTERNAL_USER],
                total: 1,
                page: 2,
                perPage: 20,
            },
            onList: (filters) => {
                receivedFilters = filters;
            },
        }),
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(receivedFilters, {
        page: 2,
        perPage: 20,
        search: "ana",
        estadoUsuario: "Vinculado",
        rolUsuario: "Gerencia",
        allowedRoles: manageableRoles(ROLES.SOPORTE),
    });
    assert.deepEqual(res.body.usuarios[0], {
        idUsuario: DEFAULT_INTERNAL_USER.idUsuario,
        idUsuarioAutenticacionExterna: DEFAULT_INTERNAL_USER.idAuth0,
        nombreUsuario: DEFAULT_INTERNAL_USER.nombreUsuario,
        apellidoUsuario: DEFAULT_INTERNAL_USER.apellidoUsuario,
        nombreCompleto: "Ana Perez",
        rutUsuario: DEFAULT_INTERNAL_USER.rutUsuario,
        correoUsuario: DEFAULT_INTERNAL_USER.correoUsuario,
        rolUsuario: DEFAULT_INTERNAL_USER.rolUsuario,
        estadoUsuario: DEFAULT_INTERNAL_USER.estadoUsuario,
    });
});

test("rechaza filtros de listado no oficiales", async () => {
    let calls = 0;
    const res = await executeListHandler({
        query: { rolUsuario: "Supervisor" },
        users: createUsersRepositoryMock({
            onList: () => {
                calls += 1;
            },
        }),
    });

    assert.equal(res.statusCode, 400);
    assert.equal(calls, 0);
});

test("responde 200 con resumen interno de usuarios", async () => {
    const summaryResult = {
        totalUsuarios: 12,
        vinculados: 10,
        desvinculados: 2,
    };
    const res = await executeSummaryHandler({
        users: createUsersRepositoryMock({ summaryResult }),
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, summaryResult);
});

test("actualiza usuario en Auth0 y tabla interna con contrato final", async () => {
    let externalPayload;
    let internalPayload;
    const res = await executeUpdateHandler({
        updateUser: async (payload) => {
            externalPayload = payload;
        },
        users: createUsersRepositoryMock({
            onUpdateByAuth0Id: (userId, payload) => {
                internalPayload = { userId, payload };
            },
        }),
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(externalPayload, {
        userId: "auth0|created-user",
        correoUsuario: "ana.maria@itecsa.cl",
        rolUsuario: "Gerencia",
    });
    assert.deepEqual(internalPayload, {
        userId: "auth0|created-user",
        payload: {
            nombreUsuario: "Ana Maria",
            apellidoUsuario: "Perez",
            correoUsuario: "ana.maria@itecsa.cl",
            rolUsuario: "Gerencia",
        },
    });
    assert.equal(res.body.nombreUsuario, "Ana Maria");
    assert.equal(res.body.estadoUsuario, "Activo");
});

test("rechaza actualizacion con campos legacy", async () => {
    let calls = 0;
    const res = await executeUpdateHandler({
        body: {
            primerNombre: "Ana",
            apellidoPaterno: "Perez",
            correoUsuario: "ana@itecsa.cl",
            rolUsuario: "Operario Ventas",
        },
        updateUser: async () => {
            calls += 1;
        },
    });

    assert.equal(res.statusCode, 400);
    assert.equal(calls, 0);
});

test("desvincula usuario actualizando Auth0 y tabla interna", async () => {
    let externalPayload;
    let internalPayload;
    const res = await executeStatusHandler({
        updateStatus: async (payload) => {
            externalPayload = payload;
        },
        users: createUsersRepositoryMock({
            onUpdateStatusByAuth0Id: (userId, estadoUsuario) => {
                internalPayload = { userId, estadoUsuario };
            },
        }),
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(externalPayload, {
        userId: "auth0|created-user",
        estadoUsuario: "Desvinculado",
    });
    assert.deepEqual(internalPayload, {
        userId: "auth0|created-user",
        estadoUsuario: "Desvinculado",
    });
    assert.equal(res.body.estadoUsuario, "Desvinculado");
});

test("rechaza autodesvinculacion por endpoint de estado", async () => {
    let externalCalls = 0;
    let internalCalls = 0;
    const handler = createUpdateAdminUserStatusHandler({
        updateStatus: async () => {
            externalCalls += 1;
        },
        users: createUsersRepositoryMock({
            onUpdateStatusByAuth0Id: () => {
                internalCalls += 1;
            },
        }),
    });
    const selfRes = responseRecorder();
    await invoke(handler,
        {
            auth: { payload: { sub: "auth0|created-user" } },
            body: { estadoUsuario: "Desvinculado" },
            params: { userId: "auth0|created-user" },
        },
        selfRes,
    );

    assert.equal(selfRes.statusCode, 409);
    assert.deepEqual(selfRes.body, {
        message: "No puedes desvincular tu propio usuario.",
    });
    assert.equal(externalCalls, 0);
    assert.equal(internalCalls, 0);
});

test("rechaza cambio de estado desde edicion completa", async () => {
    let externalCalls = 0;
    let internalCalls = 0;
    const handler = createUpdateAdminUserHandler({
        updateUser: async () => {
            externalCalls += 1;
        },
        users: createUsersRepositoryMock({
            onUpdateByAuth0Id: () => {
                internalCalls += 1;
            },
        }),
    });
    const selfRes = responseRecorder();
    await invoke(handler,
        {
            auth: { payload: { sub: "auth0|created-user" } },
            body: {
                nombreUsuario: "Ana Maria",
                apellidoUsuario: "Perez",
                correoUsuario: "ana.maria@itecsa.cl",
                rolUsuario: "Administrador Produccion",
                estadoUsuario: "Desvinculado",
            },
            params: { userId: "auth0|created-user" },
        },
        selfRes,
    );

    assert.equal(selfRes.statusCode, 400);
    assert.equal(externalCalls, 0);
    assert.equal(internalCalls, 0);
});

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
        idUsuario: DEFAULT_INTERNAL_USER.idUsuario,
        idUsuarioAutenticacionExterna: "auth0|created-user",
        nombreUsuario: VALID_BODY.nombreUsuario,
        apellidoUsuario: VALID_BODY.apellidoUsuario,
        rutUsuario: VALID_BODY.rutUsuario,
        correoUsuario: VALID_BODY.correoUsuario,
        rolUsuario: VALID_BODY.rolUsuario,
        passwordSetupEmailRequested: true,
    });
    assert.deepEqual(createUserPayload, {
        email: VALID_BODY.correoUsuario,
        rolUsuario: VALID_BODY.rolUsuario,
    });
});

test("persiste el usuario interno activo antes de solicitar correo", async () => {
    let persistedPayload;
    let emailRequested = false;

    const res = await executeHandler({
        createUser: async () => ({
            userId: "auth0|created-user",
            roleAssignmentCompleted: true,
        }),
        requestPasswordEmail: async () => {
            emailRequested = true;
        },
        users: createUsersRepositoryMock({
            onCreate: (payload) => {
                persistedPayload = payload;
            },
        }),
    });

    assert.equal(res.statusCode, 201);
    assert.equal(emailRequested, true);
    assert.deepEqual(persistedPayload, {
        auth0UserId: "auth0|created-user",
        correoUsuario: VALID_BODY.correoUsuario,
        rutUsuario: VALID_BODY.rutUsuario,
        nombreUsuario: VALID_BODY.nombreUsuario,
        apellidoUsuario: VALID_BODY.apellidoUsuario,
        rolUsuario: VALID_BODY.rolUsuario,
        estadoUsuario: "Activo",
    });
});

test("crea usuario sin firma electronica", async () => {
    let auth0Called = false;
    let persistedPayload;

    const res = await executeHandler({
        createUser: async () => {
            auth0Called = true;
            return {
                userId: "auth0|created-user",
                roleAssignmentCompleted: true,
            };
        },
        requestPasswordEmail: async () => {},
        users: createUsersRepositoryMock({
            onCreate: (payload) => {
                persistedPayload = payload;
            },
        }),
    });

    assert.equal(res.statusCode, 201);
    assert.equal(auth0Called, true);
    assert.equal("rutaFirma" in persistedPayload, false);
});

test("responde 409 si el correo ya existe internamente sin llamar Auth0", async () => {
    let auth0Called = false;

    const res = await executeHandler({
        createUser: async () => {
            auth0Called = true;
        },
        users: createUsersRepositoryMock({
            existingUser: DEFAULT_INTERNAL_USER,
        }),
    });

    assert.equal(res.statusCode, 409);
    assert.deepEqual(res.body, {
        message: "Ya existe un usuario con ese correo.",
    });
    assert.equal(auth0Called, false);
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
    assert.equal(res.body.idUsuario, DEFAULT_INTERNAL_USER.idUsuario);
    assert.equal(res.body.passwordSetupEmailRequested, false);
    assert.equal(res.body.recoverable, true);
    assert.equal(
        res.body.message,
        "La cuenta fue creada, pero no se pudo solicitar el correo de establecimiento de contrasena.",
    );
});

test("responde 201 recuperable y no solicita correo si falla la asignacion RBAC", async () => {
    let emailRequested = false;
    let persistedPayload;
    const res = await executeHandler({
        createUser: async () => ({
            userId: "auth0|created-user",
            roleAssignmentCompleted: false,
        }),
        requestPasswordEmail: async () => {
            emailRequested = true;
        },
        users: createUsersRepositoryMock({
            createdUser: {
                ...DEFAULT_INTERNAL_USER,
                estadoUsuario: "Pendiente rol",
            },
            onCreate: (payload) => {
                persistedPayload = payload;
            },
        }),
    });

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.idUsuario, DEFAULT_INTERNAL_USER.idUsuario);
    assert.equal(res.body.roleAssignmentCompleted, false);
    assert.equal(res.body.passwordSetupEmailRequested, false);
    assert.equal(res.body.recoverable, true);
    assert.equal(emailRequested, false);
    assert.equal(persistedPayload.estadoUsuario, "Pendiente rol");
});

test("responde 201 recuperable si falla la persistencia interna tras crear Auth0", async () => {
    let emailRequested = false;

    const res = await executeHandler({
        createUser: async () => ({
            userId: "auth0|created-user",
            roleAssignmentCompleted: true,
        }),
        requestPasswordEmail: async () => {
            emailRequested = true;
        },
        users: createUsersRepositoryMock({
            onCreate: () => {
                throw new Error("database failure");
            },
        }),
    });

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.idUsuario, undefined);
    assert.equal(res.body.passwordSetupEmailRequested, false);
    assert.equal(res.body.recoverable, true);
    assert.equal(emailRequested, false);
    assert.equal(
        res.body.message,
        "La cuenta fue creada, pero no se pudo registrar el usuario interno. No se solicito el correo de establecimiento de contrasena.",
    );
});

test("responde 400 para payload incompleto, correo invalido, rol no permitido o campo extra", async () => {
    const invalidBodies = [
        {},
        { correoUsuario: VALID_BODY.correoUsuario },
        { rolUsuario: VALID_BODY.rolUsuario },
        { ...VALID_BODY, nombreUsuario: " " },
        { ...VALID_BODY, apellidoUsuario: " " },
        { ...VALID_BODY, rutUsuario: " " },
        { ...VALID_BODY, correoUsuario: " " },
        { ...VALID_BODY, correoUsuario: "no-es-correo" },
        { ...VALID_BODY, rutUsuario: "123" },
        { ...VALID_BODY, nombreUsuario: "Ana 123" },
        { ...VALID_BODY, apellidoUsuario: "Perez 123" },
        { ...VALID_BODY, rolUsuario: "Supervisor" },
        { ...VALID_BODY, primerNombre: "Ana" },
        { ...VALID_BODY, apellidoPaterno: "Perez" },
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
                req.auth={payload:payloadFor()};
                calls.push("checkJwt");
                next();
            },
            authorize(req, res, next) {
                calls.push("requireAdministrativeRole");
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
            users: createUsersRepositoryMock({
                onCreate: () => {
                    calls.push("createInternalUser");
                },
            }),
            pins: {
                provisionByUserId: async () => "pending_acknowledgement",
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
        "requireAdministrativeRole",
        "createUser",
        "createInternalUser",
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
            users: createUsersRepositoryMock({existingUser: DEFAULT_INTERNAL_USER}),
            authenticate(req, res, next) {
                req.auth={payload:payloadFor()};
                calls.push("checkJwt");
                next();
            },
            authorize(req, res, next) {
                calls.push("requireAdministrativeRole");
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
        "requireAdministrativeRole",
        "requestPasswordEmail",
    ]);
});
