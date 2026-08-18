import styles from './OrderCreateConfirmModal.module.css'

export default function OrderCreateConfirmModal({ draft, isSubmitting, onCancel, onConfirm }) {
  const designFilesCount = draft.designFiles.length

  return (
    <div className={styles.modalBackdrop} role="presentation">
      <section aria-labelledby="register-order-modal-title" aria-modal="true" className={styles.modalCard} role="dialog">
        <header className={styles.modalHeader}>
          <button aria-label="Cerrar confirmación" className={styles.modalClose} onClick={onCancel} type="button">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>

          <h2 className={styles.modalTitle} id="register-order-modal-title">Confirmar registro</h2>
        </header>

        <div className={styles.modalBody}>
          <p className={styles.modalText}>
            Estás a punto de registrar el pedido. El sistema creará el pedido con estado{' '}
            <strong>“Confirmación de pago”</strong> y el pago quedará como <strong>“Pendiente”</strong>.
          </p>

          <div className={styles.modalSummary}>
            <div className={styles.modalSummaryRow}>
              <span className={styles.summaryIcon}>
                <i className="bi bi-tag" aria-hidden="true" />
              </span>
              <strong>Código de Nota de Venta</strong>
              <span>{draft.salesNoteCode}</span>
            </div>

            <div className={styles.modalSummaryRow}>
              <span className={styles.summaryIcon}>
                <i className="bi bi-file-earmark-pdf" aria-hidden="true" />
              </span>
              <strong>Nota de Venta (PDF)</strong>
              <span>Adjunta</span>
            </div>

            <div className={styles.modalSummaryRow}>
              <span className={styles.summaryIcon}>
                <i className="bi bi-folder" aria-hidden="true" />
              </span>
              <strong>Archivos de Diseño</strong>
              <span>{designFilesCount} archivo(s) opcional(es)</span>
            </div>
          </div>

          <footer className={styles.modalActions}>
            <button className={styles.secondaryButton} onClick={onCancel} type="button">
              <i className="bi bi-x-lg" aria-hidden="true" />
              Cancelar
            </button>

            <button 
              className={styles.primaryButton} 
              onClick={onConfirm} 
              type="button"
              disabled={isSubmitting}
            >
              <i className="bi bi-check-circle" aria-hidden="true" />
              {isSubmitting ? 'Registrando...' : 'Confirmar registro'}
            </button>
          </footer>
        </div>
      </section>
    </div>
  )
}
