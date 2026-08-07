import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import UserButton from './UserButton'
import styles from '../pages/UserManagementPage.module.css'

export default function UserUnlinkConfirmModal({ isOpen, onClose, onConfirm, user }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const emailInputRef = useRef(null)

  const resetFields = useCallback(() => {
    setEmail('')
    setPassword('')
    setError('')
  }, [])

  const handleClose = useCallback(() => {
    resetFields()
    onClose()
  }, [onClose, resetFields])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusTimer = window.setTimeout(() => emailInputRef.current?.focus(), 0)

    function handleEscape(event) {
      if (event.key === 'Escape' && !isSubmitting) {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousBodyOverflow
      document.removeEventListener('keydown', handleEscape)
    }
  }, [handleClose, isOpen, isSubmitting])

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.length > 0
  }, [email, password])

  if (!isOpen || !user) {
    return null
  }

  function handleBackdropMouseDown(event) {
    if (event.target === event.currentTarget && !isSubmitting) {
      handleClose()
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmedEmail = email.trim()

    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setError('Ingrese un correo valido.')
      return
    }

    if (!password) {
      setError('Ingrese su contrasena.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await onConfirm(user)
      resetFields()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.modalLayer} onMouseDown={handleBackdropMouseDown} role="presentation">
      <form
        aria-labelledby="user-unlink-modal-title"
        aria-modal="true"
        className={styles.confirmModal}
        noValidate
        onSubmit={handleSubmit}
        role="dialog"
      >
        <header className={styles.modalHeader}>
          <div>
            <span className={styles.modalKicker}>Desvinculacion</span>
            <h2 id="user-unlink-modal-title">Confirmar desvinculacion</h2>
          </div>
          <button
            aria-label="Cerrar modal de desvinculacion"
            className={styles.modalCloseButton}
            disabled={isSubmitting}
            onClick={handleClose}
            type="button"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div className={styles.modalBody}>
          <p className={styles.confirmText}>
            Ingrese su correo y contrasena para hacer efectiva la desvinculacion de {user.nombreCompleto}.
          </p>
          <div className={styles.confirmFields}>
            <label className={styles.editField} htmlFor="unlink-email">
              <span>Correo</span>
              <input
                autoComplete="email"
                className={styles.formControl}
                id="unlink-email"
                onChange={(event) => {
                  setEmail(event.target.value)
                  setError('')
                }}
                ref={emailInputRef}
                type="email"
                value={email}
              />
            </label>
            <label className={styles.editField} htmlFor="unlink-password">
              <span>Contrasena</span>
              <input
                autoComplete="current-password"
                className={styles.formControl}
                id="unlink-password"
                onChange={(event) => {
                  setPassword(event.target.value)
                  setError('')
                }}
                type="password"
                value={password}
              />
            </label>
          </div>
          {error && <p className={styles.confirmError}>{error}</p>}
        </div>

        <footer className={styles.modalFooter}>
          <UserButton disabled={isSubmitting} onClick={handleClose} variant="secondary">
            Cancelar
          </UserButton>
          <UserButton disabled={isSubmitting || !canSubmit} type="submit" variant="danger">
            {isSubmitting ? 'Desvinculando...' : 'Desvincular'}
          </UserButton>
        </footer>
      </form>
    </div>
  )
}
