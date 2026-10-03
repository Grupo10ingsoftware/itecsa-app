import { REQUEST_TYPES } from '../../../../../shared/privacyRequests'
import styles from '../pages/PrivacyPages.module.css'

export default function RequestTypesPanel() {
  return <aside className={styles.typesPanel} aria-labelledby="request-types-title">
    <h2 id="request-types-title"><i className="bi bi-info-circle-fill" aria-hidden="true" />Tipos de solicitudes</h2>
    <ul>{REQUEST_TYPES.map(type => <li key={type.value}>
      <span className={styles.typeIcon}><i className={`bi ${type.icon}`} aria-hidden="true" /></span>
      <div><h3>{type.label}</h3><p>{type.description}</p></div>
    </li>)}</ul>
  </aside>
}
