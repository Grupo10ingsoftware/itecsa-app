import assert from "node:assert/strict";
import { test } from "node:test";
import OrderRepository from "../src/modules/orders/repo/orders.repo.js";

test("cambio de etapa actualiza pedido y crea registro con actor y comentario", async () => {
    const calls = [];
    const now = new Date("2026-09-04T12:00:00Z");
    const repo = new OrderRepository({
        prisma: {
            estado_Pedido: {
                async findFirst() { return { id_estado_pedido: 3 }; },
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
    repo.get = async () => ({ id_pedido: 6, id_etapa_general: 2, estado_pago: "Confirmado" });

    await repo.updateGeneralStep(6, 2, {
        userId: 10,
        comment: "Inicio de producción",
        now,
    });

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

test("enviar a revision notifica al usuario de Ventas responsable", async () => {
    const assignments = [];
    const repo = new OrderRepository({
        prisma: {
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

test("actualiza solo el pago cuando la etapa debe mantenerse", async () => {
    const updates = [];
    let statusQueries = 0;
    const repo = new OrderRepository({
        prisma: {
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
