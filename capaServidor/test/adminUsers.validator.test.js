import assert from "node:assert/strict";
import { test } from "node:test";
import {
    validateAdminUserRequest,
    validateAdminUserStatusRequest,
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

test("rechaza Soporte al crear usuarios", () => {
    const result = validateAdminUserRequest(SUPPORT_USER);

    assert.equal(result.valid, false);

});

test("rechaza Soporte al actualizar usuarios", () => {
    const result = validateAdminUserUpdateRequest({
        nombreUsuario: SUPPORT_USER.nombreUsuario,
        apellidoUsuario: SUPPORT_USER.apellidoUsuario,
        correoUsuario: SUPPORT_USER.correoUsuario,
        rolUsuario: SUPPORT_USER.rolUsuario,
    });

    assert.equal(result.valid, false);

});

test("rechaza Soporte al filtrar usuarios", () => {
    const result = validateListUsersQuery({ rolUsuario: "Soporte" });

    assert.equal(result.valid, false);

});

for (const role of ["Administrador Produccion", "Operario Produccion", "Operario Ventas", "Operario Cobranzas", "Gerencia", "Soporte", "Administrador Producción", "Operario Producción", "Administrador", "Producción", "Ventas", "Cobranzas", "Administración Cobranzas", "Administrador Ventas"]) {
    test(`valida vigencia de ${role} en creación, edición y filtros`, () => {
        const valid = ["Administrador Produccion", "Operario Produccion", "Operario Ventas", "Operario Cobranzas", "Gerencia", "Administrador Ventas", "Administrador Cobranzas"].includes(role);
        assert.equal(validateAdminUserRequest({ ...SUPPORT_USER, rolUsuario: role }).valid, valid);
        assert.equal(validateAdminUserUpdateRequest({ nombreUsuario: SUPPORT_USER.nombreUsuario, apellidoUsuario: SUPPORT_USER.apellidoUsuario, correoUsuario: SUPPORT_USER.correoUsuario, rolUsuario: role }).valid, valid);
        assert.equal(validateListUsersQuery({ rolUsuario: role }).valid, valid);
    });
}

test('permite filtrar pendientes pero no asignarlos mediante cambio de estado', () => {
    assert.deepEqual(validateListUsersQuery({ estadoUsuario: 'Pendiente rol' }), {
        valid: true,
        filters: {
            page: 1,
            perPage: 10,
            search: '',
            estadoUsuario: 'Pendiente rol',
            rolUsuario: '',
        },
    });
    assert.equal(
        validateAdminUserStatusRequest({ estadoUsuario: 'Pendiente rol' }).valid,
        false,
    );
});
