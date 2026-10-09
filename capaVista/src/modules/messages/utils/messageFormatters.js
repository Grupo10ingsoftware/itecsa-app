export function formatMessageDate(value, { includeTime = true } = {}) {
  if (!value) return 'Sin fecha'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date)
}

export function messagePreview(content, maxLength = 110) {
  const normalized = String(content ?? '').replace(/\s+/g, ' ').trim()
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength).trim()}…` : normalized
}

export function notifyMessagesChanged() {
  window.dispatchEvent(new CustomEvent('messages:changed'))
}
