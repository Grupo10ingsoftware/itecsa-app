import { useEffect, useRef } from 'react'
import UserCreateForm from './UserCreateForm'
import styles from '../pages/UserManagementPage.module.css'

export default function UserCreateModal({ isOpen, onClose, onCreated }) {
  const closeButtonRef = useRef(null)

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0)

    function handleEscape(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousBodyOverflow
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  function handleBackdropMouseDown(event) {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  return (
    <div className={styles.modalLayer} onMouseDown={handleBackdropMouseDown} role="presentation">
      <section aria-labelledby="user-create-modal-title" aria-modal="true" className={styles.createModal} role="dialog">
        <header className={`${styles.modalHeader} ${styles.createModalHeader}`}>
          <div>
            <span className={styles.modalKicker}>Administracion</span>
            <h2 id="user-create-modal-title">Crear usuario</h2>
            <p>Completa la informacion para registrar un nuevo usuario en el sistema.</p>
          </div>
          <button
            aria-label="Cerrar modal de creacion"
            className={styles.modalCloseButton}
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>
        <div className={`${styles.modalBody} ${styles.createModalBody}`}>
          <UserCreateForm mode="modal" onCancel={onClose} onCreated={onCreated} />
        </div>
      </section>
    </div>
  )
}
