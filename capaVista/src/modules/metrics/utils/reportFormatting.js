export function escapeReportHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
}

export function spreadsheetCell(value) {
  if (typeof value !== 'string') return String(value ?? '')
  const text = value.replace(/[\t\r\n]/g, ' ')
  return /^\s*[=+\-@]/.test(text) ? `'${text}` : text
}
