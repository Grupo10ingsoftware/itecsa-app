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

export const PAYMENT_CONFIRMATION_REQUIRED_MESSAGE =
    "Pedido en espera de confirmacion de pago";

export const UPDATE_PAYMENT_STATUS_PERMISSION = "update:payment-status";

export const MOVE_KANBAN_TO_PRODUCTION_PERMISSION =
    "start:production";

export const KANBAN_EN_PRODUCCION_STEP = 2;

export const KANBAN_MOVE_TO_PRODUCTION_PERMISSION_MESSAGE =
    "Solo un administrador puede mover pedidos a En produccion.";

export const KANBAN_STAGE_SKIP_MESSAGE =
    "No puedes saltar etapas del pedido.";
