import common from '../../privacy/pages/PrivacyPages.module.css'
import styles from '../pages/IncidentReportPage.module.css'

const categories = [
  { title: 'Accesos y cuentas', description: 'Acceso no autorizado a tu cuenta o inicios de sesión sospechosos.', icon: 'bi-person' },
  { title: 'Errores y comportamientos inusuales', description: 'Acciones o pantallas extrañas en la plataforma.', icon: 'bi-gear' },
  { title: 'Vulnerabilidades y filtraciones', description: 'Posibles fallas de seguridad o exposición de información sensible.', icon: 'bi-shield-check' },
  { title: 'Mensajes sospechosos', description: 'Correos, mensajes fraudulentos o solicitudes engañosas (phishing).', icon: 'bi-envelope' },
]
export default function IncidentTypesPanel() {
  return <aside className={common.typesPanel} aria-labelledby="incident-types-title">
    <h2 id="incident-types-title"><i className="bi bi-info-circle-fill" aria-hidden="true" />Qué puedes reportar</h2>
    <ul>{categories.map(category => <li key={category.title}>
      <span className={common.typeIcon}><i className={`bi ${category.icon}`} aria-hidden="true" /></span>
      <div><h3>{category.title}</h3><p>{category.description}</p></div>
    </li>)}</ul>
    <div className={styles.reviewNote}><span className={`${common.typeIcon} ${styles.reviewIcon}`}><i className="bi bi-shield-fill" aria-hidden="true" /></span><p>Tu reporte será revisado por el equipo de seguridad.</p></div>
  </aside>
}
