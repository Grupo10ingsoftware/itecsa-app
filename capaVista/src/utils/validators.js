
/**
 * validators — validaciones reutilizables para formularios del sistema.
 * Cada función devuelve `null` cuando el valor es válido o un
 * mensaje de error cuando no lo es.
 */

/**
 * Valida que un campo de texto no esté vacío.
 * @param {any}    value
 * @param {string} [fieldName='Campo'] — nombre del campo en el mensaje de error
 * @returns {string|null}
 */
export function required(value, fieldName = 'Campo') {
  if (value === null || value === undefined || value === '') {
    return `El campo "${fieldName}" es obligatorio.`
  }
  return null
}

/**
 * Valida que un archivo haya sido seleccionado.
 * @param {File|null} file
 * @param {string}    [fieldName='Archivo']
 * @returns {string|null}
 */
export function requiredFile(file, fieldName = 'Archivo') {
  if (!file) {
    return `El archivo "${fieldName}" es obligatorio.`
  }
  return null
}

/**
 * Valida que un archivo sea de tipo PDF.
 * @param {File|null} file
 * @returns {string|null}
 */
export function isPdf(file) {
  if (!file) return null
  const isPdfType = file.type === 'application/pdf'
  const isPdfName = file.name.toLowerCase().endsWith('.pdf')
  if (!isPdfType && !isPdfName) {
    return 'El archivo debe estar en formato PDF.'
  }
  return null
}

/**
 * Valida que el tamaño de un archivo no supere el límite dado en MB.
 * @param {File|null} file
 * @param {number}   maxMB
 * @returns {string|null}
 */
export function maxFileSize(file, maxMB) {
  if (!file) return null
  const maxBytes = maxMB * 1024 * 1024
  if (file.size > maxBytes) {
    return `El archivo supera el tamaño máximo de ${maxMB} MB permitido.`
  }
  return null
}

/**
 * Valida que un número sea mayor a cero.
 * @param {any} value
 * @returns {string|null}
 */
export function greaterThanZero(value) {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  if (isNaN(num) || num <= 0) {
    return 'El valor debe ser mayor a cero.'
  }
  return null
}

/**
 * Combina múltiples validadores y devuelve el primer error encontrado.
 * @param {Array<{validate:Function, args:Array}>} validators
 * @returns {string|null}
 */
export function validateAll(validators) {
  for (const { validate, args } of validators) {
    const result = validate(...(args || []))
    if (result) return result
  }
  return null
}
