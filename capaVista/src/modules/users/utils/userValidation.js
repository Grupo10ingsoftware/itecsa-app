import { OFFICIAL_ROLES } from '../../../config/roles'
import { getPasswordRuleResults } from '../../auth/utils/authValidation'

export const DUPLICATED_EMAIL_MESSAGE = 'El correo ingresado ya está asociado a una cuenta'

const LETTERS_AND_SPACES_PATTERN = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/
const RUT_VISUAL_PATTERN = /^\d{1,2}\.\d{3}\.\d{3}-[\dK]$/
const ALLOWED_SIGNATURE_EXTENSIONS = Object.freeze(['.xml', '.cms', '.pdf'])

export function normalizeRut(rut) {
  return rut.trim().toUpperCase()
}

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

export function validateRut(value) {
  const normalizedRut = normalizeRut(value)
  const errors = validateRequiredText(normalizedRut, 'El RUT es obligatorio.')

  // Validacion preventiva visual: el calculo definitivo del digito verificador queda para backend.
  if (errors.length === 0 && !RUT_VISUAL_PATTERN.test(normalizedRut)) {
    errors.push('Ingresa un RUT con formato 12.345.678-9 o 12.345.678-K.')
  }

  return errors
}

export function validateEmail(value, existingUsers) {
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

  // Unicidad simulada contra MOCK_USERS: la unicidad real debe validarse en backend.
  const isDuplicatedEmail = existingUsers.some((user) => {
    const userEmail = user.correoUsuario ?? user.email

    return userEmail?.toLowerCase() === trimmedEmail.toLowerCase()
  })

  if (trimmedEmail && isDuplicatedEmail) {
    errors.push(DUPLICATED_EMAIL_MESSAGE)
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

export function validatePassword(value) {
  const errors = validateRequiredText(value, 'La contraseña es obligatoria.')
  const ruleResults = getPasswordRuleResults(value)

  if (errors.length === 0 && ruleResults.some((rule) => !rule.isValid)) {
    errors.push('La contraseña debe cumplir todas las reglas indicadas.')
  }

  return errors
}

export function validateSignatureReference(value) {
  const trimmedValue = value.trim()
  const errors = validateRequiredText(trimmedValue, 'La firma electronica es obligatoria.')
  const lowerValue = trimmedValue.toLowerCase()
  const hasAllowedExtension = ALLOWED_SIGNATURE_EXTENSIONS.some((extension) => {
    return lowerValue.endsWith(extension)
  })

  // En MER 06 la firma electronica se representa como referencia documental, no como binario dentro de Usuario.
  if (errors.length === 0 && !hasAllowedExtension) {
    errors.push('La firma electronica debe tener extension .xml, .cms o .pdf.')
  }

  return errors
}

export function validateUserCreateForm(values, existingUsers) {
  return {
    primerNombre: validatePersonName(values.primerNombre, 'El primer nombre'),
    apellidoPaterno: validatePersonName(values.apellidoPaterno, 'El apellido paterno'),
    rutUsuario: validateRut(values.rutUsuario),
    correoUsuario: validateEmail(values.correoUsuario, existingUsers),
    rolUsuario: validateRole(values.rolUsuario),
    password: validatePassword(values.password),
    referenciaFirmaElectronica: validateSignatureReference(values.referenciaFirmaElectronica),
  }
}

export function hasValidationErrors(errors) {
  return Object.values(errors).some((fieldErrors) => fieldErrors.length > 0)
}
