import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
    KANBAN_MOVE_TO_PRODUCTION_PERMISSION_MESSAGE,
    KANBAN_STAGE_SKIP_MESSAGE,
    MOVE_KANBAN_TO_PRODUCTION_PERMISSION,
    PAYMENT_CONFIRMATION_REQUIRED_MESSAGE,
    PAYMENT_STATUS,
} from "../src/config/status.js";
import OrderService, {
    CONFIRMED_PAYMENT_STATUS_LOCKED_MESSAGE,
} from "../src/modules/orders/service/order.service.js";

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
    {
        id_pedido: 7,
        estado_pago: PAYMENT_STATUS.CONFIRMADO,
        id_estado_pago: 2,
        id_etapa_general: 2,
    },
];

let orders;
let paymentRecords;
let stageTransitions;
const PIN_ACTOR = { idUsuario: 10 };

beforeEach(() => {
    orders = INITIAL_ORDERS.map((order) => ({ ...order }));
    paymentRecords = [];
    stageTransitions = [];
});

function findOrder(orderId) {
    return orders.find((order) => Number(order.id_pedido) === Number(orderId));
}

function createService(overrides = {}) {
    return new OrderService({
        repo: {
            async get(orderId) {
                return findOrder(orderId) ?? null;
            },
            async getTransitionState(orderId) {
                const order = findOrder(orderId);
                return order ? { ...order, id_estado_pedido: order.id_etapa_general + 1 } : null;
            },
            async updatePaymentStatus(orderId, paymentStatusId, nextKanbanOrder) {
                const order = findOrder(orderId);

                if (!order) return null;

                order.id_estado_pago = Number(paymentStatusId);
                order.estado_pago = {
                    1: PAYMENT_STATUS.PENDIENTE,
                    2: PAYMENT_STATUS.CONFIRMADO,
                    3: PAYMENT_STATUS.RECHAZADO,
                }[Number(paymentStatusId)];
                order.id_etapa_general = Number(nextKanbanOrder);

                return { ...order };
            },
            async updateGeneralStep(orderId, stepId, audit) {
                const order = findOrder(orderId);

                if (!order) return null;

                order.id_etapa_general = Number(stepId);
                stageTransitions.push({ orderId, stepId, ...audit });

                return { ...order };
            },
            async sendToReview(orderId, audit) {
                const order = findOrder(orderId);
                if (!order) return null;
                order.id_etapa_general = 6;
                stageTransitions.push({ orderId, review: true, ...audit });
                return { ...order };
            },
            async cancelProduction(orderId, audit) {
                const order = findOrder(orderId);
                if (!order) return null;
                order.id_etapa_general = 5;
                order.nombre_etapa_general = "Cancelado";
                stageTransitions.push({ orderId, cancelled: true, ...audit });
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

                if (Number(paymentStatusId) === 3) {
                    return { id_estado_Pago: 3, nombre_estado_pago: PAYMENT_STATUS.RECHAZADO };
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
        userRepo: {
            async findByAuth0Id(auth0UserId) {
                if (auth0UserId === "auth0|user-10") {
                    return { idUsuario: 10 };
                }

                return null;
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

test("al dejar pago pendiente desde rechazado devuelve la orden a Confirmacion de pago", async () => {
    const service = createService();
    await service.updPaymentState(1, 3, { id_usuario: 10 });

    const order = await service.updPaymentState(1, 1, { id_usuario: 10 });

    assert.equal(order.estado_pago, "Pendiente");
    assert.equal(order.id_etapa_general, 0);
});

test("al rechazar pago usa el estado real 3 y registra auditoria", async () => {
    const service = createService();
    const order = await service.updPaymentState(1, 3, { id_usuario: 10 });

    assert.equal(order.estado_pago, "Rechazado");
    assert.equal(order.id_etapa_general, 0);
    assert.deepEqual(paymentRecords, [
        {
            orderId: 1,
            id_usuario: 10,
            id_estado_pago: 3,
            observacion: undefined,
        },
    ]);
});

test("bloquea devolver un pago confirmado a pendiente sin crear auditoria", async () => {
    const service = createService();

    await assert.rejects(
        () => service.updPaymentState(6, 1, { id_usuario: 10 }),
        {
            statusCode: 409,
            message: CONFIRMED_PAYMENT_STATUS_LOCKED_MESSAGE,
        },
    );

    assert.deepEqual(paymentRecords, []);
});

test("bloquea rechazar un pago confirmado sin crear auditoria", async () => {
    const service = createService();

    await assert.rejects(
        () => service.updPaymentState(6, 3, { id_usuario: 10 }),
        {
            statusCode: 409,
            message: CONFIRMED_PAYMENT_STATUS_LOCKED_MESSAGE,
        },
    );

    assert.deepEqual(paymentRecords, []);
});

test("no registra auditoria si el pago ya estaba confirmado", async () => {
    const service = createService();
    const order = await service.updPaymentState(6, 2, { id_usuario: 10 });

    assert.equal(order.estado_pago, PAYMENT_STATUS.CONFIRMADO);
    assert.deepEqual(paymentRecords, []);
});

test("resuelve usuario interno desde Auth0 al registrar pago", async () => {
    const service = createService();
    await service.updPaymentState(1, 2, { auth0UserId: "auth0|user-10" });

    assert.deepEqual(paymentRecords, [
        {
            orderId: 1,
            id_usuario: 10,
            id_estado_pago: 2,
            observacion: undefined,
        },
    ]);
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
    const order = await service.updGeneralStep(6, 1, { actor: PIN_ACTOR });

    assert.equal(order.id_estado_pago, 2);
    assert.equal(order.id_etapa_general, 1);
});

test("bloquea mover a En produccion sin permiso admin", async () => {
    const service = createService();

    await assert.rejects(
        () => service.updGeneralStep(6, 2, { permissions: ["view:kanban-module"], actor: PIN_ACTOR }),
        {
            statusCode: 403,
            message: KANBAN_MOVE_TO_PRODUCTION_PERMISSION_MESSAGE,
        },
    );
});

test("permite mover a En produccion con el permiso requerido", async () => {
    const service = createService();
    const order = await service.updGeneralStep(6, 2, {
        permissions: [MOVE_KANBAN_TO_PRODUCTION_PERMISSION],
        actor: PIN_ACTOR,
    });

    assert.equal(order.id_estado_pago, 2);
    assert.equal(order.id_etapa_general, 2);
    assert.deepEqual(stageTransitions, [{
        orderId: 6,
        stepId: 2,
        userId: 10,
        comment: undefined,
        expectedState: { id_estado_pedido: 2, id_estado_pago: 2 },
    }]);
});

test("envia pedido a revision con usuario y comentario", async () => {
    const service = createService();
    const order = await service.sendToReview(6, "Corregir diseño", {
        auth0UserId: "auth0|user-10",
    });

    assert.equal(order.id_etapa_general, 6);
    assert.deepEqual(stageTransitions, [{
        orderId: 6,
        review: true,
        userId: 10,
        comment: "Corregir diseño",
    }]);
});

test("cancela produccion con actor PIN y deja observacion", async () => {
    const service = createService();
    const order = await service.cancelProduction(7, "Cliente cancelo el pedido", {
        actor: PIN_ACTOR,
    });

    assert.equal(order.nombre_etapa_general, "Cancelado");
    assert.deepEqual(stageTransitions, [{
        orderId: 7,
        cancelled: true,
        userId: 10,
        comment: "Cliente cancelo el pedido",
    }]);
});

test("rechaza cancelacion sin observacion", async () => {
    const service = createService();
    await assert.rejects(
        () => service.cancelProduction(7, "", { actor: PIN_ACTOR }),
        { statusCode: 400 },
    );
});

test("bloquea saltar desde Confirmacion de pago directo a En produccion", async () => {
    const service = createService();

    await assert.rejects(
        () => service.updGeneralStep(1, 2, {
            permissions: [MOVE_KANBAN_TO_PRODUCTION_PERMISSION],
        }),
        {
            statusCode: 409,
            message: KANBAN_STAGE_SKIP_MESSAGE,
        },
    );
});

test("bloquea saltar desde Listo para produccion directo a Listo para entrega", async () => {
    const service = createService();

    await assert.rejects(
        () => service.updGeneralStep(6, 3, { actor: PIN_ACTOR }),
        {
            statusCode: 409,
            message: KANBAN_STAGE_SKIP_MESSAGE,
        },
    );
});

test("permite mover de En produccion a Listo para entrega", async () => {
    const service = createService();
    const order = await service.updGeneralStep(7, 3, { actor: PIN_ACTOR });

    assert.equal(order.id_estado_pago, 2);
    assert.equal(order.id_etapa_general, 3);
});
