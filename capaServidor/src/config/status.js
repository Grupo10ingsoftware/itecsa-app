export const PAYMENT_STATUS = Object.freeze({
    PENDIENTE: "Pendiente",
    CONFIRMADO: "Confirmado",
    RECHAZADO: "Rechazado",
});

export const ORDER_STATUS = Object.freeze({
    CONFIRMACION_PAGO: "Confirmacion de pago",
    LISTO_PRODUCCION: "Listo para produccion",
    EN_PRODUCCION: "En produccion",
    LISTO_ENTREGA: "Listo para entrega",
});

export const PAYMENT_STATUS_VALUES = Object.freeze(
    Object.values(PAYMENT_STATUS),
);

export const ORDER_STATUS_VALUES = Object.freeze(Object.values(ORDER_STATUS));

export const PAYMENT_CONFIRMATION_REQUIRED_MESSAGE =
    "Pedido en espera de confirmacion de pago";

export const UPDATE_PAYMENT_STATUS_PERMISSION = "update:payment-status";
