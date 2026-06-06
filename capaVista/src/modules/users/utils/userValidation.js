import { OFFICIAL_ROLES } from '../../../config/roles'

const LETTERS_AND_SPACES_PATTERN = /^[A-Za-z\u00c1\u00c9\u00cd\u00d3\u00da\u00e1\u00e9\u00ed\u00f3\u00fa\u00d1\u00f1\u00dc\u00fc\s]+$/

function validateRequiredText(value, requiredMessage) {
  return value.trim() ? [] : [requiredMessage]
}

function normalizeRut(value) {
  return value.replace(/[^0-9kK]/g, '').toUpperCase().slice(0, 9)
}

export function formatRut(value) {
  const normalizedRut = normalizeRut(value)

  if (normalizedRut.length <= 1) {
    return normalizedRut
  }

  const body = normalizedRut.slice(0, -1)
  const verifier = normalizedRut.slice(-1)
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  return `${formattedBody}-${verifier}`
}

export function validateRut(value) {
  const normalizedRut = normalizeRut(value)
  const errors = validateRequiredText(normalizedRut, 'El RUT es obligatorio.')

  if (errors.length > 0) {
    return errors
  }

  const body = normalizedRut.slice(0, -1)
  const verifier = normalizedRut.slice(-1)

  if (!/^\d{7,8}$/.test(body) || !/^[0-9K]$/.test(verifier)) {
    return ['Ingresa un RUT válido.']
  }

  let sum = 0
  let multiplier = 2

  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }

  const remainder = 11 - (sum % 11)
  const expectedVerifier = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder)

  return verifier === expectedVerifier ? [] : ['Ingresa un RUT válido.']
}

export function validatePersonName(value, fieldLabel) {
  const errors = validateRequiredText(value, `${fieldLabel} es obligatorio.`)

  if (errors.length === 0 && !LETTERS_AND_SPACES_PATTERN.test(value.trim())) {
    errors.push(`${fieldLabel} solo debe contener letras y espacios.`)
  }

  return errors
}

export function validateEmail(value) {
  const trimmedEmail = value.trim()
  const errors = validateRequiredText(trimmedEmail, 'El correo electronico es obligatorio.')
  const atMatches = trimmedEmail.match(/@/g) ?? []
  const [, domain = ''] = trimmedEmail.split('@')

  if (/\s/.test(value)) {
    errors.push('El correo no debe contener espacios.')
  }

  if (atMatches.length > 1) {
    errors.push('El correo no debe contener multiples arrobas.')
  }

  if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.push('Ingresa un correo con formato texto@dominio.extension.')
  }

  if (trimmedEmail && atMatches.length === 1 && !domain.includes('.')) {
    errors.push('El dominio del correo debe incluir al menos un punto.')
  }

  return errors
}

export function validateRole(value) {
  const errors = validateRequiredText(value, 'El rol es obligatorio.')

  if (errors.length === 0 && !OFFICIAL_ROLES.includes(value)) {
    errors.push('Selecciona un rol oficial.')
  }

  return errors
}

export function validateUserCreateForm(values) {
  return {
    primerNombre: validatePersonName(values.primerNombre, 'El primer nombre'),
    apellidoPaterno: validatePersonName(values.apellidoPaterno, 'El apellido paterno'),
    correoUsuario: validateEmail(values.correoUsuario),
    rutUsuario: validateRut(values.rutUsuario),
    rolUsuario: validateRole(values.rolUsuario),
  }
}

export function hasValidationErrors(errors) {
  return Object.values(errors).some((fieldErrors) => fieldErrors.length > 0)
}
