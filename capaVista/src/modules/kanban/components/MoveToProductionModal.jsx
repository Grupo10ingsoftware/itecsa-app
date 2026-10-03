import { useState } from 'react';
import styles from '../styles/Kanban.module.css';

export function MoveToProductionModal({ isOpen, onClose, onConfirm, order }) {
  const [pin, setPin] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !order) {
    return null
  }

  function resetFields() {
    setPin('')
    setComment('')
    setError('')
  }

  function handleClose() {
    if (isSubmitting) return

    resetFields()
    onClose()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSubmitting) return
    const trimmedPin = pin.trim()

    if (!/^\d{6}$/.test(trimmedPin)) {
      setError('Ingrese un PIN valido de 6 digitos.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await onConfirm({
        pin: trimmedPin,
        comment: comment.trim(),
      })
      resetFields()
    } catch (submitError) {
      setError(submitError?.payload?.message ?? 'No fue posible mover la orden.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.operatorModalLayer} role="presentation">
      <form
        aria-labelledby="move-production-modal-title"
        className={styles.operatorModal}
        onSubmit={handleSubmit}
        role="dialog"
      >
        <header className={styles.operatorModalHeader}>
          <div>
            <span className={styles.offcanvasKicker}>Validacion PIN</span>
            <h3 id="move-production-modal-title">Mover pedido</h3>
          </div>
          <button
            aria-label="Cerrar validacion"
            className={styles.offcanvasCloseButton}
            disabled={isSubmitting}
            onClick={handleClose}
            type="button"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div className={styles.operatorModalBody}>
          <p className={styles.operatorModalText}>Ingrese su PIN para hacer efectivo el traspaso del pedido {order.salesNoteNumber}.</p>
          <label>
            <span>PIN</span>
            <input
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, '').slice(0, 6))
                setError('')
              }}
              placeholder="000000"
              type="password"
              value={pin}
            />
          </label>
          <label>
            <span>Comentario opcional</span>
            <textarea
              onChange={(event) => setComment(event.target.value)}
              placeholder="Agrega una observacion para produccion si corresponde."
              rows={3}
              value={comment}
            />
          </label>
          {error && <p className={styles.operatorModalError}>{error}</p>}
        </div>

        <footer className={styles.operatorModalFooter}>
          <button className={styles.resetFilterButton} disabled={isSubmitting} onClick={handleClose} type="button">
            Cancelar
          </button>
          <button className={styles.orderCardButton} disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Moviendo...' : 'Mover pedido'}
          </button>
        </footer>
      </form>
    </div>
  )
}
