import { EXISTING_SALES_NOTES } from '../mocks/orderCreate.mock'

function isEmpty(value) {
  return value === null || value === undefined || String(value).trim() === ''
}

export function validateSalesNoteStep(draft) {
  const errors = {}
  const normalizedCode = draft.salesNoteCode?.trim().toUpperCase()

  if (isEmpty(draft.salesNoteCode)) {
    errors.salesNoteCode = 'Debe ingresar el codigo de Nota de Venta.'
  } else if (EXISTING_SALES_NOTES.includes(normalizedCode)) {
    errors.salesNoteCode = 'Ya existe un pedido registrado con esta Nota de Venta.'
  } else if (!draft.managerRecord) {
    errors.salesNoteCode = 'Debe consultar e importar la informacion de Manager antes de continuar.'
  }

  return errors
}

export function canContinueFromSalesNote(draft) {
  return Object.keys(validateSalesNoteStep(draft)).length === 0
}
