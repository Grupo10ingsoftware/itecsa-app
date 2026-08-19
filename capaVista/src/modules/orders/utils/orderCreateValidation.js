import { EXISTING_SALES_NOTES } from '../mocks/orderCreate.mock'

const PDF_MAX_SIZE_MB = 10

function isEmpty(value) {
  return value === null || value === undefined || String(value).trim() === ''
}

function isPdfFile(file) {
  if (!file) return false
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

function isFileUnderLimit(file, maxSizeMB) {
  if (!file) return false
  return file.size <= maxSizeMB * 1024 * 1024
}

export function validateSalesNoteStep(draft) {
  const errors = {}
  const normalizedCode = draft.salesNoteCode?.trim().toUpperCase()

  if (isEmpty(draft.salesNoteCode)) {
    errors.salesNoteCode = 'Debe ingresar el código de Nota de Venta.'
  } else if (EXISTING_SALES_NOTES.includes(normalizedCode)) {
    errors.salesNoteCode = 'Ya existe un pedido registrado con esta Nota de Venta.'
  } else if (!draft.managerRecord) {
    errors.salesNoteCode = 'Debe buscar / exportar la información de la Nota de Venta antes de continuar.'
  }

  if (!draft.salesNotePdf) {
    errors.salesNotePdf = 'Debe adjuntar el archivo PDF de Nota de Venta.'
  } else if (!isPdfFile(draft.salesNotePdf)) {
    errors.salesNotePdf = 'El archivo de Nota de Venta debe estar en formato PDF.'
  } else if (!isFileUnderLimit(draft.salesNotePdf, PDF_MAX_SIZE_MB)) {
    errors.salesNotePdf = `El PDF no puede superar ${PDF_MAX_SIZE_MB} MB.`
  }

  return errors
}

export function canContinueFromSalesNote(draft) {
  return Object.keys(validateSalesNoteStep(draft)).length === 0
}
