import styles from '../styles/Kanban.module.css';

export function PaymentDeconfirmationModal({ approvePaymentDeconfirmation, isApprovingDeconfirmation, closeDeconfirmationAuthModal, order, setDeconfirmationPin, setDeconfirmationError, deconfirmationPin, deconfirmationError }) {
  return (
    <div className={styles.operatorModalLayer} role="presentation">
      <form
        aria-labelledby="deconfirmation-approval-modal-title"
        className={styles.operatorModal}
        onSubmit={approvePaymentDeconfirmation}
        role="dialog"
      >
        <header className={styles.operatorModalHeader}>
          <div>
            <span className={styles.offcanvasKicker}>Validacion PIN</span>
            <h3 id="deconfirmation-approval-modal-title">Aprobar desconfirmacion</h3>
          </div>
          <button
            aria-label="Cerrar validacion"
            className={styles.offcanvasCloseButton}
            disabled={isApprovingDeconfirmation}
            onClick={closeDeconfirmationAuthModal}
            type="button"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div className={styles.operatorModalBody}>
          <p className={styles.operatorModalText}>Ingrese su PIN para devolver {order.salesNoteNumber} a Confirmacion de pago.</p>
          <label>
            <span>PIN</span>
            <input
              autoComplete="one-time-code"
              disabled={isApprovingDeconfirmation}
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => {
                setDeconfirmationPin(event.target.value.replace(/\D/g, '').slice(0, 6))
                setDeconfirmationError('')
              }}
              placeholder="000000"
              type="password"
              value={deconfirmationPin}
            />
          </label>
          {deconfirmationError && <p className={styles.operatorModalError}>{deconfirmationError}</p>}
        </div>

        <footer className={styles.operatorModalFooter}>
          <button className={styles.resetFilterButton} disabled={isApprovingDeconfirmation} onClick={closeDeconfirmationAuthModal} type="button">
            Cancelar
          </button>
          <button className={styles.orderCardButton} disabled={isApprovingDeconfirmation} type="submit">
            {isApprovingDeconfirmation ? 'Aprobando...' : 'Confirmar'}
          </button>
        </footer>
      </form>
    </div>
  )
}
