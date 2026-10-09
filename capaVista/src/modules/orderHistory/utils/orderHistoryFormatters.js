export function formatDate(value) {
  if (!value) return 'No disponible'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No disponible'
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
  }).format(date)
}

export function formatDateTime(value) {
  if (!value) return 'No disponible'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No disponible'
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(date)
}

export function formatDuration(seconds) {
  if (!Number.isFinite(Number(seconds))) return null
  const total = Number(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const remainingSeconds = total % 60
  return [hours && `${hours} h`, minutes && `${minutes} min`, `${remainingSeconds} s`].filter(Boolean).join(' ')
}
