const STATUS_CLASS_BY_TEXT = Object.freeze({
  pendiente: 'text-bg-warning',
  confirmado: 'text-bg-success',
  rechazado: 'text-bg-danger',
  solicitado: 'text-bg-secondary',
  'listo para produccion': 'text-bg-info',
  'en produccion': 'text-bg-primary',
  finalizado: 'text-bg-success',
})

export default function StatusBadge({ status, label }) {
  const normalizedStatus = String(status ?? '').toLowerCase()
  const badgeClass = STATUS_CLASS_BY_TEXT[normalizedStatus] ?? 'text-bg-light'

  return <span className={`badge ${badgeClass}`}>{label ?? status}</span>
}
