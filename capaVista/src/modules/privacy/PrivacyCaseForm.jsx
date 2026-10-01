import { useState } from 'react'
import { PRIVACY_LABELS, PRIVACY_DOMAINS, PRIVACY_SYSTEMS } from '../../../../shared/privacy'

const ACTIONS = { verify: 'Verificar identidad y representación', extend: 'Registrar prórroga comunicada', block_decision: 'Resolver bloqueo temporal', scope: 'Revisar alcance de suspensión', review: 'Resolver derechos y planificar actuaciones', execute: 'Registrar ejecución y revisión de sistemas', prepare_response: 'Preparar respuesta revisada', deliver: 'Registrar remisión de respuesta', release: 'Levantar suspensión tras revisión' }
const SYSTEM_LABELS = { mysql: 'Base de datos', auth0: 'Identidad / Auth0', email: 'Correo', logs: 'Logs', exports: 'Exportaciones', backups: 'Respaldos y réplicas', free_text: 'Texto libre y terceros', historical: 'Tablas y copias históricas', source: 'Fuente comercial' }
const DOMAIN_LABELS = { users: 'Usuarios', orders: 'Pedidos', payments: 'Pagos', messages: 'Mensajes', history: 'Historial', metrics: 'Métricas', calendar: 'Calendario', production: 'Producción', clients: 'Clientes' }
function Field({ name, label, area = false, ...props }) {
  const id = `case-${name}`
  return <div className="mb-3"><label className="form-label" htmlFor={id}>{label}</label>{area ? <textarea className="form-control" id={id} name={name} required maxLength={4000} {...props} /> : <input className="form-control" id={id} name={name} required {...props} />}</div>
}
function Check({ name, children }) { return <label className="d-block my-2"><input className="form-check-input me-2" type="checkbox" name={name} required />{children}</label> }

export default function PrivacyCaseForm({ selected, onSubmit, busy }) {
  const [action, setAction] = useState('review')
  const [outcome, setOutcome] = useState('accepted')
  const [kind, setKind] = useState('user')
  async function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const value = name => String(form.get(name) ?? '')
    const body = { action, version: selected.version }
    if (action === 'verify') Object.assign(body, { subjectKind: kind, subjectId: kind === 'other' ? null : Number(value('subjectId')), method: value('method'), evidence: value('evidence'), contactVerified: form.has('contactVerified'), representationReviewed: form.has('representationReviewed') })
    if (action === 'extend') Object.assign(body, { reason: value('reason'), notificationEvidence: value('notificationEvidence') })
    if (action === 'block_decision') Object.assign(body, { outcome, reason: value('reason'), notificationEvidence: value('notificationEvidence'), agencyEvidence: value('agencyEvidence') })
    if (action === 'scope') Object.assign(body, { domains: form.getAll('domains'), evidence: value('evidence') })
    if (action === 'review') Object.assign(body, { decisions: Object.fromEntries(selected.rights.map(right => [right, { outcome: value(`${right}-outcome`), reason: value(`${right}-reason`), plan: value(`${right}-plan`) }])), portabilityConditionsConfirmed: form.has('portabilityConditionsConfirmed') })
    if (action === 'execute') Object.assign(body, { execution: Object.fromEntries(selected.rights.map(right => [right, value(`${right}-execution`)])), oppositionDomains: form.getAll('oppositionDomains'), systems: PRIVACY_SYSTEMS.map(system => ({ system, status: value(`${system}-status`), evidence: value(`${system}-evidence`) })) })
    if (action === 'prepare_response') {
      let data
      try { data = value('data').trim() ? JSON.parse(value('data')) : undefined } catch { return onSubmit(null, 'Los datos de respuesta deben tener un formato JSON válido.') }
      Object.assign(body, { response: { summary: value('summary'), ...(data === undefined ? {} : { data }) }, thirdPartyReviewed: form.has('thirdPartyReviewed'), minimizationReviewed: form.has('minimizationReviewed') })
    }
    if (action === 'deliver') Object.assign(body, { channel: value('channel'), recipient: selected.document.email, evidence: value('evidence'), sentAt: new Date(value('sentAt')).toISOString() })
    if (action === 'release') Object.assign(body, { reason: value('reason'), evidence: value('evidence') })
    await onSubmit(body)
  }
  return <form onSubmit={submit} className="card card-body my-3">
    <h3 className="h5">Actuación del responsable</h3>
    <label htmlFor="privacy-action" className="form-label">Actuación</label>
    <select id="privacy-action" value={action} className="form-select mb-3" onChange={e => setAction(e.target.value)}>{Object.entries(ACTIONS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select>
    {action === 'verify' && <>
      <label htmlFor="subject-kind">Tipo de titular</label><select className="form-select mb-3" id="subject-kind" value={kind} onChange={e => setKind(e.target.value)}><option value="user">Usuario interno</option><option value="client">Cliente persona natural</option><option value="other">Otra persona / menciones</option></select>
      {kind !== 'other' && <Field name="subjectId" label="Identificador interno verificado" type="number" min="1" />}
      <Field name="method" label="Método de verificación" maxLength={200} /><Field name="evidence" label="Referencia de verificación (sin copia de secretos o documentos personales)" area />
      <Check name="contactVerified">Verifiqué el contacto de respuesta.</Check><Check name="representationReviewed">Verifiqué identidad y, cuando corresponda, representación.</Check>
    </>}
    {action === 'extend' && <><Field name="reason" label="Motivo de la prórroga" area /><Field name="notificationEvidence" label="Referencia de comunicación al titular" area /></>}
    {action === 'block_decision' && <>
      <label htmlFor="blocking-outcome">Decisión</label><select id="blocking-outcome" className="form-select mb-3" value={outcome} onChange={e => setOutcome(e.target.value)}><option value="accepted">Aceptar</option><option value="rejected">Rechazar con fundamento</option></select>
      <Field name="reason" label="Fundamento" area /><Field name="notificationEvidence" label="Referencia de comunicación al titular" area />{outcome === 'rejected' && <Field name="agencyEvidence" label="Referencia de comunicación a la Agencia" area />}
    </>}
    {action === 'scope' && <><p>La suspensión impide temporalmente operar los dominios seleccionados, para todos sus usuarios. Mantén cubiertas todas las operaciones afectadas.</p>{PRIVACY_DOMAINS.map(domain => <label key={domain} className="d-block"><input type="checkbox" className="me-2" name="domains" value={domain} defaultChecked />{DOMAIN_LABELS[domain]}</label>)}<Field name="evidence" label="Justificación y evidencia de cobertura" area /></>}
    {action === 'review' && <>
      {selected.rights.map(right => <fieldset key={right} className="border rounded p-3 mb-3"><legend className="h6">{PRIVACY_LABELS[right]}</legend><label htmlFor={`${right}-outcome`}>Resultado</label><select className="form-select mb-2" id={`${right}-outcome`} name={`${right}-outcome`} defaultValue="accepted"><option value="accepted">Aceptar</option><option value="partial">Aceptar parcialmente</option><option value="denied">Denegar con fundamento</option></select><Field name={`${right}-reason`} label="Fundamento" area minLength={10} /><Field name={`${right}-plan`} label="Plan de actuación (si se acepta total o parcialmente)" area required={false} minLength={10} /></fieldset>)}
      {selected.rights.includes('portability') && <label><input className="me-2" type="checkbox" name="portabilityConditionsConfirmed" />Confirmé las condiciones de procedencia de portabilidad.</label>}
    </>}
    {action === 'execute' && <>
      <p>Registra actuaciones realmente ejecutadas y comprobadas. Una referencia a un plan futuro no acredita ejecución.</p>
      {selected.rights.filter(right => selected.document.decisions?.[right]?.outcome !== 'denied').map(right => <Field key={right} name={`${right}-execution`} label={`Resultado y evidencia: ${PRIVACY_LABELS[right]}`} area minLength={10} />)}
      {selected.document.decisions?.opposition && selected.document.decisions.opposition.outcome !== 'denied' && <fieldset className="border p-2"><legend className="h6">Dominios suspendidos por oposición aceptada</legend>{PRIVACY_DOMAINS.map(domain => <label key={domain} className="d-block"><input type="checkbox" name="oppositionDomains" value={domain} className="me-2" />{DOMAIN_LABELS[domain]}</label>)}<p>La suspensión por dominio afecta sus operaciones para todos los usuarios hasta revisión posterior.</p></fieldset>}
      {PRIVACY_SYSTEMS.map(system => <fieldset key={system} className="border rounded p-2 my-2"><legend className="h6">{SYSTEM_LABELS[system]}</legend><label htmlFor={`${system}-status`}>Resultado de revisión</label><select className="form-select" name={`${system}-status`} id={`${system}-status`} defaultValue="completed"><option value="completed">Actuación completada y verificada</option><option value="not_applicable">No aplica, con justificación</option></select><Field name={`${system}-evidence`} label="Evidencia o justificación" area minLength={10} /></fieldset>)}
    </>}
    {action === 'prepare_response' && <><Field name="summary" label="Respuesta y explicación al titular" area maxLength={12000} minLength={10} /><Field name="data" label="Datos estructurados revisados para acceso o portabilidad (JSON, cuando corresponda)" area required={false} maxLength={60000} /><Check name="thirdPartyReviewed">Revisé y protegí los datos de terceros.</Check><Check name="minimizationReviewed">Revisé el alcance y excluí secretos y datos innecesarios.</Check></>}
    {action === 'deliver' && <><p>Contacto verificado: {selected.document.email}</p><Field name="channel" label="Canal utilizado" maxLength={100} /><Field name="sentAt" label="Fecha y hora de remisión" type="datetime-local" /><Field name="evidence" label="Referencia de remisión verificable de la respuesta íntegra" area /></>}
    {action === 'release' && <><Field name="reason" label="Fundamento para levantar suspensión" area /><Field name="evidence" label="Referencia de revisión de tratamientos permitidos" area /></>}
    <button className="btn btn-primary mt-3" type="submit" disabled={busy}>Registrar actuación</button>
  </form>
}
