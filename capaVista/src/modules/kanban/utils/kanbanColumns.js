

export const MOVE_TO_PRODUCTION_PERMISSION_MESSAGE = 'Solo un administrador puede mover pedidos a En produccion.'

export const STAGE_SKIP_MESSAGE = 'No puedes saltar etapas del pedido.'

export const STAGE_BACKWARD_MESSAGE = 'No puedes retroceder en las etapas del pedido.'

export const KANBAN_EN_PRODUCCION_STEP = 2

export const KANBAN_LISTO_PRODUCCION_STEP = 1

export const KANBAN_REVISION_STEP = 6

export const baseColumns = [
  {
    id: 'confirmacion-pago',
    title: 'Confirmacion de pago',
    generalStepId: 0,
    accent: '#f97316',
    icon: 'bi-cash-coin',
  },
  {
    id: 'listo-produccion',
    title: 'Listo para produccion',
    generalStepId: 1,
    accent: '#2563eb',
    icon: 'bi-clipboard-check',
  },
  {
    id: 'en-produccion',
    title: 'En produccion',
    generalStepId: 2,
    accent: '#d97706',
    icon: 'bi-gear-wide-connected',
  },
  {
    id: 'listo-entrega',
    title: 'Listo para entrega',
    generalStepId: 3,
    accent: '#248f55',
    icon: 'bi-check2-circle',
  },
  { id: 'en-revision', title: 'En revision', generalStepId: KANBAN_REVISION_STEP, accent: '#dc2626', icon: 'bi-search' },
]

export function getColumnTitleByStepId(stepId) {
  const column = baseColumns.find((item) => Number(item.generalStepId) === Number(stepId))
  return column?.title ?? 'Confirmacion de pago'
}
