// Technical form contract, shared by browser and API. No legal decisions here.
export const REQUEST_TYPES = Object.freeze([
  { value: 'access', label: 'Acceso', icon: 'bi-eye', description: 'Conocer qué datos personales tenemos sobre ti.' },
  { value: 'rectification', label: 'Rectificación', icon: 'bi-pencil', description: 'Solicitar la corrección de datos inexactos o incompletos.' },
  { value: 'erasure', label: 'Eliminación', icon: 'bi-trash', description: 'Solicitar la eliminación de tus datos cuando corresponda.' },
  { value: 'opposition', label: 'Oposición', icon: 'bi-slash-circle', description: 'Oponerte al tratamiento de tus datos en determinados casos.' },
  { value: 'portability', label: 'Portabilidad', icon: 'bi-arrow-left-right', description: 'Solicitar una copia de tus datos cuando corresponda.' },
  { value: 'blocking', label: 'Bloqueo', icon: 'bi-lock', description: 'Solicitar la limitación temporal del tratamiento de tus datos.' },
])

// No previous technical subject/description limits exist for this new channel.
export const REQUEST_LIMITS = Object.freeze({ subject: 150, description: 1000, email: 254 })
export const DOCUMENT_IDS = Object.freeze(['notice', 'terms', 'policy', 'procedure'])

export function isContactEmail(value) {
  return typeof value === 'string' && value.length <= REQUEST_LIMITS.email && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value)
}

export function validateRequestFields(values = {}) {
  const errors = {}
  if (!REQUEST_TYPES.some(type => type.value === values.type)) errors.type = 'Selecciona un tipo de solicitud.'
  for (const field of ['subject', 'description']) {
    const value = values[field]
    if (typeof value !== 'string' || !value.trim()) errors[field] = field === 'subject' ? 'Ingresa el asunto.' : 'Describe tu solicitud.'
    else if (value.length > REQUEST_LIMITS[field]) errors[field] = `El máximo es ${REQUEST_LIMITS[field]} caracteres.`
    else if ((field === 'subject' && /[\r\n]/.test(value)) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) errors[field] = 'El texto contiene caracteres no permitidos.'
  }
  if (!isContactEmail(values.email)) errors.email = 'Tu cuenta debe tener un correo de contacto válido.'
  return errors
}
