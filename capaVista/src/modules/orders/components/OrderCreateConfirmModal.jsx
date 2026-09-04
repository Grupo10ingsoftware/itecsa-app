import styles from './OrderCreateConfirmModal.module.css'

export default function OrderCreateConfirmModal({ draft, isRegistering = false, onCancel, onConfirm }) {
  const priorityLabel = {
    urgent: 'Urgente',
    contract: 'Cliente con contrato',
  }[draft.priority] ?? 'Sin etiqueta'

  return (
    <div className={styles.modalBackdrop} role="presentation">
      <section aria-labelledby="register-order-modal-title" aria-modal="true" className={styles.modalCard} role="dialog">
        <header className={styles.modalHeader}>
          <button aria-label="Cerrar confirmacion" className={styles.modalClose} onClick={onCancel} type="button">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>

          <h2 className={styles.modalTitle} id="register-order-modal-title">Confirmar registro</h2>
        </header>

        <div className={styles.modalBody}>
          <p className={styles.modalText}>
            Estas a punto de registrar el pedido. El sistema lo creara con estado{' '}
            <strong>Confirmacion de pago</strong> y el pago quedara como <strong>Pendiente</strong>.
          </p>

          <div className={styles.modalSummary}>
            <div className={styles.modalSummaryRow}>
              <span className={styles.summaryIcon}>
                <i className="bi bi-tag" aria-hidden="true" />
              </span>
              <strong>Codigo de Nota de Venta</strong>
              <span>{draft.salesNoteCode}</span>
            </div>

            <div className={styles.modalSummaryRow}>
              <span className={styles.summaryIcon}>
                <i className="bi bi-building" aria-hidden="true" />
              </span>
              <strong>Cliente</strong>
              <span>{draft.managerRecord?.client || '-'}</span>
            </div>

            <div className={styles.modalSummaryRow}>
              <span className={styles.summaryIcon}>
                <i className="bi bi-flag" aria-hidden="true" />
              </span>
              <strong>Etiqueta</strong>
              <span>{priorityLabel}</span>
            </div>
          </div>

          <footer className={styles.modalActions}>
            <button className={styles.secondaryButton} disabled={isRegistering} onClick={onCancel} type="button">
              <i className="bi bi-x-lg" aria-hidden="true" />
              Cancelar
            </button>

            <button className={styles.primaryButton} disabled={isRegistering} onClick={onConfirm} type="button">
              <i className="bi bi-check-circle" aria-hidden="true" />
              {isRegistering ? 'Registrando...' : 'Confirmar registro'}
            </button>
          </footer>
        </div>
      </section>
    </div>
  )
}
