export const PAYMENT_STATUS = Object.freeze({
  PENDIENTE: 'Pendiente',
  CONFIRMADO: 'Confirmado',
  RECHAZADO: 'Rechazado',
})

export const ACTION_STATUS = Object.freeze({
  SOLICITADO: 'Solicitado',
  LISTO_PRODUCCION: 'Listo para produccion',
  EN_PRODUCCION: 'En produccion',
  FINALIZADO: 'Finalizado',
})

export const PAYMENT_STATUS_OPTIONS = Object.freeze(
  Object.values(PAYMENT_STATUS).map((status) => ({
    label: status,
    value: status,
  })),
)

export const ORDER_STATUS_OPTIONS = Object.freeze(
  Object.values(ACTION_STATUS).map((status) => ({
    label: status,
    value: status,
  })),
)
