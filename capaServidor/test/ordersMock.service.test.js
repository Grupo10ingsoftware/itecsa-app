import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
    PAYMENT_CONFIRMATION_REQUIRED_MESSAGE,
    PAYMENT_STATUS,
} from "../src/config/status.js";
import OrderService from "../src/modules/orders/service/order.service.js";

const INITIAL_ORDERS = [
    {
        id_pedido: 1,
        estado_pago: PAYMENT_STATUS.PENDIENTE,
        id_estado_pago: 1,
        id_etapa_general: 0,
    },
    {
        id_pedido: 6,
        estado_pago: PAYMENT_STATUS.CONFIRMADO,
        id_estado_pago: 2,
        id_etapa_general: 1,
    },
];

let orders;
let paymentRecords;

beforeEach(() => {
    orders = INITIAL_ORDERS.map((order) => ({ ...order }));
    paymentRecords = [];
});

function findOrder(orderId) {
    return orders.find((order) => Number(order.id_pedido) === Number(orderId));
}

function createService() {
    return new OrderService({
        repo: {
            async get(orderId) {
                return findOrder(orderId) ?? null;
            },
            async updatePaymentStatus(orderId, paymentStatusId, nextKanbanOrder) {
                const order = findOrder(orderId);

                if (!order) return null;

                order.id_estado_pago = Number(paymentStatusId);
                order.estado_pago =
                    Number(paymentStatusId) === 2
                        ? PAYMENT_STATUS.CONFIRMADO
                        : PAYMENT_STATUS.PENDIENTE;
                order.id_etapa_general = Number(nextKanbanOrder);

                return { ...order };
            },
            async updateGeneralStep(orderId, stepId) {
                const order = findOrder(orderId);

                if (!order) return null;

                order.id_etapa_general = Number(stepId);

                return { ...order };
            },
        },
        paymentRepo: {
            async get(paymentStatusId) {
                if (Number(paymentStatusId) === 1) {
                    return { id_estado_Pago: 1, nombre_estado_pago: PAYMENT_STATUS.PENDIENTE };
                }

                if (Number(paymentStatusId) === 2) {
                    return { id_estado_Pago: 2, nombre_estado_pago: PAYMENT_STATUS.CONFIRMADO };
                }

                return null;
            },
        },
        paymentRecordService: {
            async createPaymentRecord(orderId, data) {
                paymentRecords.push({ orderId, ...data });
                return paymentRecords.at(-1);
            },
        },
    });
}

test("al confirmar pago mueve la orden a Listo para produccion", async () => {
    const service = createService();
    const order = await service.updPaymentState(1, 2, { id_usuario: 10 });

    assert.equal(order.estado_pago, "Confirmado");
    assert.equal(order.id_etapa_general, 1);
    assert.deepEqual(paymentRecords, [
        {
            orderId: 1,
            id_usuario: 10,
            id_estado_pago: 2,
            observacion: undefined,
        },
    ]);
});

test("al dejar pago pendiente devuelve la orden a Confirmacion de pago", async () => {
    const service = createService();
    await service.updPaymentState(1, 2, { id_usuario: 10 });

    const order = await service.updPaymentState(1, 1, { id_usuario: 10 });

    assert.equal(order.estado_pago, "Pendiente");
    assert.equal(order.id_etapa_general, 0);
});

test("bloquea mover a Listo para produccion con pago pendiente", async () => {
    const service = createService();

    await assert.rejects(
        () => service.updGeneralStep(1, 1),
        {
            message: PAYMENT_CONFIRMATION_REQUIRED_MESSAGE,
        },
    );
});

test("permite mover a Listo para produccion con pago confirmado", async () => {
    const service = createService();
    const order = await service.updGeneralStep(6, 1);

    assert.equal(order.id_estado_pago, 2);
    assert.equal(order.id_etapa_general, 1);
});
