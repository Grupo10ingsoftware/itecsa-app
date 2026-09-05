import { useId, useRef, useState } from 'react'
import Modal from 'react-bootstrap/Modal'
import { useAuth } from '../../../hooks/useAuth'
import styles from './LogoutButton.module.css'

export default function LogoutButton() {
  const { logout } = useAuth()
  const [showConfirmation, setShowConfirmation] = useState(false)
  const confirmationPending = useRef(false)
  const cancelButtonRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()

  function openConfirmation() {
    confirmationPending.current = true
    setShowConfirmation(true)
  }

  function closeConfirmation() {
    confirmationPending.current = false
    setShowConfirmation(false)
  }

  function handleLogout() {
    if (!confirmationPending.current) return

    closeConfirmation()
    logout()
  }

  return (
    <>
      <button
        aria-label="Cerrar sesión"
        className={`btn btn-sm w-100 ${styles.logoutButton}`}
        onClick={openConfirmation}
        type="button"
      >
        Cerrar sesión
      </button>

      <Modal
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        centered
        onEntered={() => cancelButtonRef.current?.focus()}
        onHide={closeConfirmation}
        show={showConfirmation}
      >
        <Modal.Header closeButton closeLabel="Cancelar cierre de sesión">
          <Modal.Title id={titleId}>Cerrar sesión</Modal.Title>
        </Modal.Header>
        <Modal.Body id={descriptionId}>
          ¿Seguro que quieres cerrar sesión?
        </Modal.Body>
        <Modal.Footer>
          <button
            autoFocus
            className="btn btn-secondary"
            onClick={closeConfirmation}
            ref={cancelButtonRef}
            type="button"
          >
            Cancelar
          </button>
          <button className="btn btn-danger" onClick={handleLogout} type="button">
            Cerrar sesión
          </button>
        </Modal.Footer>
      </Modal>
    </>
  )
}
