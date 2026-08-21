import styles from './OrderCreateSuccess.module.css'
import { getOrderPriorityMeta } from '../mocks/orderCreate.mock'

export default function OrderCreateSuccess({ order, onGoKanban, onCreateAnother }) {
  const priority = getOrderPriorityMeta(order?.priority)

  return (
    <section className={styles.successViewport} aria-labelledby="order-success-title">
      <div className={styles.successShell}>
        <span className={styles.successIcon}><i className="bi bi-check-lg" aria-hidden="true" /></span>
        <h1 className={styles.successTitle} id="order-success-title">Pedido registrado correctamente</h1>
        <p className={styles.successText}>
          El pedido fue registrado con la información importada y quedó en proceso de confirmación de pago.
        </p>

        <div className={styles.successReference}>
          <span><small>Nota de Venta</small><strong>{order?.salesNoteCode}</strong></span>
          <span><small>Cliente</small><strong>{order?.client}</strong></span>
          <span><small>Estado</small><strong>Confirmación de pago</strong></span>
          <span><small>Prioridad</small><strong className={styles.priorityLabel} data-tone={priority.tone}>{priority.label}</strong></span>
        </div>

        <div className={styles.successActions}>
          <button className={styles.darkButton} onClick={onGoKanban} type="button">
            <i className="bi bi-kanban" aria-hidden="true" /> Ir a Kanban
          </button>
          <button className={styles.primaryButton} onClick={onCreateAnother} type="button">
            <i className="bi bi-plus-circle" aria-hidden="true" /> Registrar otro pedido
          </button>
        </div>
      </div>
    </section>
  )
}
