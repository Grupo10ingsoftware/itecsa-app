import assert from "node:assert/strict";
import { test } from "node:test";
import OrderHistoryService from "../src/modules/history/service/orderHistory.service.js";
import {
    decodeHistoryEventCursor,
    encodeCursor,
} from "../src/shared/pagination.js";

test("lista pedidos y normaliza filtros de estado, busqueda y paginacion", async () => {
    let received;
    const service = new OrderHistoryService({
        repo: {
            async list(filters) {
                received = filters;
                return [{
                        id_pedido: 8,
                        numero_nota_venta: "NV-8",
                        fecha_creacion: new Date("2026-09-04T00:00:00Z"),
                        Cliente: { rut_cliente: "1-9", nombre_cliente: "Cliente" },
                        Estado_Pedido: { nombre_etapa: "En produccion" },
                    }];
            },
        },
    });

    const result = await service.listOrders({
        status: "En produccion",
        search: "04-09-2026",
        limit: "10",
    });

    assert.equal(received.status, "En produccion");
    assert.equal(received.limit, 10);
    assert.equal(received.cursor, null);
    assert.equal(received.dateRange.start.toISOString(), "2026-09-04T00:00:00.000Z");
    assert.deepEqual(result.items[0], {
        id: 8,
        salesNoteNumber: "NV-8",
        clientName: "Cliente",
        status: "En produccion",
        createdAt: new Date("2026-09-04T00:00:00Z"),
    });
    assert.deepEqual(result.pageInfo, { limit: 10, nextCursor: null, hasMore: false });
});

test("consolida y filtra cronologia por tipo de registro", async () => {
    const baseRecord = {
        FECHA_HORA: new Date("2026-09-04T10:00:00Z"),
        id_usuario: 4,
        Usuario: { nombre_usuario: "Ana", apellido_usuario: "Perez" },
    };
    const records = [
        {
            ...baseRecord,
            ID_REGISTRO: 1,
            Registro_Etapas: { nombre: "unused" },
            Registro_Pago: null,
            registro_subprocesos: null,
        },
        {
            ...baseRecord,
            ID_REGISTRO: 2,
            Registro_Etapas: null,
            Registro_Pago: {
                observacion: "Pago confirmado",
                Estado_Pago_Registro_Pago_id_estado_pago_anteriorToEstado_Pago: { nombre_estado_pago: "Pendiente" },
                Estado_Pago_Registro_Pago_id_estado_pago_nuevoToEstado_Pago: { nombre_estado_pago: "Confirmado" },
            },
            registro_subprocesos: null,
        },
        {
            ...baseRecord,
            ID_REGISTRO: 3,
            observacion: "Fecha de termino definida para 21-09-2026.",
            Registro_Etapas: null,
            Registro_Pago: null,
            registro_subprocesos: null,
        },
        {
            ...baseRecord,
            ID_REGISTRO: 4,
            observacion: "Avance Lanyard: 11% (54/500 producidos)",
            Registro_Etapas: null,
            Registro_Pago: null,
            registro_subprocesos: {
                fecha_hora_entrada: new Date("2026-09-04T09:59:30Z"),
                fecha_hora_salida: new Date("2026-09-04T10:00:00Z"),
                Estado_Subprocesos: { nombre_estado: "Impresion" },
                Detalle_pedido: { Tipo_Producto: { nombre_producto: "Lanyard" } },
            },
        },
    ];
    const byType = {
        payment: [records[1]],
        calendar: [records[2]],
        subprocess: [records[3]],
        stage: [records[0]],
        all: records,
    };
    const service = new OrderHistoryService({
        repo: {
            async getById() {
                return {
                    id_pedido: 8,
                    numero_nota_venta: "NV-8",
                    fecha_creacion: new Date("2026-09-01T00:00:00Z"),
                    fecha_estimada_termino: null,
                    observacion: null,
                    observacion_origen: null,
                    observacion_interna: null,
                    usuario_manager_origen: null,
                    Cliente: { nombre_cliente: "Cliente", rut_cliente: "1-9" },
                    Usuario: { id_usuario: 4, nombre_usuario: "Ana", apellido_usuario: "Perez", correo_usuario: "a@b.cl" },
                    Estado_Pedido: { nombre_etapa: "En produccion" },
                    Estado_Pago: { nombre_estado_pago: "Confirmado" },
                    Detalle_pedido: [],
                    Pedido_Item_Sin_Seguimiento: [],
                    Pedido_Etiqueta: [],
                };
            },
            async listEvents({ type }) {
                return byType[type] ?? [];
            },
        },
    });

    const result = await service.getOrderHistory("8", { type: "payment" }, { includePaymentDetails: true });
    assert.equal(result.events.length, 1);
    assert.equal(result.events[0].type, "payment");
    assert.equal(result.events[0].responsible, "Ana Perez");
    assert.equal(result.events[0].previousStatus, "Pendiente");
    assert.equal(result.events[0].nextStatus, "Confirmado");
    assert.deepEqual(result.pageInfo, { limit: 50, nextCursor: null, hasMore: false });

    const restrictedResult = await service.getOrderHistory("8", { type: "payment" });
    assert.equal("responsible" in restrictedResult.events[0], false);
    assert.equal("description" in restrictedResult.events[0], false);

    const calendarResult = await service.getOrderHistory("8", { type: "calendar" });
    assert.equal(calendarResult.events.length, 1);
    assert.equal(calendarResult.events[0].type, "calendar");
    assert.equal(calendarResult.events[0].typeLabel, "Calendarizacion");
    assert.equal(calendarResult.events[0].title, "Fecha de termino definida");

    const subprocessResult = await service.getOrderHistory("8", { type: "subprocess" });
    assert.equal(subprocessResult.events.length, 1);
    assert.equal(subprocessResult.events[0].title, "Impresion 11%");
    assert.deepEqual(subprocessResult.events[0].lanyardProgress, {
        percentage: 11,
        accumulatedQuantity: 54,
        totalQuantity: 500,
    });
});

test("pagina eventos con cursor temporal firmado y limite maximo", async () => {
    const received = [];
    const occurredAt = new Date("2026-09-04T10:00:00.000Z");
    const order = {
        id_pedido: 8,
        numero_nota_venta: "NV-8",
        Cliente: null,
        Usuario: null,
        Estado_Pedido: null,
        Estado_Pago: null,
        Detalle_pedido: [],
        Pedido_Item_Sin_Seguimiento: [],
        Pedido_Etiqueta: [],
    };
    const service = new OrderHistoryService({ repo: {
        async getById() { return order; },
        async listEvents(filters) {
            received.push(filters);
            return [3, 2, 1].map((id) => ({
                ID_REGISTRO: id,
                FECHA_HORA: occurredAt,
                id_usuario: null,
                observacion: null,
                Usuario: null,
                Registro_Etapas: null,
                Registro_Pago: null,
                registro_subprocesos: null,
            }));
        },
    } });

    const first = await service.getOrderHistory("8", { type: "all", limit: "2" });
    assert.deepEqual(first.events.map((event) => event.id), [3, 2]);
    assert.equal(first.pageInfo.hasMore, true);
    assert.deepEqual(decodeHistoryEventCursor(first.pageInfo.nextCursor), {
        id: 2,
        occurredAt,
    });

    await service.getOrderHistory("8", { type: "all", limit: "2", cursor: first.pageInfo.nextCursor });
    assert.deepEqual(received[1].cursor, { id: 2, occurredAt });
    await assert.rejects(
        () => service.getOrderHistory("8", { cursor: encodeCursor({ id: 2 }) }),
        { code: "INVALID_CURSOR" },
    );
    await assert.rejects(
        () => service.getOrderHistory("8", { limit: "101" }),
        { code: "INVALID_PAGE_LIMIT" },
    );
});

test("rechaza IDs y tipos de evento invalidos", async () => {
    const service = new OrderHistoryService({ repo: {} });
    await assert.rejects(() => service.getOrderHistory("abc"), { statusCode: 400 });
    await assert.rejects(() => service.getOrderHistory("1", { type: "otro" }), { statusCode: 400 });
});
