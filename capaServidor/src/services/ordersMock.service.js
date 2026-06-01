import {
    ORDER_STATUS,
    ORDER_STATUS_VALUES,
    PAYMENT_STATUS,
    PAYMENT_STATUS_VALUES,
    RF32_WAITING_PAYMENT_MESSAGE,
} from "../config/status.js";

const INITIAL_ORDERS = Object.freeze([
    {
        id: "1",
        nvNumber: "NV-2024-0014",
        clientName: "Empresa Retail Chile Limitada",
        product: "Lanyard corporativo",
        paymentStatus: PAYMENT_STATUS.PENDIENTE,
        orderStatus: ORDER_STATUS.CONFIRMACION_PAGO,
    },
    {
        id: "2",
        nvNumber: "NV-2024-0008",
        clientName: "Grupo Logistico del Sur",
        product: "Lanyard de seguridad",
        paymentStatus: PAYMENT_STATUS.RECHAZADO,
        orderStatus: ORDER_STATUS.CONFIRMACION_PAGO,
    },
    {
        id: "3",
        nvNumber: "NV-2024-0039",
        clientName: "Tecnologia Educativa S.A.",
        product: "Set mixto",
        paymentStatus: PAYMENT_STATUS.CONFIRMADO,
        orderStatus: ORDER_STATUS.LISTO_PRODUCCION,
    },
]);

export class OrdersServiceError extends Error {
    constructor(code, message, statusCode) {
        super(message);
        this.name = "OrdersServiceError";
        this.code = code;
        this.statusCode = statusCode;
    }
}

let orders = cloneOrders(INITIAL_ORDERS);

function cloneOrder(order) {
    return { ...order };
}

function cloneOrders(sourceOrders) {
    return sourceOrders.map(cloneOrder);
}

function findOrderIndex(orderId) {
    return orders.findIndex((order) => order.id === String(orderId));
}

function requireOrder(orderId) {
    const index = findOrderIndex(orderId);

    if (index === -1) {
        throw new OrdersServiceError(
            "ORDER_NOT_FOUND",
            "Pedido no encontrado.",
            404,
        );
    }

    return index;
}

function assertValidPaymentStatus(paymentStatus) {
    if (!PAYMENT_STATUS_VALUES.includes(paymentStatus)) {
        throw new OrdersServiceError(
            "INVALID_PAYMENT_STATUS",
            "El estado de pago no es valido.",
            400,
        );
    }
}

function assertValidOrderStatus(orderStatus) {
    if (!ORDER_STATUS_VALUES.includes(orderStatus)) {
        throw new OrdersServiceError(
            "INVALID_ORDER_STATUS",
            "El estado de destino no es valido.",
            400,
        );
    }
}

export function resetMockOrders() {
    orders = cloneOrders(INITIAL_ORDERS);
}

export function listOrders() {
    return cloneOrders(orders);
}

export function getKanbanBoard() {
    return {
        columns: ORDER_STATUS_VALUES,
        orders: listOrders(),
    };
}

export function updatePaymentStatus(orderId, paymentStatus) {
    assertValidPaymentStatus(paymentStatus);

    const index = requireOrder(orderId);
    const orderStatus =
        paymentStatus === PAYMENT_STATUS.CONFIRMADO
            ? ORDER_STATUS.LISTO_PRODUCCION
            : ORDER_STATUS.CONFIRMACION_PAGO;

    orders[index] = {
        ...orders[index],
        paymentStatus,
        orderStatus,
    };

    return cloneOrder(orders[index]);
}

export function moveOrder(orderId, targetStatus) {
    assertValidOrderStatus(targetStatus);

    const index = requireOrder(orderId);
    const order = orders[index];

    if (
        targetStatus === ORDER_STATUS.LISTO_PRODUCCION &&
        order.paymentStatus !== PAYMENT_STATUS.CONFIRMADO
    ) {
        throw new OrdersServiceError(
            "PAYMENT_CONFIRMATION_REQUIRED",
            RF32_WAITING_PAYMENT_MESSAGE,
            409,
        );
    }

    orders[index] = {
        ...order,
        orderStatus: targetStatus,
    };

    return cloneOrder(orders[index]);
}
