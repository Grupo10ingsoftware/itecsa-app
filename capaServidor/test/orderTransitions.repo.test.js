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
    repo.get = async () => ({ id_pedido: 6, id_etapa_general: 2 });

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
    repo.get = async () => ({ id_pedido: 6, id_etapa_general: 2 });

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
    repo.get = async () => ({ id_pedido: 6, id_etapa_general: 2 });

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
