import { useMemo, useState } from 'react'
import styles from './PaymentActionConfirmModal.module.css'

export default function PaymentCredentialsModal({
  isSubmitting = false,
  onCancel,
  onConfirm,
  order,
  targetStatus,
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0,
    [email, password],
  )

  if (!order || !targetStatus) return null

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmedEmail = email.trim()

    if (!trimmedEmail || !password) {
      setError('Ingrese correo y contrasena del usuario.')
      return
    }

    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setError('Ingrese un correo valido.')
      return
    }

    setError('')
    onConfirm({ email: trimmedEmail, password })
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
            <h3 id="payment-credentials-modal-title">Ingrese sus credenciales</h3>
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
            Ingrese su correo y contrasena para hacer efectivo el cambio de pago
            de {order.nvNumber} a {targetStatus}.
          </p>

          <label>
            <span>Correo</span>
            <input
              autoComplete="email"
              disabled={isSubmitting}
              onChange={(event) => {
                setEmail(event.target.value)
                setError('')
              }}
              placeholder="usuario@itecsa.cl"
              type="email"
              value={email}
            />
          </label>

          <label>
            <span>Contrasena</span>
            <input
              autoComplete="current-password"
              disabled={isSubmitting}
              onChange={(event) => {
                setPassword(event.target.value)
                setError('')
              }}
              placeholder="Ingrese contrasena"
              type="password"
              value={password}
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
