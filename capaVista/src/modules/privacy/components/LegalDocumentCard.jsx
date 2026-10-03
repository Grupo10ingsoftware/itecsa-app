import styles from '../pages/PrivacyPages.module.css'

export default function LegalDocumentCard({ title, description, icon, action, document }) {
  return <article className={styles.documentCard}>
    <div className={styles.documentBody}>
      <span className={styles.documentIcon}><i className={`bi ${icon}`} aria-hidden="true" /></span>
      <div><h2>{title}</h2><p>{description}</p>
        {document?.url ? document.version && <small>Versión: {document.version}</small> : <small>Documento pendiente de publicación por Itecsa.</small>}
      </div>
    </div>
    {document?.url ? <a className={styles.documentButton} href={document.url} target="_blank" rel="noopener noreferrer" aria-label={`${action}: ${title} (abre en otra pestaña)`}>
      <i className={`bi ${action === 'Consultar' ? 'bi-box-arrow-up-right' : 'bi-file-earmark-text'}`} aria-hidden="true" />{action}
    </a> : <button className={styles.documentButton} type="button" disabled aria-label={`${title}: pendiente de publicación`}><i className="bi bi-file-earmark-text" aria-hidden="true" />{action}</button>}
  </article>
}
