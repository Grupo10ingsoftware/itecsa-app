import assert from "node:assert/strict";
import { test } from "node:test";

import OrderHistoryRepository from "../src/modules/history/repo/orderHistory.repo.js";

test("detalle de historial proyecta cabecera e items con consultas pequenas en paralelo", async () => {
    const queries = [];
    const prisma = {
        async $queryRawUnsafe(query) {
            queries.push(query);
            if (query.includes("FROM Pedidos p")) return [{
                id_pedido: 8n,
                numero_nota_venta: "NV-8",
                fecha_creacion: new Date("2026-09-01T00:00:00Z"),
                fecha_estimada_termino: null,
                nombre_cliente: "Cliente",
                razon_social: null,
                id_usuario: 4n,
                nombre_usuario: "Ana",
                apellido_usuario: "Perez",
                nombre_etapa: "En produccion",
                nombre_estado_pago: "Confirmado",
            }];
            if (query.includes("FROM Detalle_pedido d")) return [{
                id_detalle_pedido: 10n,
                cantidad: 50n,
                fecha_estimada_termino: null,
                fecha_real_termino: null,
                nombre_producto: "Lanyard",
                nombre_estado: "Impresion",
            }];
            if (query.includes("FROM Pedido_Item_Sin_Seguimiento")) return [];
            if (query.includes("FROM Pedido_Etiqueta")) return [{ nombre_etiqueta: "Urgente" }];
            throw new Error("Consulta no esperada");
        },
    };
    const repository = new OrderHistoryRepository({ prisma });

    const result = await repository.getById(8);

    assert.equal(queries.length, 4);
    assert.equal(result.id_pedido, 8);
    assert.equal(result.Usuario.id_usuario, 4);
    assert.equal(result.Detalle_pedido[0].cantidad, 50);
    assert.deepEqual(result.Pedido_Etiqueta, [{ etiqueta: { nombre_etiqueta: "Urgente" } }]);
    assert.doesNotThrow(() => JSON.stringify(result));
});

test("eventos usan una consulta paginada, filtro SQL y redaccion de pagos", async () => {
    let captured;
    const prisma = {
        async $queryRawUnsafe(query, ...parameters) {
            captured = { query, parameters };
            return [{
                ID_REGISTRO: 12n,
                FECHA_HORA: new Date("2026-09-04T10:00:00Z"),
                id_usuario_visible: null,
                observacion_visible: null,
                nombre_usuario_visible: null,
                apellido_usuario_visible: null,
                stage_record_id: null,
                stage_entered_at: null,
                stage_exited_at: null,
                stage_name: null,
                payment_record_id: 12n,
                payment_observation: null,
                previous_payment_status: "Pendiente",
                next_payment_status: "Confirmado",
                subprocess_record_id: null,
                subprocess_entered_at: null,
                subprocess_exited_at: null,
                subprocess_name: null,
                product_name: null,
            }];
        },
    };
    const repository = new OrderHistoryRepository({ prisma });
    const cursorDate = new Date("2026-09-05T10:00:00Z");

    const result = await repository.listEvents({
        orderId: 8,
        type: "payment",
        cursor: { id: 20, occurredAt: cursorDate },
        limit: 10,
        includePaymentDetails: false,
    });

    assert.match(captured.query, /rp\.id_registro IS NOT NULL/);
    assert.match(captured.query, /FECHA_HORA < \?/);
    assert.equal(captured.parameters.at(-1), 11);
    assert.deepEqual(captured.parameters.slice(0, 5), [0, 0, 0, 0, 0]);
    assert.equal(result[0].ID_REGISTRO, 12);
    assert.equal(result[0].id_usuario, null);
    assert.equal(result[0].observacion, null);
    assert.equal(result[0].Registro_Pago.Estado_Pago_Registro_Pago_id_estado_pago_nuevoToEstado_Pago.nombre_estado_pago, "Confirmado");
    assert.doesNotThrow(() => JSON.stringify(result));
});
