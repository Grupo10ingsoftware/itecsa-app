import styles from '../styles/Kanban.module.css';

export function SubprocessAuthModal({ completeSubProcess, authModal, isCompletingSubprocess, closeAuthModal, setOperatorPin, setAuthError, operatorPin, setOperatorComment, operatorComment, authError }) {
  return (
    <div className={styles.operatorModalLayer} role="presentation">
      <form
        aria-labelledby="operator-modal-title"
        className={styles.operatorModal}
        onSubmit={completeSubProcess}
        role="dialog"
      >
        <header className={styles.operatorModalHeader}>
          <div>
            <span className={styles.offcanvasKicker}>Validacion PIN</span>
            <h3 id="operator-modal-title">{authModal.action === 'rollback' ? `Retroceder a ${authModal.process.name}` : authModal.process.name}</h3>
          </div>
          <button
            aria-label="Cerrar validacion"
            className={styles.offcanvasCloseButton}
            disabled={isCompletingSubprocess}
            onClick={closeAuthModal}
            type="button"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div className={styles.operatorModalBody}>
          <label>
            <span>PIN</span>
            <input
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => {
                setOperatorPin(event.target.value.replace(/\D/g, '').slice(0, 6))
                setAuthError('')
              }}
              placeholder="000000"
              type="password"
              value={operatorPin}
            />
          </label>
          <label>
            <span>{authModal.action === 'rollback' ? 'Observacion obligatoria' : 'Comentario opcional'}</span>
            <textarea
              onChange={(event) => setOperatorComment(event.target.value)}
              placeholder="Describe una observacion del traspaso si corresponde."
              rows={3}
              value={operatorComment}
            />
          </label>
          {authError && <p className={styles.operatorModalError}>{authError}</p>}
        </div>

        <footer className={styles.operatorModalFooter}>
          <button className={styles.resetFilterButton} disabled={isCompletingSubprocess} onClick={closeAuthModal} type="button">
            Cancelar
          </button>
          <button className={styles.orderCardButton} disabled={isCompletingSubprocess} type="submit">
            {isCompletingSubprocess ? 'Procesando...' : authModal.action === 'rollback' ? 'Confirmar retroceso' : 'Completar subproceso'}
          </button>
        </footer>
      </form>
    </div>
  )
}
