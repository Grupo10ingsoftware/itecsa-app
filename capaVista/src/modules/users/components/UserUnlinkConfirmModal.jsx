import { useCallback, useMemo, useRef, useState } from 'react'
import UserButton from './UserButton'
import { useModalDialog } from '../hooks/useModalDialog'
import styles from '../pages/UserManagementPage.module.css'

export default function UserUnlinkConfirmModal({ isOpen, onClose, onConfirm, user }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const pinInputRef = useRef(null)
  const modalRef = useRef(null)

  const resetFields = useCallback(() => {
    setPin('')
    setError('')
  }, [])

  const handleClose = useCallback(() => {
    resetFields()
    onClose()
  }, [onClose, resetFields])

  useModalDialog({
    canClose: !isSubmitting,
    containerRef: modalRef,
    initialFocusRef: pinInputRef,
    isOpen: Boolean(isOpen && user),
    onClose: handleClose,
  })

  const canSubmit = useMemo(() => /^\d{6}$/.test(pin.trim()), [pin])

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
    const trimmedPin = pin.trim()

    if (!/^\d{6}$/.test(trimmedPin)) {
      setError('Ingrese un PIN valido de 6 digitos.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await onConfirm({ ...user, pin: trimmedPin })
      resetFields()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.modalLayer} data-modal-layer="true" onMouseDown={handleBackdropMouseDown} role="presentation">
      <form
        aria-describedby="user-unlink-modal-description"
        aria-labelledby="user-unlink-modal-title"
        aria-modal="true"
        className={styles.confirmModal}
        noValidate
        onSubmit={handleSubmit}
        ref={modalRef}
        role="dialog"
        tabIndex={-1}
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
          <p className={styles.confirmText} id="user-unlink-modal-description">
            Ingrese su PIN para hacer efectiva la desvinculacion de {user.nombreCompleto}.
          </p>
          <div className={styles.confirmFields}>
            <label className={styles.editField} htmlFor="unlink-pin">
              <span>PIN</span>
              <input
                autoComplete="one-time-code"
                className={styles.formControl}
                id="unlink-pin"
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => {
                  setPin(event.target.value.replace(/\D/g, '').slice(0, 6))
                  setError('')
                }}
                placeholder="000000"
                ref={pinInputRef}
                type="password"
                value={pin}
              />
            </label>
          </div>
          {error && <p className={styles.confirmError} role="alert">{error}</p>}
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
