import { useState } from 'react'
import { PAYMENT_STATUS } from '@/config/status'
import styles from './PaymentActionConfirmModal.module.css'

export default function PaymentCredentialsModal({
  isSubmitting = false,
  onCancel,
  onConfirm,
  order,
  targetStatus,
}) {
  const [pin, setPin] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')

  const requiresComment =
    order?.paymentStatus !== undefined &&
    order.paymentStatus !== PAYMENT_STATUS.PENDIENTE
  const canSubmit =
    /^\d{6}$/.test(pin) && (!requiresComment || comment.trim().length > 0)

  if (!order || !targetStatus) return null

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit) {
      setError(
        !/^\d{6}$/.test(pin)
          ? 'Ingrese su PIN de seis digitos.'
          : 'Ingrese el motivo del cambio de estado.',
      )
      return
    }

    setError('')
    try {
      await onConfirm({ comment: comment.trim(), pin })
    } finally {
      // No conservar el PIN tras un intento fallido; al cerrar se desmonta el modal.
      setPin('')
    }
  }

  return (
    <div className={styles.credentialsModalLayer} role="presentation">
      <form
        aria-labelledby="payment-credentials-modal-title"
        aria-modal="true"
        className={styles.credentialsModal}
        noValidate
        onSubmit={handleSubmit}
        role="dialog"
      >
        <header className={styles.credentialsModalHeader}>
          <div>
            <span className={styles.credentialsModalKicker}>
              Validación de pago
            </span>
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
          <p className={styles.credentialsIntro}>
            Ingrese su PIN personal para hacer efectivo el cambio de pago
            de {order.nvNumber} a {targetStatus}.
          </p>

          <label className={styles.credentialsField}>
            <span>PIN personal</span>
            <input
              autoComplete="one-time-code"
              className={styles.credentialsPinInput}
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

          {requiresComment && (
            <label className={styles.credentialsField}>
              <span>Motivo del cambio</span>
              <textarea
                className={styles.credentialsCommentInput}
                disabled={isSubmitting}
                maxLength={2000}
                onChange={(event) => {
                  setComment(event.target.value)
                  setError('')
                }}
                placeholder="Explique por qué se modifica la decisión de pago"
                rows={4}
                value={comment}
              />
            </label>
          )}

          {error && <p className={styles.credentialsError}>{error}</p>}
        </div>

        <footer className={styles.credentialsModalFooter}>
          <button
            className={styles.credentialsSecondaryButton}
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className={styles.credentialsPrimaryButton}
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
