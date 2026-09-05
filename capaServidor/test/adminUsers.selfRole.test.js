import assert from "node:assert/strict";
import { test } from "node:test";
import { createUpdateAdminUserHandler } from "../src/modules/users/controller/adminUsers.controller.js";

const CURRENT_ADMIN_ID = "auth0|current-admin";
const CURRENT_ADMIN_USER = {
    idUsuario: 10,
    idAuth0: CURRENT_ADMIN_ID,
    correoUsuario: "ana.perez@itecsa.cl",
    rutUsuario: "12.345.678-9",
    nombreUsuario: "Ana",
    apellidoUsuario: "Perez",
    rolUsuario: "Administrador Produccion",
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
    existingUserByAuth0Id = CURRENT_ADMIN_USER,
    onUpdateByAuth0Id,
} = {}) {
    return {
        async findByAuth0Id() {
            return existingUserByAuth0Id;
        },
        async updateByAuth0Id(userId, payload) {
            await onUpdateByAuth0Id?.(userId, payload);
            return {
                ...CURRENT_ADMIN_USER,
                idAuth0: userId,
                ...payload,
            };
        },
    };
}

test("rechaza que un administrador edite su propio rol", async () => {
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
    const res = responseRecorder();

    await handler(
        {
            auth: { payload: { sub: CURRENT_ADMIN_ID } },
            params: { userId: CURRENT_ADMIN_ID },
            body: {
                nombreUsuario: "Ana",
                apellidoUsuario: "Perez",
                correoUsuario: "ana.perez@itecsa.cl",
                rolUsuario: "Operario Ventas",
            },
        },
        res,
    );

    assert.equal(res.statusCode, 409);
    assert.deepEqual(res.body, {
        message: "No puedes cambiar tu propio rol.",
    });
    assert.equal(externalCalls, 0);
    assert.equal(internalCalls, 0);
});

test("rechaza que un usuario de Soporte edite su propio rol", async () => {
    const supportUser = {
        ...CURRENT_ADMIN_USER,
        rolUsuario: "Soporte",
    };
    const handler = createUpdateAdminUserHandler({
        updateUser: async () => assert.fail("No debe actualizar Auth0"),
        users: createUsersRepositoryMock({ existingUserByAuth0Id: supportUser }),
    });
    const res = responseRecorder();

    await handler(
        {
            auth: { payload: { sub: CURRENT_ADMIN_ID } },
            params: { userId: CURRENT_ADMIN_ID },
            body: {
                nombreUsuario: "Ana",
                apellidoUsuario: "Perez",
                correoUsuario: "ana.perez@itecsa.cl",
                rolUsuario: "Operario Ventas",
            },
        },
        res,
    );

    assert.equal(res.statusCode, 409);
    assert.deepEqual(res.body, {
        message: "No puedes cambiar tu propio rol.",
    });
});

test("permite que un administrador edite sus datos si conserva su rol", async () => {
    let externalPayload;
    let internalPayload;
    const handler = createUpdateAdminUserHandler({
        updateUser: async (payload) => {
            externalPayload = payload;
        },
        users: createUsersRepositoryMock({
            onUpdateByAuth0Id: (userId, payload) => {
                internalPayload = { userId, payload };
            },
        }),
    });
    const res = responseRecorder();

    await handler(
        {
            auth: { payload: { sub: CURRENT_ADMIN_ID } },
            params: { userId: CURRENT_ADMIN_ID },
            body: {
                nombreUsuario: "Ana Maria",
                apellidoUsuario: "Perez",
                correoUsuario: "ana.maria@itecsa.cl",
                rolUsuario: "Administrador Produccion",
            },
        },
        res,
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(externalPayload, {
        userId: CURRENT_ADMIN_ID,
        correoUsuario: "ana.maria@itecsa.cl",
        rolUsuario: "Administrador Produccion",
    });
    assert.deepEqual(internalPayload, {
        userId: CURRENT_ADMIN_ID,
        payload: {
            nombreUsuario: "Ana Maria",
            apellidoUsuario: "Perez",
            correoUsuario: "ana.maria@itecsa.cl",
            rolUsuario: "Administrador Produccion",
        },
    });
});
