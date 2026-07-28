import styles from './DeliveryDateModal.module.css'

export default function DeliveryDateModal({ isOpen, items, onClose }) {
  if (!isOpen) return null

  return (
    <div className={styles.modalLayer} role="presentation">
      <section aria-labelledby="delivery-modal-title" className={styles.modalCard} role="dialog">
        <header className={styles.modalHeader}>
          <div>
            <span>Prototipo</span>
            <h2 id="delivery-modal-title">Modificar fecha de entrega</h2>
          </div>
          <button aria-label="Cerrar modal" onClick={onClose} type="button">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>
        <div className={styles.modalBody}>
          <label>
            <span>Pedido</span>
            <select defaultValue={items[0]?.id ?? ''}>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.orderNumber} - {item.clientName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Nueva fecha</span>
            <input type="date" />
          </label>
          <p>Este control es visual por ahora. La modificacion real requiere endpoint y reglas de permisos.</p>
        </div>
        <footer className={styles.modalFooter}>
          <button className={styles.secondaryButton} onClick={onClose} type="button">
            Cancelar
          </button>
          <button className={styles.primaryButton} onClick={onClose} type="button">
            Confirmar fecha
          </button>
        </footer>
      </section>
    </div>
  )
}
