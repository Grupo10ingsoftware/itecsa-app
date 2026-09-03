const DESIGN_FILE_MAX_SIZE_MB = 50
const DESIGN_FILE_EXTENSIONS = Object.freeze(['pdf'])

function isEmpty(value) {
  return value === null || value === undefined || String(value).trim() === ''
}

function hasExtension(file, extensions) {
  const extension = file?.name?.split('.').pop()?.toLowerCase()
  return Boolean(extension && extensions.includes(extension))
}

function isFileUnderLimit(file, maxSizeMB) {
  if (!file) return false
  return file.size <= maxSizeMB * 1024 * 1024
}

export function validateSalesNoteStep(draft) {
  const errors = {}

  if (isEmpty(draft.salesNoteCode)) {
    errors.salesNoteCode = 'Debe ingresar el codigo de Nota de Venta.'
  } else if (!draft.managerRecord) {
    errors.salesNoteCode = 'Debe buscar la informacion de la Nota de Venta antes de registrar.'
  }

  return errors
}

export function validateDesignFiles(files = []) {
  const invalidFile = files.find((file) => !hasExtension(file, DESIGN_FILE_EXTENSIONS))
  const oversizedFile = files.find((file) => !isFileUnderLimit(file, DESIGN_FILE_MAX_SIZE_MB))

  if (invalidFile) {
    return `El archivo ${invalidFile.name} no tiene un formato permitido. Formato aceptado: PDF.`
  }

  if (oversizedFile) {
    return `El archivo ${oversizedFile.name} supera ${DESIGN_FILE_MAX_SIZE_MB} MB.`
  }

  return null
}

export function canContinueFromSalesNote(draft) {
  return Object.keys(validateSalesNoteStep(draft)).length === 0
}
