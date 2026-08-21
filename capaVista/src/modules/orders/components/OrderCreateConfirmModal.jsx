import styles from './OrderCreateConfirmModal.module.css'
import { getOrderPriorityMeta } from '../mocks/orderCreate.mock'

export default function OrderCreateConfirmModal({ draft, onCancel, onConfirm }) {
  const record = draft.managerRecord || {}
  const items = record.items || []
  const totalQuantity = items.reduce((total, item) => total + Number(item.quantity || 0), 0)
  const priority = getOrderPriorityMeta(draft.priority)

  return (
    <div className={styles.modalBackdrop} role="presentation">
      <section aria-labelledby="register-order-modal-title" aria-modal="true" className={styles.modalCard} role="dialog">
        <header className={styles.modalHeader}>
          <button aria-label="Cerrar confirmación" className={styles.modalClose} onClick={onCancel} type="button">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
          <h2 className={styles.modalTitle} id="register-order-modal-title">Autorizar registro</h2>
        </header>

        <div className={styles.modalBody}>
          <p className={styles.modalText}>
            Registrarás el pedido con los datos importados desde Manager. Quedará en{' '}
            <strong>“Confirmación de pago”</strong> y el pago figurará como <strong>“Pendiente”</strong>.
          </p>

          <div className={styles.modalSummary}>
            <div className={styles.modalSummaryRow}>
              <span className={styles.summaryIcon}><i className="bi bi-tag" aria-hidden="true" /></span>
              <strong>Nota de Venta</strong>
              <span>{draft.salesNoteCode}</span>
            </div>
            <div className={styles.modalSummaryRow}>
              <span className={styles.summaryIcon}><i className="bi bi-building" aria-hidden="true" /></span>
              <strong>Cliente</strong>
              <span>{record.client}</span>
            </div>
            <div className={styles.modalSummaryRow}>
              <span className={styles.summaryIcon}><i className="bi bi-box-seam" aria-hidden="true" /></span>
              <strong>Partidas / cantidad</strong>
              <span>{items.length} / {totalQuantity.toLocaleString('es-CL')}</span>
            </div>
            <div className={styles.modalSummaryRow}>
              <span className={styles.summaryIcon}><i className="bi bi-flag-fill" aria-hidden="true" /></span>
              <strong>Prioridad</strong>
              <span className={styles.priorityBadge} data-tone={priority.tone}>{priority.label}</span>
            </div>
          </div>

          <div className={styles.pinField}>
            <div className={styles.pinHeading}>
              <label htmlFor="order-authorization-pin">PIN de autorización</label>
              <span>Simulación</span>
            </div>
            <div className={styles.pinInputWrap}>
              <i className="bi bi-shield-lock" aria-hidden="true" />
              <input
                aria-describedby="order-authorization-pin-help"
                autoComplete="off"
                id="order-authorization-pin"
                inputMode="numeric"
                maxLength={6}
                placeholder="Ej: 1234"
                type="password"
              />
            </div>
            <small id="order-authorization-pin-help">
              Ejemplo visual: por ahora puedes continuar sin ingresar ni validar un PIN.
            </small>
          </div>

          <footer className={styles.modalActions}>
            <button className={styles.secondaryButton} onClick={onCancel} type="button">
              <i className="bi bi-x-lg" aria-hidden="true" /> Cancelar
            </button>
            <button className={styles.primaryButton} onClick={onConfirm} type="button">
              <i className="bi bi-cloud-arrow-up" aria-hidden="true" /> Registrar pedido
            </button>
          </footer>
        </div>
      </section>
    </div>
  )
}
