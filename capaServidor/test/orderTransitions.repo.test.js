import assert from "node:assert/strict";
import { test } from "node:test";
import OrderRepository from "../src/modules/orders/repo/orders.repo.js";

test("cambio de etapa actualiza pedido y crea registro con actor y comentario", async () => {
    const calls = [];
    const now = new Date("2026-09-04T12:00:00Z");
    const repo = new OrderRepository({
        prisma: {
            async $queryRaw() { return []; },
            estado_Pedido: {
                async findFirst() { return { id_estado_pedido: 3, orden_kanban: 2, nombre_etapa: "En producción" }; },
            },
            pedidos: {
                async updateMany(payload) {
                    calls.push(["pedidos.updateMany", payload]);
                    return { count: 1 };
                },
            },
            registro_Etapas: {
                async updateMany(payload) { calls.push(["registro_Etapas.updateMany", payload]); },
                async create(payload) { calls.push(["registro_Etapas.create", payload]); },
            },
            registros: {
                async create(payload) {
                    calls.push(["registros.create", payload]);
                    return { ID_REGISTRO: 20 };
                },
            },
        },
    });
    repo.get = async () => { assert.fail("El movimiento no debe releer el pedido completo"); };

    const result = await repo.updateGeneralStep(6, 2, {
        userId: 10,
        comment: "Inicio de producción",
        now,
        expectedState: { id_estado_pedido: 2, id_estado_pago: 2 },
    });

    assert.deepEqual(result, {
        id_pedido: 6, id_estado_pedido: 3, id_etapa_general: 2, generalStepId: 2,
        nombre_etapa_general: "En producción",
    });
    assert.equal(calls[0][1].where.id_estado_pedido, 2);
    assert.equal(calls[0][1].where.id_estado_pago, 2);

    assert.deepEqual(calls[2], ["registros.create", {
        data: {
            FECHA_HORA: now,
            id_pedido: 6,
            id_usuario: 10,
            observacion: "Inicio de producción",
        },
    }]);
    assert.deepEqual(calls[3][1].data, {
        id_registro: 20,
        fecha_hora_entrada: now,
        fecha_hora_salida: null,
        id_estado_pedido: 3,
    });
});

test("subproceso usa la salida anterior como inicio y no genera duración cero", async () => {
    const created = [];
    const previousExit = new Date("2020-09-04T10:00:00Z");
    const repo = new OrderRepository({
        prisma: {
            async $queryRaw() { return []; },
            detalle_pedido: {
                async findFirst() {
                    return {
                        id_detalle_pedido: 2,
                        id_estado_subproceso: 4,
                        fecha_real_termino: null,
                        Tipo_Producto: {
                            Producto_Subproceso: [
                                { id_estado_subproceso: 4 },
                                { id_estado_subproceso: 5 },
                            ],
                        },
                    };
                },
                async updateMany() { return { count: 1 }; },
            },
            registro_subprocesos: {
                async findFirst() {
                    return {
                        fecha_hora_entrada: new Date("2020-09-04T09:00:00Z"),
                        fecha_hora_salida: previousExit,
                        Registros: { FECHA_HORA: previousExit },
                    };
                },
                async create(payload) { created.push(payload.data); },
            },
            registro_Etapas: { async findFirst() { return null; } },
            registros: { async create() { return { ID_REGISTRO: 30 }; } },
        },
    });
    repo.get = async () => ({ id_pedido: 6, id_etapa_general: 2, estado_pago: "Confirmado" });

    await repo.completeSubprocess({
        orderId: 6,
        detailId: 2,
        subprocessId: 4,
        userId: 10,
        comment: "Terminado",
    });

    assert.equal(created[0].fecha_hora_entrada, previousExit);
    assert.ok(created[0].fecha_hora_salida > previousExit);
});

test("subproceso duplicado se rechaza antes de crear un segundo registro", async () => {
    let registryCreates = 0;
    const repo = new OrderRepository({
        prisma: {
            async $queryRaw() { return []; },
            detalle_pedido: {
                async findFirst() {
                    return {
                        id_detalle_pedido: 2,
                        id_estado_subproceso: 4,
                        fecha_real_termino: null,
                        Tipo_Producto: {
                            Producto_Subproceso: [
                                { id_estado_subproceso: 4 },
                                { id_estado_subproceso: 5 },
                            ],
                        },
                    };
                },
                async updateMany() { return { count: 0 }; },
            },
            registro_subprocesos: { async findFirst() { return null; } },
            registro_Etapas: {
                async findFirst() {
                    return { fecha_hora_entrada: new Date("2020-09-04T09:00:00Z") };
                },
            },
            registros: {
                async create() {
                    registryCreates += 1;
                    return { ID_REGISTRO: 31 };
                },
            },
        },
    });
    repo.get = async () => ({ id_pedido: 6, id_etapa_general: 2, estado_pago: "Confirmado" });

    await assert.rejects(
        repo.completeSubprocess({
            orderId: 6,
            detailId: 2,
            subprocessId: 4,
            userId: 10,
        }),
        (error) => error.statusCode === 409,
    );
    assert.equal(registryCreates, 0);
});

test("lanyard parcial repite flujo antes de empaquetado", async () => {
    let updatedDetail;
    let registryPayload;
    const repo = new OrderRepository({
        prisma: {
            async $queryRaw() { return []; },
            avance_Lanyard: {
                async findFirst() {
                    return { porcentaje_acumulado: 40 };
                },
            },
            detalle_pedido: {
                async findFirst() {
                    return {
                        id_detalle_pedido: 2,
                        id_estado_subproceso: 5,
                        fecha_real_termino: null,
                        Tipo_Producto: {
                            nombre_producto: "Lanyard",
                            Producto_Subproceso: [
                                { id_estado_subproceso: 4, Estado_Subprocesos: { nombre_estado: "Impresion" } },
                                { id_estado_subproceso: 5, Estado_Subprocesos: { nombre_estado: "Costura" } },
                                { id_estado_subproceso: 6, Estado_Subprocesos: { nombre_estado: "Empaquetado" } },
                            ],
                        },
                    };
                },
                async updateMany(payload) {
                    updatedDetail = payload.data;
                    return { count: 1 };
                },
            },
            registro_subprocesos: {
                async findFirst() { return null; },
                async create() {},
            },
            registro_Etapas: {
                async findFirst() {
                    return { fecha_hora_entrada: new Date("2026-09-24T09:00:00Z") };
                },
            },
            registros: {
                async create(payload) {
                    registryPayload = payload.data;
                    return { ID_REGISTRO: 32 };
                },
            },
        },
    });
    repo.get = async () => ({ id_pedido: 6, id_etapa_general: 2, estado_pago: "Confirmado" });

    await repo.completeSubprocess({
        orderId: 6,
        detailId: 2,
        subprocessId: 5,
        userId: 10,
        comment: "Costura parcial",
    });

    assert.deepEqual(updatedDetail, {
        id_estado_subproceso: 4,
        fecha_real_termino: null,
    });
    assert.equal(registryPayload.observacion, "Costura parcial");
});

test("lanyard parcial sin comentario no crea observacion de subproceso", async () => {
    let registryPayload;
    const repo = new OrderRepository({
        prisma: {
            async $queryRaw() { return []; },
            avance_Lanyard: {
                async findFirst() {
                    return { porcentaje_acumulado: 40 };
                },
            },
            detalle_pedido: {
                async findFirst() {
                    return {
                        id_detalle_pedido: 2,
                        id_estado_subproceso: 5,
                        fecha_real_termino: null,
                        Tipo_Producto: {
                            nombre_producto: "Lanyard",
                            Producto_Subproceso: [
                                { id_estado_subproceso: 4, Estado_Subprocesos: { nombre_estado: "Impresion" } },
                                { id_estado_subproceso: 5, Estado_Subprocesos: { nombre_estado: "Costura" } },
                                { id_estado_subproceso: 6, Estado_Subprocesos: { nombre_estado: "Empaquetado" } },
                            ],
                        },
                    };
                },
                async updateMany() {
                    return { count: 1 };
                },
            },
            registro_subprocesos: {
                async findFirst() { return null; },
                async create() {},
            },
            registro_Etapas: {
                async findFirst() {
                    return { fecha_hora_entrada: new Date("2026-09-24T09:00:00Z") };
                },
            },
            registros: {
                async create(payload) {
                    registryPayload = payload.data;
                    return { ID_REGISTRO: 33 };
                },
            },
        },
    });
    repo.get = async () => ({ id_pedido: 6, id_etapa_general: 2, estado_pago: "Confirmado" });

    await repo.completeSubprocess({
        orderId: 6,
        detailId: 2,
        subprocessId: 5,
        userId: 10,
        comment: "",
    });

    assert.equal(registryPayload.observacion, null);
});

test("enviar a revision notifica al usuario de Ventas responsable", async () => {
    const assignments = [];
    const repo = new OrderRepository({
        prisma: {
            async $queryRaw() { return []; },
            mensaje: {
                async create({ data }) {
                    assert.equal(data.id_pedido, 6);
                    assert.match(data.contenido, /NV-100/);
                    assert.match(data.contenido, /Corregir diseño/);
                    return { id_mensaje: 44 };
                },
            },
            mENSAJE_USUARIO: {
                async create({ data }) { assignments.push(data); },
            },
        },
    });
    repo.transitionGeneralStage = async () => ({
        id_pedido: 6,
        id_usuario: 21,
        numero_nota_venta: "NV-100",
    });

    await repo.sendToReview(6, { userId: 10, comment: "Corregir diseño" });

    assert.deepEqual(assignments, [{
        id_usuario: 21,
        id_mensaje: 44,
        leido_: false,
        oculto_: false,
    }]);
});

test("movimiento concurrente se rechaza sin escribir auditoria", async () => {
    const repo = new OrderRepository({ prisma: {
        estado_Pedido: { async findFirst() { return { id_estado_pedido: 3 }; } },
        pedidos: { async updateMany() { return { count: 0 }; } },
        registros: { async create() { assert.fail("No debe crear auditoria"); } },
    } });
    await assert.rejects(repo.updateGeneralStep(6, 2, {
        userId: 10, expectedState: { id_estado_pedido: 2, id_estado_pago: 2 },
    }), error => error.statusCode === 409);
});

test("lectura de validacion conserva etapa y pago sin cargar detalles", async () => {
    const repo = new OrderRepository({ prisma: { pedidos: {
        async findUnique(query) {
            assert.equal(query.include, undefined);
            assert.equal(query.select.Detalle_pedido, undefined);
            return {
                id_pedido: 6, id_estado_pedido: 2, id_estado_pago: 2,
                Estado_Pedido: { orden_kanban: 1, nombre_etapa: "Listo para produccion" },
                Estado_Pago: { nombre_estado_pago: "Confirmado" },
            };
        },
    } } });
    const result = await repo.getTransitionState(6);
    assert.equal(result.id_etapa_general, 1);
    assert.equal(result.estado_pago, "Confirmado");
    assert.equal(result.detalles, undefined);
});

test("actualiza solo el pago cuando la etapa debe mantenerse", async () => {
    const updates = [];
    let statusQueries = 0;
    const repo = new OrderRepository({
        prisma: {
            async $queryRaw() { return []; },
            estado_Pedido: {
                async findFirst() {
                    statusQueries += 1;
                    return { id_estado_pedido: 1 };
                },
            },
            pedidos: {
                async update(payload) {
                    updates.push(payload);
                    return {};
                },
            },
        },
    });
    repo.getPaymentOrder = async () => ({
        id_pedido: 7,
        estado_pago: "Rechazado",
        id_etapa_general: 2,
    });

    await repo.updatePaymentStatus(7, 3, null);

    assert.equal(statusQueries, 0);
    assert.deepEqual(updates[0].data, { id_estado_pago: 3 });
});

test("reutiliza el pedido validado despues de actualizar el pago", async () => {
    let paymentReads = 0;
    const repo = new OrderRepository({
        prisma: {
            async $queryRaw() { return []; },
            estado_Pedido: {
                async findFirst() {
                    return {
                        id_estado_pedido: 2,
                        nombre_etapa: "Listo para produccion",
                        orden_kanban: 1,
                    };
                },
            },
            pedidos: {
                async update() {
                    return {};
                },
            },
        },
    });
    repo.getPaymentOrder = async () => {
        paymentReads += 1;
        return null;
    };

    const updated = await repo.updatePaymentStatus(7, 2, 1, {
        currentOrder: {
            id_pedido: 7,
            id_estado_pago: 1,
            id_estado_pedido: 1,
            id_etapa_general: 0,
            estado_pago: "Pendiente",
        },
        paymentStatusName: "Confirmado",
    });

    assert.equal(paymentReads, 0);
    assert.equal(updated.estado_pago, "Confirmado");
    assert.equal(updated.id_estado_pedido, 2);
    assert.equal(updated.id_etapa_general, 1);
});

test("lista cobranzas sin cargar relaciones productivas", async () => {
    let query;
    const repo = new OrderRepository({
        prisma: {
            async $queryRaw() { return []; },
            async $queryRaw(strings) {
                query = strings.join("?");
                return [{
                    id_pedido: 8,
                    numero_nota_venta: "24101",
                    fecha_creacion: new Date("2026-09-07T00:00:00Z"),
                    id_estado_pago: 1,
                    id_estado_pedido: 1,
                    nombre_cliente: "Cliente",
                    razon_social: "Cliente SpA",
                    rut_cliente: "11.111.111-1",
                    nombre_etapa_general: "Confirmacion de pago",
                    id_etapa_general: 0,
                    estado_pago: "Pendiente",
                }];
            },
        },
    });

    const orders = await repo.getPaymentOrders();

    assert.doesNotMatch(query, /Detalle_pedido|Pedido_Etiqueta/);
    assert.match(query, /LEFT JOIN Cliente/);
    assert.match(query, /LEFT JOIN Estado_Pago/);
    assert.deepEqual(orders[0], {
        id_pedido: 8,
        numero_nota_venta: "24101",
        fecha_creacion: new Date("2026-09-07T00:00:00Z"),
        id_estado_pago: 1,
        id_estado_pedido: 1,
        nombre_cliente: "Cliente",
        razon_social: "Cliente SpA",
        rut_cliente: "11.111.111-1",
        id_etapa_general: 0,
        generalStepId: 0,
        nombre_etapa_general: "Confirmacion de pago",
        estado_pago: "Pendiente",
        paymentStatus: "Pendiente",
    });
});

test("notifica a todos los administradores de Produccion activos", async () => {
    const assignments = [];
    const repo = new OrderRepository({
        prisma: {
            async $queryRaw() { return []; },
            usuario: {
                async findMany() {
                    return [{ id_usuario: 2 }, { id_usuario: 9 }];
                },
            },
            mensaje: {
                async create({ data }) {
                    assert.equal(data.Asunto, "Cancelación de producción requerida");
                    assert.equal(data.id_pedido, 7);
                    return { id_mensaje: 51 };
                },
            },
            mENSAJE_USUARIO: {
                async createMany({ data }) {
                    assignments.push(...data);
                },
            },
        },
    });

    await repo.notifyProductionAdministrators({
        orderId: 7,
        subject: "Cancelación de producción requerida",
        content: "El pedido debe cancelarse.",
    });

    assert.deepEqual(assignments, [
        { id_usuario: 2, id_mensaje: 51, leido_: false, oculto_: false },
        { id_usuario: 9, id_mensaje: 51, leido_: false, oculto_: false },
    ]);
});

function completionFixture({ pending = false, intermediate = false, stageExists = true, recipient = 21, notifyFails = false } = {}) {
    const calls = [];
    let stage = 2;
    const repo = new OrderRepository({ prisma: {
        async $queryRaw() { calls.push('lock'); return [{ id_pedido: 6 }]; },
        detalle_pedido: {
            async findMany() { return [{ fecha_real_termino: pending ? null : new Date() }]; },
            async findFirst(query) {
                if (query.select) {
                    calls.push('pending');
                    assert.deepEqual(query.where, { id_pedido: 6, fecha_real_termino: null });
                    return pending ? { id_detalle_pedido: 3 } : null;
                }
                calls.push('detail');
                return { id_estado_subproceso: 4, fecha_real_termino: null,
                    Tipo_Producto: { Producto_Subproceso: [{ id_estado_subproceso: 4 }, ...(intermediate ? [{ id_estado_subproceso: 5 }] : [])] } };
            },
            async updateMany() { return { count: 1 }; },
        },
        registro_subprocesos: { async findFirst() { return null; }, async create() {} },
        registro_Etapas: { async findFirst() { return null; }, async updateMany() {}, async create() { calls.push('stage-history'); } },
        registros: { async create() { return { ID_REGISTRO: 100 }; } },
        estado_Pedido: { async findFirst() { return stageExists ? { id_estado_pedido: 4, orden_kanban: 3 } : null; } },
        pedidos: {
            async findUnique() { return { id_pedido: 6, id_usuario: recipient, numero_nota_venta: 'NV-100' }; },
            async updateMany() {
            if (stage === 3) return { count: 0 };
            stage = 3; return { count: 1 };
        } },
        mensaje: { async create({ data }) {
            calls.push('notification');
            assert.equal(data.MENSAJE_USUARIO.create.id_usuario, 21);
            assert.equal(data.MENSAJE_USUARIO.create.leido_, false);
            assert.equal(data.MENSAJE_USUARIO.create.oculto_, false);
            assert.match(data.contenido, /NV-100.*Listo para Entrega/);
            if (notifyFails) throw new Error('notification failed');
            return { id_mensaje: 10 };
        } },
    } });
    repo.get = async () => ({ id_pedido: 6, id_usuario: recipient, numero_nota_venta: 'NV-100', id_etapa_general: stage, estado_pago: 'Confirmado' });
    const complete = () => repo.completeSubprocess({ orderId: 6, detailId: 2, subprocessId: 4, userId: 99 });
    return { repo, complete, calls };
}

test('terminar incluso el último detalle mantiene producción sin notificar', async () => {
    for (const options of [{}, { pending: true }, { intermediate: true }]) {
        const { complete, calls } = completionFixture(options);
        assert.equal((await complete()).id_etapa_general, 2);
        assert.deepEqual(calls, ['lock', 'detail']);
    }
});
test('mover manualmente a entrega notifica una sola vez al responsable', async () => {
    const { repo, calls } = completionFixture();
    repo.get = async () => { assert.fail('No debe recargar el pedido completo para notificar'); };
    assert.equal((await repo.updateGeneralStep(6, 3, { userId: 99 })).id_etapa_general, 3);
    assert.equal(await repo.updateGeneralStep(6, 3, { userId: 99 }), null);
    assert.equal(calls.filter((call) => call === 'notification').length, 1);
});
test('fallo de notificación manual se propaga para revertir la transacción', async () => {
    const { repo } = completionFixture({ notifyFails: true });
    await assert.rejects(repo.updateGeneralStep(6, 3, { userId: 99 }), /notification failed/);
});

test('permite devolver el último subproceso de un detalle terminado mientras el pedido sigue en producción', async () => {
    let updated;
    const repo = new OrderRepository({ prisma: {
        async $queryRaw() { return []; },
        detalle_pedido: {
            async findFirst() { return {
                id_estado_subproceso: 4, fecha_real_termino: new Date(),
                Tipo_Producto: { Producto_Subproceso: [{ id_estado_subproceso: 4 }] },
            }; },
            async updateMany({ data }) { updated = data; return { count: 1 }; },
        },
        registros: { async create() { return { ID_REGISTRO: 101 }; } },
        registro_subprocesos: { async create() {} },
    } });
    repo.getTransitionState = async () => ({ id_etapa_general: 2, estado_pago: 'Confirmado' });
    repo.get = repo.getTransitionState;
    await repo.rollbackSubprocess({ orderId: 6, detailId: 2, subprocessId: 4, userId: 10, comment: 'Rehacer' });
    assert.deepEqual(updated, { id_estado_subproceso: 4, fecha_real_termino: null });
});

test('impide mover a entrega cuando queda cualquier detalle pendiente', async () => {
    const { repo, calls } = completionFixture({ pending: true });
    await assert.rejects(repo.updateGeneralStep(6, 3, { userId: 99 }), { statusCode: 409 });
    assert.deepEqual(calls, ['lock']);
});
test('valida todos los detalles y rechaza pedidos sin detalles', async () => {
    for (const details of [[], [{ fecha_real_termino: new Date() }, { fecha_real_termino: null }]]) {
        const repo = new OrderRepository({ prisma: {
            async $queryRaw() { return []; },
            detalle_pedido: { async findMany() { return details; } },
        } });
        await assert.rejects(repo.updateGeneralStep(6, 3, { userId: 99 }), { statusCode: 409 });
    }
});

test('bloquea por PK el pedido de pago antes de releerlo', async () => {
    let sql;
    let values;
    const repo = new OrderRepository({ prisma: {
        async $queryRaw(strings, ...parameters) {
            sql = strings.join('?');
            values = parameters;
            return [{ id_pedido: 6 }];
        },
    } });

    assert.equal(await repo.lockPaymentOrder('6'), true);
    assert.match(sql, /WHERE id_pedido = \?\s+FOR UPDATE/);
    assert.deepEqual(values, [6]);
});
