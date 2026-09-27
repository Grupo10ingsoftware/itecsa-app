import { useRef } from 'react'
import UserCreateForm from './UserCreateForm'
import { useModalDialog } from '../hooks/useModalDialog'
import styles from '../pages/UserManagementPage.module.css'

export default function UserCreateModal({ isOpen, onClose, onCreated }) {
  const modalRef = useRef(null)
  const titleRef = useRef(null)

  useModalDialog({ containerRef: modalRef, initialFocusRef: titleRef, isOpen, onClose })

  if (!isOpen) {
    return null
  }

  function handleBackdropMouseDown(event) {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  return (
    <div className={styles.modalLayer} data-modal-layer="true" onMouseDown={handleBackdropMouseDown} role="presentation">
      <section
        aria-labelledby="user-create-modal-title"
        aria-modal="true"
        className={styles.createModal}
        ref={modalRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className={`${styles.modalHeader} ${styles.createModalHeader}`}>
          <div>
            <h2 id="user-create-modal-title" ref={titleRef} tabIndex={-1}>Creacion de usuario</h2>
          </div>
          <button
            aria-label="Cerrar modal de creacion"
            className={styles.modalCloseButton}
            onClick={onClose}
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
