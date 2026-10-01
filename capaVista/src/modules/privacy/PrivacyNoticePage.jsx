import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const TITLES = { dataAndSubjects: 'Datos y personas', sources: 'Origen de los datos', purposesAndBases: 'Finalidades y bases del tratamiento', recipients: 'Destinatarios', transfers: 'Transferencias internacionales', retention: 'Conservación', security: 'Protección de los datos', rights: 'Ejercicio de derechos', complaints: 'Reclamaciones', consentWithdrawal: 'Retirada del consentimiento', automatedDecisions: 'Métricas, perfiles y decisiones automatizadas' }

export default function PrivacyNoticePage() {
  const [state, setState] = useState({ notice: null, error: false })
  useEffect(() => {
    const controller = new AbortController()
    const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
    Promise.resolve().then(async () => {
      if (!base) throw new Error('API no configurada')
      const response = await fetch(`${base}/privacy/notice`, { signal: controller.signal, cache: 'no-store' })
      if (!response.ok) throw new Error('Aviso no disponible')
      const notice = await response.json()
      setState({ notice, error: false })
    }).catch(() => { if (!controller.signal.aborted) setState({ notice: null, error: true }) })
    return () => controller.abort()
  }, [])
  const notice = state.notice
  return <main className="container py-4" style={{ maxWidth: 1000 }}>
    <h1>Aviso de privacidad</h1>
    {state.error && <p role="alert">No fue posible obtener el aviso. Intenta nuevamente.</p>}
    {!notice && !state.error && <p role="status">Cargando información de privacidad…</p>}
    {notice?.available === false && <p role="status">La información de privacidad y el canal de solicitudes todavía no están publicados.</p>}
    {notice?.available && <>
      <p>Versión {notice.version} · Publicado: {notice.publishedAt}</p>
      <h2 className="h4">Responsable y contacto</h2>
      <p>{notice.responsible} · Representante: {notice.representative}</p>
      <p>{notice.postalAddress}</p>
      {notice.preventionOfficer && <p>Encargado de prevención: {notice.preventionOfficer}</p>}
      <p>Para solicitudes, incluyendo clientes y personas sin cuenta: <a href={`mailto:${encodeURIComponent(notice.contactEmail)}`}>{notice.contactEmail}</a>.</p>
      <p>Si tienes una cuenta activa, puedes <Link to="/privacidad/solicitudes">registrar y consultar tu solicitud</Link>.</p>
      {Object.entries(TITLES).map(([key, title]) => <section key={key} className="my-4"><h2 className="h4">{title}</h2><p style={{ whiteSpace: 'pre-wrap' }}>{notice.sections[key]}</p></section>)}
    </>}
    <Link to="/login">Volver al acceso</Link>
  </main>
}
