import { OFFICIAL_ROLES } from '../../../config/roles'

const LETTERS_AND_SPACES_PATTERN = /^[A-Za-z\u00c1\u00c9\u00cd\u00d3\u00da\u00e1\u00e9\u00ed\u00f3\u00fa\u00d1\u00f1\u00dc\u00fc\s]+$/
const RUT_PATTERN = /^(\d{1,2}\.?\d{3}\.?\d{3}-[\dkK])$/

function validateRequiredText(value, requiredMessage) {
  return value.trim() ? [] : [requiredMessage]
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

export function validateRut(value) {
  const trimmedRut = value.trim()
  const errors = validateRequiredText(trimmedRut, 'El RUT es obligatorio.')

  if (trimmedRut && !RUT_PATTERN.test(trimmedRut)) {
    errors.push('Ingresa un RUT con formato 12.345.678-9 o 12345678-9.')
  }

  return errors
}

export function validateUserCreateForm(values) {
  return {
    nombreUsuario: validatePersonName(values.nombreUsuario, 'El nombre'),
    apellidoUsuario: validatePersonName(values.apellidoUsuario, 'El apellido'),
    rutUsuario: validateRut(values.rutUsuario),
    correoUsuario: validateEmail(values.correoUsuario),
    rolUsuario: validateRole(values.rolUsuario),
  }
}

export function hasValidationErrors(errors) {
  return Object.values(errors).some((fieldErrors) => fieldErrors.length > 0)
}
