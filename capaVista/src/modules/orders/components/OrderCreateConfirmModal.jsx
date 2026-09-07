import styles from './OrderCreateConfirmModal.module.css'

function SummaryItem({ icon, label, value, wide = false }) {
  return (
    <div className={`${styles.summaryItem} ${wide ? styles.summaryItemWide : ''}`}>
      <span className={styles.summaryIcon} aria-hidden="true">
        <i className={`bi ${icon}`} />
      </span>
      <div>
        <dt>{label}</dt>
        <dd>{value || '-'}</dd>
      </div>
    </div>
  )
}

export default function OrderCreateConfirmModal({ draft, isRegistering = false, onCancel, onConfirm }) {
  const priorityLabel = {
    urgent: 'Urgente',
    contract: 'Cliente con contrato',
  }[draft.priority] ?? 'Sin etiqueta'

  return (
    <div className={styles.modalBackdrop} role="presentation">
      <section aria-labelledby="register-order-modal-title" aria-modal="true" className={styles.modalCard} role="dialog">
        <header className={styles.modalHeader}>
          <div>
            <span className={styles.modalKicker}>Registro de pedido</span>
            <h2 className={styles.modalTitle} id="register-order-modal-title">Confirmar registro</h2>
            <p>Revisa la información antes de crear el pedido.</p>
          </div>

          <button aria-label="Cerrar confirmacion" className={styles.modalClose} onClick={onCancel} type="button">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div className={styles.modalBody}>
          <div className={styles.statusNotice}>
            <span className={styles.statusIcon} aria-hidden="true">
              <i className="bi bi-check-circle" />
            </span>
            <div>
              <span>Estado inicial del pedido</span>
              <p>
                Se registrará en <strong>Confirmación de pago</strong> con el pago{' '}
                <strong>Pendiente</strong>.
              </p>
            </div>
          </div>

          <section className={styles.summarySection} aria-labelledby="order-summary-title">
            <div className={styles.sectionTitle}>
              <i className="bi bi-receipt" aria-hidden="true" />
              <h3 id="order-summary-title">Resumen del pedido</h3>
            </div>

            <dl className={styles.summaryGrid}>
              <SummaryItem icon="bi-tag" label="Código de Nota de Venta" value={draft.salesNoteCode} />
              <SummaryItem icon="bi-building" label="Cliente" value={draft.managerRecord?.client} />
              <SummaryItem icon="bi-flag" label="Etiqueta" value={priorityLabel} />
              <SummaryItem
                icon="bi-chat-left-text"
                label="Observaciones"
                value={draft.comments?.trim() || 'Sin observaciones'}
                wide
              />
            </dl>
          </section>
        </div>

        <footer className={styles.modalActions}>
          <button className={styles.secondaryButton} disabled={isRegistering} onClick={onCancel} type="button">
            Cancelar
          </button>

          <button className={styles.primaryButton} disabled={isRegistering} onClick={onConfirm} type="button">
            <i className="bi bi-check-circle" aria-hidden="true" />
            {isRegistering ? 'Registrando...' : 'Confirmar registro'}
          </button>
        </footer>
      </section>
    </div>
  )
}
