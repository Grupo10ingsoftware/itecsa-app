// Una exportación es un nuevo tratamiento: comprobar acceso/restricciones en la API.
export async function loadMetricsForExport(api, selectedPeriod) {
  const period = { from: selectedPeriod.from, to: selectedPeriod.to }
  const summary = await api.getSummary(period)
  if (!Array.isArray(summary?.sellerCompliance)) throw new Error('No fue posible preparar el reporte.')
  return { period, rows: summary.sellerCompliance }
}

export function escapeReportHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
}

export function spreadsheetCell(value) {
  if (typeof value !== 'string') return String(value ?? '')
  const text = value.replace(/[\t\r\n]/g, ' ')
  return /^\s*[=+\-@]/.test(text) ? `'${text}` : text
}
