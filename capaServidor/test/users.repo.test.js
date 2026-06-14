import assert from "node:assert/strict";
import { test } from "node:test";
import {
    UserRepository,
    UserRepositoryError,
} from "../src/modules/users/repo/users.repo.js";

const DATABASE_USER = {
    id_usuario: 7,
    id_auth0: "auth0|user-id",
    correo_usuario: "usuario@example.cl",
    rut_usuario: "12.345.678-9",
    nombre_usuario: "Dana",
    apellido_usuario: "Gadansky",
    rol_usuario: "Administrador",
    estado_usuario: "Activo",
    ruta_firma: "data/Firmas/firma.png",
};

test("updateRoleByAuth0Id actualiza solo el rol del usuario interno", async () => {
    let receivedUpdate;
    const repository = new UserRepository({
        prisma: {
            usuario: {
                async update(payload) {
                    receivedUpdate = payload;
                    return DATABASE_USER;
                },
            },
        },
    });

    const user = await repository.updateRoleByAuth0Id(
        "auth0|user-id",
        "Administrador",
    );

    assert.deepEqual(receivedUpdate, {
        where: { id_auth0: "auth0|user-id" },
        data: { rol_usuario: "Administrador" },
    });
    assert.equal(user.idAuth0, "auth0|user-id");
    assert.equal(user.rolUsuario, "Administrador");
});

test("updateRoleByAuth0Id normaliza usuario inexistente", async () => {
    const repository = new UserRepository({
        prisma: {
            usuario: {
                async update() {
                    const error = new Error("Record not found");
                    error.code = "P2025";
                    throw error;
                },
            },
        },
    });

    await assert.rejects(
        repository.updateRoleByAuth0Id("auth0|missing-user", "Administrador"),
        (error) =>
            error instanceof UserRepositoryError &&
            error.code === "USER_NOT_FOUND",
    );
});
