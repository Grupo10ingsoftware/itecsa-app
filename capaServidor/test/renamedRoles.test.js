import assert from "node:assert/strict";
import { test } from "node:test";
import requireAdministratorRole from "../src/middlewares/requireAdministratorRole.js";
import requireSalesRole from "../src/middlewares/requireSalesRole.js";
import requireAdministrativeRole from "../src/middlewares/requireAdministrativeRole.js";
import OrderRepository from "../src/modules/orders/repo/orders.repo.js";

for (const [middleware, allowed] of [
    [requireAdministratorRole, ["Administrador Produccion"]],
    [requireSalesRole, ["Operario Ventas"]],
    [requireAdministrativeRole, ["Administrador Produccion", "Soporte"]],
]) {
    for (const role of ["Administrador Produccion", "Operario Produccion", "Operario Ventas", "Operario Cobranzas", "Gerencia", "Soporte", "Administrador Producción", "Operario Producción", "Administrador", "Producción", "Ventas", "Cobranzas"]) {
        test(`${middleware.name}: acceso de ${role}`, () => {
            let accepted = false;
            let status;
            const res = { status(code) { status = code; return this; }, json() {} };
            middleware({ auth: { payload: { "https://itecsa.local/roles": [role] } } }, res, () => { accepted = true; });
            assert.equal(accepted, allowed.includes(role));
            assert.equal(status, allowed.includes(role) ? undefined : 403);
        });
    }
}

test("la reevaluación notifica a administradores de producción activos", async () => {
    let recipientsQuery;
    let delivery;
    const repo = new OrderRepository({ prisma: {
        pedidos: { findUnique: async () => ({ id_cliente: 2, Detalle_pedido: [] }), update: async () => ({}) },
        cliente: { update: async () => ({}) },
        usuario: { findMany: async (query) => { recipientsQuery = query; return [{ id_usuario: 7 }]; } },
        mensaje: { create: async () => ({ id_mensaje: 9 }) },
        mENSAJE_USUARIO: { createMany: async (query) => { delivery = query; } },
    } });
    repo.transitionGeneralStage = async () => ({ id: 1 });
    await repo.reevaluateFromSalesNote({ orderId: 1, salesNote: { numeroNota: 123, items: [] }, userId: 3 });
    assert.deepEqual(recipientsQuery.where, {
        rol_usuario: "Administrador Produccion", NOT: { estado_usuario: "Desvinculado" },
    });
    assert.deepEqual(delivery.data, [{ id_usuario: 7, id_mensaje: 9, leido_: false, oculto_: false }]);
});
