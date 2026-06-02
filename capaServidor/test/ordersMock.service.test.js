import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
    RF32_WAITING_PAYMENT_MESSAGE,
} from "../src/config/status.js";
import OrderService, {
    resetMockOrders,
} from "../src/modules/orders/service/order.service.js";

beforeEach(() => {
    resetMockOrders();
});

test("al confirmar pago mueve la orden a Listo para produccion", async () => {
    const service = new OrderService();
    const order = await service.updPaymentState(1, 1);

    assert.equal(order.estado_pago, "Confirmado");
    assert.equal(order.id_etapa_general, 1);
});

test("al dejar pago pendiente devuelve la orden a Confirmacion de pago", async () => {
    const service = new OrderService();
    await service.updPaymentState(1, 1);

    const order = await service.updPaymentState(1, 0);

    assert.equal(order.estado_pago, "Pendiente");
    assert.equal(order.id_etapa_general, 0);
});

test("bloquea mover a Listo para produccion con pago pendiente", async () => {
    const service = new OrderService();

    await assert.rejects(
        () => service.updGeneralStep(1, 1),
        {
            message: RF32_WAITING_PAYMENT_MESSAGE,
        },
    );
});

test("permite mover a Listo para produccion con pago confirmado", async () => {
    const service = new OrderService();
    const order = await service.updGeneralStep(6, 1);

    assert.equal(order.id_estado_pago, 1);
    assert.equal(order.id_etapa_general, 1);
});
