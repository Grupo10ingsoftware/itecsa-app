function isEmpty(value) {
  return value === null || value === undefined || String(value).trim() === ''
}

export function validateSalesNoteStep(draft) {
  const errors = {}

  if (isEmpty(draft.salesNoteCode)) {
    errors.salesNoteCode = 'Debe ingresar el codigo de Nota de Venta.'
  } else if (!draft.managerRecord) {
    errors.salesNoteCode = 'Debe buscar la informacion de la Nota de Venta antes de registrar.'
  }

  if ((draft.comments?.length ?? 0) > 300) {
    errors.comments = 'La observacion interna admite hasta 300 caracteres.'
  }

  return errors
}

export function canContinueFromSalesNote(draft) {
  return Object.keys(validateSalesNoteStep(draft)).length === 0
}
