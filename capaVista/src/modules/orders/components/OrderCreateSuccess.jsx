import styles from './OrderCreateSuccess.module.css'

export default function OrderCreateSuccess({ onGoKanban, onCreateAnother }) {
  return (
    <section className={styles.successViewport} aria-labelledby="order-success-title">
      <div className={styles.successShell}>
        <span className={styles.successIcon}>
          <i className="bi bi-check-lg" aria-hidden="true" />
        </span>

        <h1 className={styles.successTitle} id="order-success-title">Pedido registrado correctamente</h1>

        <p className={styles.successText}>
          Tu pedido ha sido registrado exitosamente y se encuentra en proceso de confirmación de pago.
        </p>

        <div className={styles.successActions}>
          <button className={styles.darkButton} onClick={onGoKanban} type="button">
            <i className="bi bi-kanban" aria-hidden="true" />
            Ir a Kanban
          </button>

          <button className={styles.primaryButton} onClick={onCreateAnother} type="button">
            <i className="bi bi-plus-circle" aria-hidden="true" />
            Registrar otro pedido
          </button>
        </div>
      </div>
    </section>
  )
}
