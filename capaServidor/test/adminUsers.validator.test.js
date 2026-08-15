import assert from "node:assert/strict";
import { test } from "node:test";
import {
    validateAdminUserRequest,
    validateAdminUserUpdateRequest,
    validateListUsersQuery,
} from "../src/modules/users/validators/adminUsers.validator.js";

const SUPPORT_USER = {
    nombreUsuario: "Ana",
    apellidoUsuario: "Perez",
    rutUsuario: "12.345.678-9",
    correoUsuario: "ana.perez@itecsa.cl",
    rolUsuario: "Soporte",
};

test("acepta Soporte al crear usuarios", () => {
    const result = validateAdminUserRequest(SUPPORT_USER);

    assert.equal(result.valid, true);
    assert.equal(result.user.rolUsuario, "Soporte");
});

test("acepta Soporte al actualizar usuarios", () => {
    const result = validateAdminUserUpdateRequest({
        nombreUsuario: SUPPORT_USER.nombreUsuario,
        apellidoUsuario: SUPPORT_USER.apellidoUsuario,
        correoUsuario: SUPPORT_USER.correoUsuario,
        rolUsuario: SUPPORT_USER.rolUsuario,
    });

    assert.equal(result.valid, true);
    assert.equal(result.user.rolUsuario, "Soporte");
});

test("acepta Soporte al filtrar usuarios", () => {
    const result = validateListUsersQuery({ rolUsuario: "Soporte" });

    assert.equal(result.valid, true);
    assert.equal(result.filters.rolUsuario, "Soporte");
});
