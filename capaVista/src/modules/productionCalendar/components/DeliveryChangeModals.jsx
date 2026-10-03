import { formatDayTitle } from '../utils/calendarPresentation.js';
import styles from './ProductionCalendarGrid.module.css';
import { useState } from 'react';

export function DeliveryChangeConfirmModal({ change, onCancel, onConfirm }) {
  if (!change) return null

  return (
    <div className={styles.modalLayer} role="presentation">
      <section aria-labelledby="delivery-change-title" aria-modal="true" className={styles.confirmModal} role="dialog">
        <header className={styles.modalHeader}>
          <div>
            <span>Confirmacion</span>
            <h2 id="delivery-change-title">Cambiar fecha de entrega</h2>
          </div>
        </header>

        <div className={styles.modalBody}>
          <p className={styles.confirmText}>
            Estas seguro que quieres cambiar la fecha de entrega del pedido {change.item.orderNumber} de{' '}
            {formatDayTitle(change.fromDate)} a {formatDayTitle(change.toDate)}?
          </p>
        </div>

        <footer className={styles.modalFooter}>
          <button className={styles.secondaryButton} onClick={onCancel} type="button">
            No
          </button>
          <button className={styles.primaryButton} onClick={onConfirm} type="button">
            Si
          </button>
        </footer>
      </section>
    </div>
  )
}

export function DeliveryChangeCredentialsModal({ change, onCancel, onConfirm }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!change) return null

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmedPin = pin.trim()

    if (!/^\d{6}$/.test(trimmedPin)) {
      setError('Ingrese un PIN valido de 6 digitos.')
      return
    }

    setIsSubmitting(true)

    try {
      await onConfirm({ pin: trimmedPin })
    } catch (submitError) {
      console.error('Error actualizando fecha de entrega:', submitError)
      setError('No fue posible cambiar la fecha de entrega.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.modalLayer} role="presentation">
      <form
        aria-labelledby="delivery-credentials-title"
        aria-modal="true"
        className={styles.confirmModal}
        onSubmit={handleSubmit}
        role="dialog"
      >
        <header className={styles.modalHeader}>
          <div>
            <span>Validacion PIN</span>
            <h2 id="delivery-credentials-title">Confirmar cambio</h2>
          </div>
          <button aria-label="Cerrar validacion" onClick={onCancel} type="button">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div className={styles.modalBody}>
          <p className={styles.confirmText}>
            Ingrese su PIN para hacer efectivo el cambio de fecha de {change.item.orderNumber}.
          </p>
          <label className={styles.credentialsLabel}>
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
          {error && <p className={styles.modalError}>{error}</p>}
        </div>

        <footer className={styles.modalFooter}>
          <button className={styles.secondaryButton} disabled={isSubmitting} onClick={onCancel} type="button">
            Cancelar
          </button>
          <button className={styles.primaryButton} disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Confirmando...' : 'Confirmar'}
          </button>
        </footer>
      </form>
    </div>
  )
}
