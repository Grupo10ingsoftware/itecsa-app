import { useState } from 'react'
import { Link } from 'react-router-dom'
import { APP_ROUTES } from '../../../config/routes'
import {
  PasswordResetApiError,
  requestPasswordResetEmail,
} from '../api/passwordResetApi'
import styles from './PasswordResetPage.module.css'

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DEFAULT_ERROR_MESSAGE =
  'No fue posible solicitar la recuperación de contraseña. Intenta nuevamente.'

function getMessageVariant(status) {
  if (status === 'sent') {
    return styles.success
  }

  if (status === 'disabled') {
    return styles.warning
  }

  return styles.info
}

function getApiErrorMessage(error) {
  if (error instanceof PasswordResetApiError && typeof error.payload?.message === 'string') {
    return error.payload.message
  }

  return DEFAULT_ERROR_MESSAGE
}

export default function PasswordResetPage() {
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [result, setResult] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()

    setResult(null)

    if (!EMAIL_FORMAT.test(normalizedEmail)) {
      setFieldError('Ingresa un correo válido.')
      return
    }

    setFieldError('')
    setIsSubmitting(true)

    try {
      const payload = await requestPasswordResetEmail({ email: normalizedEmail })
      setResult({
        status: payload?.status ?? 'error',
        message: payload?.message ?? DEFAULT_ERROR_MESSAGE,
      })
    } catch (error) {
      setResult({
        status: 'error',
        message: getApiErrorMessage(error),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="password-reset-title">
        <header className={styles.header}>
          <span className={styles.brand}>ITECSA</span>
          <h1 className={styles.title} id="password-reset-title">
            Recuperar contraseña
          </h1>
        </header>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="password-reset-email">
              Correo electrónico
            </label>
            <input
              className={styles.input}
              id="password-reset-email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="usuario@itecsa.cl"
              type="email"
              value={email}
              aria-describedby={fieldError ? 'password-reset-email-error' : undefined}
              aria-invalid={fieldError ? 'true' : 'false'}
            />
            {fieldError && (
              <p className={styles.fieldError} id="password-reset-email-error">
                {fieldError}
              </p>
            )}
          </div>

          {result && (
            <div className={`${styles.message} ${getMessageVariant(result.status)}`} role="status">
              {result.message}
            </div>
          )}

          <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                Enviando
              </>
            ) : (
              <>
                <i className="bi bi-envelope" aria-hidden="true" />
                Enviar enlace
              </>
            )}
          </button>

          <Link className={styles.backLink} to={APP_ROUTES.LOGIN}>
            <i className="bi bi-arrow-left" aria-hidden="true" />
            Volver al inicio de sesión
          </Link>
        </form>
      </section>
    </main>
  )
}
