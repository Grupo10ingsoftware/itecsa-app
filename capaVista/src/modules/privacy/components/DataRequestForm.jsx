import { useNavigate } from 'react-router-dom'
import { REQUEST_LIMITS, REQUEST_TYPES } from '../../../../../shared/privacyRequests'
import { APP_ROUTES } from '../../../config/routes'
import TextInput from '../../../shared/components/forms/TextInput'
import SelectInput from '../../../shared/components/forms/SelectInput'
import { useDataRequestForm } from '../hooks/useDataRequestForm'
import styles from '../pages/PrivacyPages.module.css'

export default function DataRequestForm({ email, sendRequest, enabled }) {
  const navigate = useNavigate()
  const { values, errors, busy, frozen, feedback, change, submit } = useDataRequestForm({ email, sendRequest })
  const disabled = busy || frozen
  return <form className={styles.requestForm} noValidate onSubmit={submit} aria-busy={busy}>
    {feedback && <div className={`alert alert-${feedback.kind}`} role={feedback.kind === 'success' ? 'status' : 'alert'}>
      <p className="mb-1">{feedback.message}</p>
      {feedback.reference && <p className={`mb-0 ${styles.reference}`}>Identificador: <strong>{feedback.reference}</strong></p>}
      {feedback.receivedAt && <small>Recepción: {new Date(feedback.receivedAt).toLocaleString('es-CL', { timeZone: 'America/Santiago' })}</small>}
    </div>}
    {!enabled && <div className="alert alert-secondary" role="status">El canal de envío está pendiente de configuración por Itecsa.</div>}
    <SelectInput id="request-type" name="type" label={<>Tipo de solicitud <span className={styles.required}>*</span></>} placeholder="Selecciona un tipo de solicitud" options={REQUEST_TYPES.map(type => ({ value: type.value, label: type.label }))} value={values.type} onChange={change} required disabled={disabled} error={errors.type} className={styles.field} />
    <TextInput id="request-subject" name="subject" label={<>Asunto <span className={styles.required}>*</span></>} placeholder="Ej. Solicitud de acceso a mis datos" value={values.subject} onChange={change} required maxLength={REQUEST_LIMITS.subject} disabled={disabled} error={errors.subject} />
    <div className="mb-3">
      <label className="form-label" htmlFor="request-description">Descripción de la solicitud <span className={styles.required}>*</span></label>
      <textarea className={`form-control ${errors.description ? 'is-invalid' : ''}`} id="request-description" name="description" rows={5} placeholder="Describe tu solicitud con el mayor detalle posible..." value={values.description} onChange={change} maxLength={REQUEST_LIMITS.description} disabled={disabled} required aria-invalid={errors.description ? true : undefined} aria-describedby={`request-counter request-content-hint${errors.description ? ' request-description-error' : ''}`} />
      <div id="request-counter" className={styles.counter}>{values.description.length}/{REQUEST_LIMITS.description}</div>
      {errors.description && <div id="request-description-error" className="invalid-feedback d-block">{errors.description}</div>}
      <small id="request-content-hint">No incluyas contraseñas, PIN ni datos innecesarios de otras personas.</small>
    </div>
    <div className={styles.contactFields}>
      <TextInput id="request-email" name="email" type="email" label={<>Correo de contacto <span className={styles.required}>*</span></>} value={email} readOnly required autoComplete="email" maxLength={REQUEST_LIMITS.email} describedBy="request-email-hint" error={errors.email} />
      <div className="mb-3"><label className="form-label" htmlFor="request-attachment">Adjuntar archivo <span className={styles.optional}>(opcional)</span></label>
        <input className="form-control" id="request-attachment" type="file" disabled aria-describedby="request-attachment-hint" />
        <small id="request-attachment-hint">Los adjuntos todavía no están disponibles en este canal.</small>
      </div>
    </div>
    <small id="request-email-hint">El contacto corresponde al correo de tu cuenta autenticada.</small>
    <div className={styles.formActions}>
      <button className={styles.cancelButton} disabled={busy} onClick={() => navigate(APP_ROUTES.KANBAN)} type="button">Cancelar</button>
      <button className={styles.sendButton} disabled={busy || !enabled} type="submit">
        {busy ? <span className="spinner-border spinner-border-sm" aria-hidden="true" /> : <i className="bi bi-send" aria-hidden="true" />}
        {busy ? 'Enviando…' : 'Enviar solicitud'}
      </button>
    </div>
  </form>
}
