import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
    KANBAN_MOVE_TO_PRODUCTION_PERMISSION_MESSAGE,
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
];

let orders;
let paymentRecords;
let paymentSignatures;

beforeEach(() => {
    orders = INITIAL_ORDERS.map((order) => ({ ...order }));
    paymentRecords = [];
    paymentSignatures = [];
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
        paymentSignatureService: overrides.paymentSignatureService ?? {
            async signPaymentDocument(orderId, userId) {
                paymentSignatures.push({ orderId, userId });
                return paymentSignatures.at(-1);
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
    assert.deepEqual(paymentSignatures, [{ orderId: 1, userId: 10 }]);
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
    assert.deepEqual(paymentSignatures, []);
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
    assert.deepEqual(paymentSignatures, []);
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
    assert.deepEqual(paymentSignatures, []);
});

test("no regenera firma ni auditoria si el pago ya estaba confirmado", async () => {
    const service = createService();
    const order = await service.updPaymentState(6, 2, { id_usuario: 10 });

    assert.equal(order.estado_pago, PAYMENT_STATUS.CONFIRMADO);
    assert.deepEqual(paymentRecords, []);
    assert.deepEqual(paymentSignatures, []);
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
    assert.deepEqual(paymentSignatures, [{ orderId: 1, userId: 10 }]);
});

test("si falla la firma no actualiza pago ni auditoria", async () => {
    const service = createService({
        paymentSignatureService: {
            async signPaymentDocument() {
                const error = new Error("No fue posible firmar la Nota de Venta.");
                error.statusCode = 409;
                throw error;
            },
        },
    });

    await assert.rejects(
        () => service.updPaymentState(1, 2, { id_usuario: 10 }),
        {
            statusCode: 409,
            message: "No fue posible firmar la Nota de Venta.",
        },
    );

    assert.equal(findOrder(1).estado_pago, PAYMENT_STATUS.PENDIENTE);
    assert.deepEqual(paymentRecords, []);
    assert.deepEqual(paymentSignatures, []);
});

test("obtiene evidencia de firma de pago desde ruta segura", async () => {
    const service = createService({
        paymentSignatureService: {
            async getOrderSalesNote() {
                return {
                    id_documento: 1,
                    Firma_Documento: [
                        {
                            id_usuario: 3,
                            Firma_Pago: { id_firma_documento: 1 },
                        },
                    ],
                };
            },
            async getUserSignature() {
                return {
                    ruta_firma:
                        "itecsa-app\\data\\Firmas\\firma-1780976763211-b5b6a56b-8f24-4bca-ab7b-0518bc2a78a6.pdf",
                };
            },
        },
    });

    const evidence = await service.getPaymentSignatureEvidence(1);

    assert.match(evidence.filePath, /data[\\/]Firmas[\\/]firma-.*\.pdf$/);
});

test("rechaza evidencia si el pedido no tiene firma de pago", async () => {
    const service = createService({
        paymentSignatureService: {
            async getOrderSalesNote() {
                return {
                    id_documento: 1,
                    Firma_Documento: [],
                };
            },
        },
    });

    await assert.rejects(
        () => service.getPaymentSignatureEvidence(1),
        {
            statusCode: 404,
            message: "El pedido no tiene evidencia de firma de pago.",
        },
    );
});

test("rechaza evidencia si la ruta de firma sale de data/Firmas", async () => {
    const service = createService({
        paymentSignatureService: {
            async getOrderSalesNote() {
                return {
                    id_documento: 1,
                    Firma_Documento: [
                        {
                            id_usuario: 3,
                            Firma_Pago: { id_firma_documento: 1 },
                        },
                    ],
                };
            },
            async getUserSignature() {
                return {
                    ruta_firma: "itecsa-app\\data\\NVS\\Pedido1.pdf",
                };
            },
        },
    });

    await assert.rejects(
        () => service.getPaymentSignatureEvidence(1),
        {
            statusCode: 409,
            message: "La evidencia de firma no tiene una ruta valida.",
        },
    );
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

test("bloquea mover a En produccion sin permiso admin", async () => {
    const service = createService();

    await assert.rejects(
        () => service.updGeneralStep(6, 2, { permissions: ["view:kanban-module"] }),
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
    });

    assert.equal(order.id_estado_pago, 2);
    assert.equal(order.id_etapa_general, 2);
});
