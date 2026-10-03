import { useNavigate } from 'react-router-dom'
import { INCIDENT_LIMITS, INCIDENT_MODULES } from '../../../../../shared/incidentReports'
import { APP_ROUTES } from '../../../config/routes'
import TextInput from '../../../shared/components/forms/TextInput'
import SelectInput from '../../../shared/components/forms/SelectInput'
import { useIncidentReportForm } from '../hooks/useIncidentReportForm'
import common from '../../privacy/pages/PrivacyPages.module.css'
import styles from '../pages/IncidentReportPage.module.css'

function openDatePicker(event) {
  const input = event.currentTarget
  input.focus({ preventScroll: true })
  try { input.showPicker?.() } catch { /* Keep native editing available when the browser cannot open the picker. */ }
}

export default function IncidentReportForm({ email, sendReport, enabled, checking, configurationError, retryConfiguration }) {
  const navigate = useNavigate()
  const { values, errors, busy, frozen, feedback, change, submit } = useIncidentReportForm({ email, sendReport, enabled })
  const disabled = busy || frozen
  return <form className={`${common.requestForm} ${styles.reportForm}`} noValidate onSubmit={submit} aria-busy={busy}>
    {feedback && <div className={`alert alert-${feedback.kind}`} role={feedback.kind === 'success' ? 'status' : 'alert'}>
      <p className="mb-1">{feedback.message}</p>
      {feedback.reference && <p className={`mb-0 ${common.reference}`}>Identificador: <strong>{feedback.reference}</strong></p>}
      {feedback.receivedAt && <small>Recepción: {new Date(feedback.receivedAt).toLocaleString('es-CL', { timeZone: 'America/Santiago' })}</small>}
    </div>}
    {checking && <p role="status">Comprobando disponibilidad del canal… Puedes completar tu reporte mientras esperamos la confirmación.</p>}
    {configurationError && <div className="alert alert-danger" role="alert">{configurationError} <button className="btn btn-outline-dark btn-sm" onClick={retryConfiguration} type="button">Reintentar</button></div>}
    {!checking && !configurationError && !enabled && <div className="alert alert-secondary" role="status">El canal de reportes está pendiente de configuración por Itecsa.</div>}
    <div className="mb-3">
      <label className="form-label" htmlFor="incident-description">¿Qué ocurrió? <span className={common.required}>*</span></label>
      <textarea id="incident-description" name="description" className={`form-control ${errors.description ? 'is-invalid' : ''}`} rows={4} required disabled={disabled} value={values.description} onChange={change} maxLength={INCIDENT_LIMITS.description} placeholder="Describe en detalle lo que observaste. Incluye qué estabas haciendo, qué pasó y cualquier información relevante." aria-invalid={errors.description ? true : undefined} aria-describedby={`incident-description-hint${errors.description ? ' incident-description-error' : ''}`} />
      {errors.description && <div id="incident-description-error" className="invalid-feedback d-block">{errors.description}</div>}
      <small id="incident-description-hint">Entre 10 y {INCIDENT_LIMITS.description} caracteres. No incluyas contraseñas, PIN, tokens ni datos innecesarios de otras personas.</small>
    </div>
    <div className={`${common.contactFields} ${styles.contextFields}`}>
      <TextInput id="incident-observed" name="observedAt" type="datetime-local" label={<>¿Cuándo lo observaste? <span className={common.required}>*</span></>} value={values.observedAt} onChange={change} onClick={openDatePicker} required disabled={disabled} error={errors.observedAt} describedBy="incident-date-hint" />
      <SelectInput id="incident-module" name="module" label={<>Módulo o servicio <span className={common.required}>*</span></>} placeholder="Selecciona una opción" options={INCIDENT_MODULES} value={values.module} onChange={change} required disabled={disabled} error={errors.module} className={common.field} />
    </div>
    <small id="incident-date-hint">Fecha y hora local de tu dispositivo; se remite también en UTC.</small>
    <TextInput id="incident-reference" name="technicalReference" label="Referencia técnica (opcional)" placeholder="Ej: ID de pedido, URL, mensaje de error, código, etc." value={values.technicalReference} onChange={change} disabled={disabled} error={errors.technicalReference} maxLength={INCIDENT_LIMITS.technicalReference} />
    <TextInput id="incident-email" name="email" type="email" label={<>Correo de contacto <span className={common.required}>*</span></>} value={email} placeholder={checking ? 'Comprobando correo de contacto…' : undefined} readOnly required error={errors.email} autoComplete="email" describedBy="incident-email-hint" />
    <small id="incident-email-hint">Te contactaremos si necesitamos más información sobre este reporte.</small>
    <div className={common.formActions}>
      <button className={common.cancelButton} type="button" disabled={busy} onClick={() => navigate(APP_ROUTES.KANBAN)}>Cancelar</button>
      <button className={`${common.sendButton} ${styles.sendButton}`} type="submit" disabled={busy || !enabled}>
        {busy ? <span className="spinner-border spinner-border-sm" aria-hidden="true" /> : <i className="bi bi-shield-fill" aria-hidden="true" />}
        {busy ? 'Enviando…' : 'Enviar reporte'}
      </button>
    </div>
  </form>
}
