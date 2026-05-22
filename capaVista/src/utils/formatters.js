export function formatDateTimeDDMMYYYY(value) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Fecha no disponible'
  }

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatRut(value) {
  const rut = String(value ?? '').trim().toUpperCase()

  if (!rut) {
    return 'RUT no disponible'
  }

  return rut
}
