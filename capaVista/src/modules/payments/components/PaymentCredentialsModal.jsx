import { useState } from 'react'
import styles from './PaymentActionConfirmModal.module.css'

export default function PaymentCredentialsModal({
  isSubmitting = false,
  onCancel,
  onConfirm,
  order,
  targetStatus,
}) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const canSubmit = /^\d{6}$/.test(pin)

  if (!order || !targetStatus) return null

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!canSubmit) {
      setError('Ingrese su PIN de seis digitos.')
      return
    }

    setError('')
    onConfirm({ pin })
  }

  return (
    <div className={styles.credentialsModalLayer} role="presentation">
      <form
        aria-labelledby="payment-credentials-modal-title"
        aria-modal="true"
        className={styles.credentialsModal}
        onSubmit={handleSubmit}
        role="dialog"
      >
        <header className={styles.credentialsModalHeader}>
          <div>
            <span>Validacion de pago</span>
            <h3 id="payment-credentials-modal-title">Ingrese su PIN</h3>
          </div>
          <button
            aria-label="Cerrar validacion"
            className={styles.credentialsCloseButton}
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div className={styles.credentialsModalBody}>
          <p>
            Ingrese su PIN personal para hacer efectivo el cambio de pago
            de {order.nvNumber} a {targetStatus}.
          </p>

          <label>
            <span>PIN personal</span>
            <input
              autoComplete="off"
              disabled={isSubmitting}
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, ''))
                setError('')
              }}
              placeholder="000000"
              type="password"
              value={pin}
            />
          </label>

          {error && <p className={styles.credentialsError}>{error}</p>}
        </div>

        <footer className={styles.credentialsModalFooter}>
          <button
            className="btn btn-outline-secondary"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="btn btn-dark"
            disabled={isSubmitting || !canSubmit}
            type="submit"
          >
            {isSubmitting ? 'Confirmando...' : 'Confirmar'}
          </button>
        </footer>
      </form>
    </div>
  )
}
