import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PRIVACY_RIGHTS, PRIVACY_LABELS } from '../../../../shared/privacy'
import { usePrivacyApi, privacyError, downloadPrivacyResponse } from './privacyApi'
import PrivacyCaseForm from './PrivacyCaseForm'

const STATUS = { received: 'Recibida', verified: 'Identidad verificada', reviewed: 'Derechos revisados', executed: 'Actuaciones registradas', response_ready: 'Respuesta disponible', responded: 'Respondida' }
function date(value) { return value ? new Date(value).toLocaleString('es-CL', { timeZone: 'America/Santiago' }) : '—' }
function Rights() { return <fieldset className="mb-3"><legend className="h6">Derechos solicitados</legend>{PRIVACY_RIGHTS.map(right => <label className="d-block" key={right}><input className="me-2" type="checkbox" name="rights" value={right} />{PRIVACY_LABELS[right]}</label>)}</fieldset> }
export function PrivacyRequestForm({ external, onSubmit, busy }) {
  const [requestId, setRequestId] = useState(() => crypto.randomUUID())
  async function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const rights = form.getAll('rights')
    if (!rights.length) return onSubmit(null, 'Selecciona al menos un derecho.')
    const body = { clientRequestId: requestId, rights, details: form.get('details'), blockingRequested: form.has('blockingRequested') }
    if (external) Object.assign(body, { name: form.get('name'), email: form.get('email'), receivedAt: new Date(form.get('receivedAt')).toISOString(), source: form.get('source'), acknowledgementChannel: form.get('acknowledgementChannel'), acknowledgementEvidence: form.get('acknowledgementEvidence') })
    const formElement = event.currentTarget
    if (await onSubmit(body)) { setRequestId(crypto.randomUUID()); formElement.reset() }
  }
  const fields = external ? [['name', 'Nombre del titular', 'text'], ['email', 'Contacto para respuesta', 'email'], ['receivedAt', 'Fecha y hora originales de ingreso', 'datetime-local'], ['source', 'Canal de ingreso', 'text'], ['acknowledgementChannel', 'Canal del acuse enviado', 'text'], ['acknowledgementEvidence', 'Referencia de remisión del acuse', 'text']] : []
  return <form onSubmit={submit} className="card card-body mb-4">
    <h2 className="h5">{external ? 'Registrar solicitud recibida por canal externo' : 'Nueva solicitud sobre mis datos'}</h2>
    <p>No incluyas contraseñas, PIN, códigos de recuperación ni datos innecesarios de otras personas.</p>
    {fields.map(([name, label, type]) => <div className="mb-3" key={name}><label className="form-label" htmlFor={`request-${name}`}>{label}</label><input className="form-control" id={`request-${name}`} name={name} type={type} required maxLength={name === 'acknowledgementEvidence' ? 1000 : name === 'source' || name === 'acknowledgementChannel' ? 100 : 255} /></div>)}
    <Rights />
    <label htmlFor="privacy-details" className="form-label">Datos o tratamiento afectados y lo que solicitas</label><textarea id="privacy-details" className="form-control mb-3" name="details" required maxLength={8000} />
    <label className="mb-3"><input className="me-2" type="checkbox" name="blockingRequested" />Solicito también suspensión temporal del tratamiento afectado.</label>
    <p>El acuse y los vencimientos quedan registrados. Consulta aquí el seguimiento y la respuesta; el responsable también podrá responder al contacto verificado.</p>
    <button className="btn btn-primary" disabled={busy} type="submit">Registrar solicitud</button>
  </form>
}

export default function PrivacyRequestsPage() {
  const api = usePrivacyApi()
  const [capabilities, setCapabilities] = useState({ ready: false, readCases: false, manageCases: false })
  const [staff, setStaff] = useState(false)
  const [state, setState] = useState({ requests: [], nextCursor: null })
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [discovery, setDiscovery] = useState(null)
  const [category, setCategory] = useState('profile')
  const [counts, setCounts] = useState(null)
  const prefix = staff ? '/privacy/cases' : '/privacy/requests'
  const load = useCallback(async () => {
    const results = await api.get(prefix)
    setState(results)
    if (staff) setCounts(await api.get('/privacy/cases/deadlines'))
  }, [api, prefix, staff])
  useEffect(() => {
    let active = true
    api.get('/privacy/capabilities').then(value => { if (active) setCapabilities({ ...value, ready: true }) }).catch(e => { if (active) setError(privacyError(e)) })
    return () => { active = false }
  }, [api])
  useEffect(() => {
    let active = true
    api.get(prefix).then(value => { if (active) setState(value) }).catch(e => { if (active) setError(privacyError(e)) })
    if (staff) api.get('/privacy/cases/deadlines').then(value => { if (active) setCounts(value) }).catch(e => { if (active) setError(privacyError(e)) })
    return () => { active = false }
  }, [api, prefix, staff])
  async function run(work) {
    setBusy(true); setError(''); setMessage('')
    try { await work(); return true } catch (e) { setError(privacyError(e)); return false } finally { setBusy(false) }
  }
  async function create(body, validation) {
    if (!body) return setError(validation)
    return run(async () => { const result = await api.post(prefix, body); setMessage(`Solicitud ${result.id} recibida. Vencimiento: ${date(result.dueAt)}.`); await load() })
  }
  async function select(id) { await run(async () => { setDiscovery(null); setSelected(await api.get(`${prefix}/${id}`)) }) }
  async function act(body, validation) {
    if (!body) return setError(validation)
    await run(async () => { await api.post(`${prefix}/${selected.id}/actions`, body); setSelected(await api.get(`${prefix}/${selected.id}`)); setMessage('Actuación registrada.'); await load() })
  }
  async function download() {
    await run(async () => {
      const response = await api.get(`${prefix}/${selected.id}/response`)
      downloadPrivacyResponse(response)
      if (!staff) await api.post(`${prefix}/${selected.id}/receipt`, {})
      setSelected(await api.get(`${prefix}/${selected.id}`)); await load()
    })
  }
  async function find(cursor) {
    await run(async () => {
      const params = new URLSearchParams({ category, ...(cursor ? { cursor } : {}) })
      setDiscovery(await api.get(`${prefix}/${selected.id}/discovery?${params}`))
      setSelected(await api.get(`${prefix}/${selected.id}`))
    })
  }
  async function more() { await run(async () => { const result = await api.get(`${prefix}?cursor=${state.nextCursor}`); setState(current => ({ requests: [...current.requests, ...result.requests], nextCursor: result.nextCursor })) }) }
  return <main className="container py-4" style={{ maxWidth: 1100 }}>
    <h1>Solicitudes de privacidad</h1><p><Link to="/privacidad">Leer aviso y consultar el canal para personas sin cuenta</Link></p>
    {capabilities.readCases && <div className="btn-group mb-3"><button className={`btn ${!staff ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => { setStaff(false); setSelected(null); setDiscovery(null) }}>Mis solicitudes</button><button className={`btn ${staff ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => { setStaff(true); setSelected(null); setDiscovery(null) }}>Expedientes a cargo del responsable</button></div>}
    {error && <div className="alert alert-danger" role="alert">{error}</div>}{message && <div className="alert alert-success" role="status">{message}</div>}
    {staff && counts && <p role="status">Vencidas: {counts.overdue} · Próximas a vencer: {counts.dueSoon} · Bloqueos vencidos: {counts.blockingOverdue}</p>}
    {capabilities.ready && (!staff || capabilities.manageCases) && <PrivacyRequestForm key={String(staff)} external={staff} onSubmit={create} busy={busy} />}
    <h2 className="h4">Seguimiento</h2><div className="table-responsive"><table className="table"><thead><tr><th>Solicitud</th><th>Derechos</th><th>Estado</th><th>Vencimiento</th><th>Revisión</th></tr></thead><tbody>{state.requests.map(row => <tr key={row.id}><td><button className="btn btn-link p-0 text-break" onClick={() => select(row.id)} disabled={busy}>{row.id}</button></td><td>{row.rights.map(r => PRIVACY_LABELS[r]).join(', ')}</td><td>{STATUS[row.status] ?? row.status}</td><td>{date(row.dueAt)}</td><td>{row.overdue ? 'Vencida' : row.dueSoon ? 'Próxima a vencer' : 'En plazo'}{row.blockingOverdue && ' · Bloqueo urgente vencido'}</td></tr>)}</tbody></table></div>
    {state.nextCursor && <button className="btn btn-outline-primary mb-3" onClick={more} disabled={busy}>Cargar más solicitudes</button>}
    {selected && <section className="border rounded p-3" aria-label="Detalle de solicitud">
      <h2 className="h4">Solicitud {selected.id}</h2><p>{STATUS[selected.status]} · Ingreso: {date(selected.receivedAt)} · Vencimiento: {date(selected.dueAt)}</p>
      {selected.blockingDueAt && <p>Respuesta de bloqueo: {date(selected.blockingDueAt)} · Resuelto: {date(selected.blockingDecidedAt)}</p>}
      <p style={{ whiteSpace: 'pre-wrap' }}>{staff ? selected.document.details : selected.details}</p>
      {staff && <p>Titular: {selected.document.name} · Contacto: {selected.document.email}</p>}
      {(staff ? selected.document.response : selected.responseAvailable) && <button className="btn btn-outline-primary" onClick={download} disabled={busy}>Descargar respuesta íntegra en JSON</button>}
      {staff && capabilities.manageCases && <PrivacyCaseForm key={`${selected.id}-${selected.version}`} selected={selected} onSubmit={act} busy={busy} />}
      {staff && selected.verifiedAt && selected.subjectId && <div className="my-3"><h3 className="h5">Localización de datos para revisión</h3><p>Estos resultados son borradores. Revisa terceros, texto libre, fuentes externas y copias antes de preparar la respuesta.</p><label htmlFor="discovery-category">Categoría</label><select id="discovery-category" className="form-select mb-2" value={category} onChange={e => { setCategory(e.target.value); setDiscovery(null) }}>{Object.entries({ profile: 'Identificación', orders: 'Pedidos', records: 'Registros y pagos', messages: 'Mensajes', comments: 'Comentarios', advances: 'Avances', recovery: 'Recuperación (sin secretos)', audit: 'Auditoría', details: 'Detalles y diseños', items: 'Ítems de pedido' }).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><button className="btn btn-outline-secondary" onClick={() => find()} disabled={busy}>Localizar datos</button>{discovery && <><pre className="mt-3 border p-3" style={{ maxHeight: 400, overflow: 'auto' }}>{JSON.stringify(discovery, null, 2)}</pre>{discovery.nextCursor && <button className="btn btn-outline-secondary" disabled={busy} onClick={() => find(discovery.nextCursor)}>Página siguiente de datos</button>}</>}</div>}
      {staff && <details><summary>Historial de actuaciones y evidencias</summary><pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(selected.actions, null, 2)}</pre></details>}
    </section>}
  </main>
}
