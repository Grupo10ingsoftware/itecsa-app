import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
    ORDER_STATUS,
    PAYMENT_STATUS,
    RF32_WAITING_PAYMENT_MESSAGE,
} from "../src/config/status.js";
import {
    moveOrder,
    resetMockOrders,
    updatePaymentStatus,
} from "../src/services/ordersMock.service.js";

beforeEach(() => {
    resetMockOrders();
});

function assertServiceError(fn, { code, message, statusCode }) {
    try {
        fn();
        assert.fail("Se esperaba un error de servicio.");
    } catch (error) {
        assert.equal(error.code, code);
        assert.equal(error.message, message);
        assert.equal(error.statusCode, statusCode);
    }
}

test("rechaza estado de pago invalido", () => {
    assertServiceError(() => updatePaymentStatus("1", "Pagado"), {
        code: "INVALID_PAYMENT_STATUS",
        message: "El estado de pago no es valido.",
        statusCode: 400,
    });
});

test("al confirmar pago mueve la orden a Listo para produccion", () => {
    const order = updatePaymentStatus("1", PAYMENT_STATUS.CONFIRMADO);

    assert.equal(order.paymentStatus, PAYMENT_STATUS.CONFIRMADO);
    assert.equal(order.orderStatus, ORDER_STATUS.LISTO_PRODUCCION);
});

test("al dejar pago pendiente devuelve la orden a Confirmacion de pago", () => {
    updatePaymentStatus("1", PAYMENT_STATUS.CONFIRMADO);

    const order = updatePaymentStatus("1", PAYMENT_STATUS.PENDIENTE);

    assert.equal(order.paymentStatus, PAYMENT_STATUS.PENDIENTE);
    assert.equal(order.orderStatus, ORDER_STATUS.CONFIRMACION_PAGO);
});

test("bloquea mover a Listo para produccion con pago pendiente", () => {
    assertServiceError(
        () => moveOrder("1", ORDER_STATUS.LISTO_PRODUCCION),
        {
            code: "PAYMENT_CONFIRMATION_REQUIRED",
            message: RF32_WAITING_PAYMENT_MESSAGE,
            statusCode: 409,
        },
    );
});

test("bloquea mover a Listo para produccion con pago rechazado", () => {
    assertServiceError(
        () => moveOrder("2", ORDER_STATUS.LISTO_PRODUCCION),
        {
            code: "PAYMENT_CONFIRMATION_REQUIRED",
            message: RF32_WAITING_PAYMENT_MESSAGE,
            statusCode: 409,
        },
    );
});

test("permite mover a Listo para produccion con pago confirmado", () => {
    const order = moveOrder("3", ORDER_STATUS.LISTO_PRODUCCION);

    assert.equal(order.paymentStatus, PAYMENT_STATUS.CONFIRMADO);
    assert.equal(order.orderStatus, ORDER_STATUS.LISTO_PRODUCCION);
});

test("rechaza estado de destino invalido", () => {
    assertServiceError(() => moveOrder("3", "Despachado"), {
        code: "INVALID_ORDER_STATUS",
        message: "El estado de destino no es valido.",
        statusCode: 400,
    });
});
