export function formatProfileDate(value) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return 'Fecha no disponible'
  const parts = new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago', day: '2-digit', month: '2-digit', year: 'numeric',
  }).formatToParts(date)
  const part = (type) => parts.find((item) => item.type === type).value
  return `${part('day')}-${part('month')}-${part('year')}`
}

