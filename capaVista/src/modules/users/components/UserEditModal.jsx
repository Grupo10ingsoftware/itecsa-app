import { useEffect, useRef, useState } from 'react'
import { OFFICIAL_ROLES } from '../../../config/roles'
import UserButton from './UserButton'
import styles from '../pages/UserManagementPage.module.css'

const USER_STATUSES = Object.freeze(['Activo', 'Desvinculado'])

function createFormState(user) {
  return {
    primerNombre: user.primerNombre || user.nombreCompleto.split(' ')[0] || '',
    apellidoPaterno: user.apellidoPaterno || user.nombreCompleto.split(' ').slice(1).join(' ') || '',
    rut: user.rut,
    correo: user.correo,
    rol: user.rol,
    estado: user.estado,
  }
}

export default function UserEditModal({ isOpen, onClose, onSave, user }) {
  const [values, setValues] = useState(() => (user ? createFormState(user) : null))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const firstInputRef = useRef(null)

  useEffect(() => {
    if (!isOpen || !user) {
      return undefined
    }

    const previouslyFocusedElement = document.activeElement
    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusTimer = window.setTimeout(() => {
      firstInputRef.current?.focus()
    }, 0)

    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousBodyOverflow
      previouslyFocusedElement?.focus?.()
    }
  }, [isOpen, user])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handleEscape(event) {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen || !user || !values) {
    return null
  }

  function handleChange(event) {
    const { name, value } = event.target
    setValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
  }

  function handleBackdropMouseDown(event) {
    if (event.target === event.currentTarget && !isSubmitting) {
      onClose()
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      await onSave({
        ...user,
        primerNombre: values.primerNombre.trim(),
        apellidoPaterno: values.apellidoPaterno.trim(),
        nombreCompleto: `${values.primerNombre.trim()} ${values.apellidoPaterno.trim()}`.trim(),
        rut: values.rut.trim(),
        correo: values.correo.trim().toLowerCase(),
        rol: values.rol,
        estado: values.estado,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isActive = values.estado === 'Activo'

  return (
    <div className={styles.modalLayer} onMouseDown={handleBackdropMouseDown} role="presentation">
      <form
        aria-labelledby="user-edit-modal-title"
        aria-modal="true"
        className={styles.editModal}
        noValidate
        onSubmit={handleSubmit}
        role="dialog"
      >
        <header className={styles.editModalHeader}>
          <div>
            <span className={styles.editModalKicker}>Usuario</span>
            <h2 className={styles.editModalTitle} id="user-edit-modal-title">
              Editar usuario
            </h2>
          </div>

          <button
            aria-label="Cerrar modal de edición"
            className={styles.editModalCloseButton}
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div className={styles.editModalBody}>
          <section className={styles.editIdentityCard} aria-label="Resumen del usuario">
            <span className={styles.editIdentityAvatar} aria-hidden="true">
              <i className="bi bi-person-fill" />
            </span>

            <div className={styles.editIdentityInfo}>
              <h3>{user.nombreCompleto}</h3>
              <p>{values.correo}</p>
            </div>

            <div className={styles.editIdentityBadges}>
              <span className={styles.editRoleBadge}>{values.rol}</span>
              <span
                className={`${styles.editStatusBadge} ${
                  isActive ? styles.editStatusActive : styles.editStatusUnlinked
                }`}
              >
                <span className={styles.editStatusDot} aria-hidden="true" />
                {values.estado}
              </span>
            </div>
          </section>

          <section className={styles.editFormSection} aria-labelledby="edit-personal-title">
            <header className={styles.editSectionHeader}>
              <i className="bi bi-person" aria-hidden="true" />
              <h3 id="edit-personal-title">Información personal</h3>
            </header>

            <div className={styles.editFieldsGrid}>
              <label className={styles.editField} htmlFor="edit-user-first-name">
                <span>Nombre</span>
                <input
                  className={styles.formControl}
                  id="edit-user-first-name"
                  name="primerNombre"
                  onChange={handleChange}
                  ref={firstInputRef}
                  required
                  type="text"
                  value={values.primerNombre}
                />
              </label>

              <label className={styles.editField} htmlFor="edit-user-last-name">
                <span>Apellido</span>
                <input
                  className={styles.formControl}
                  id="edit-user-last-name"
                  name="apellidoPaterno"
                  onChange={handleChange}
                  required
                  type="text"
                  value={values.apellidoPaterno}
                />
              </label>

              <label className={styles.editField} htmlFor="edit-user-email">
                <span>Correo electrónico</span>
                <input
                  className={styles.formControl}
                  id="edit-user-email"
                  name="correo"
                  onChange={handleChange}
                  required
                  type="email"
                  value={values.correo}
                />
              </label>

              <label className={styles.editField} htmlFor="edit-user-rut">
                <span>RUT</span>
                <span className={styles.editLockedControl}>
                  <input
                    className={styles.formControl}
                    disabled
                    id="edit-user-rut"
                    name="rut"
                    type="text"
                    value={values.rut}
                  />
                  <i className="bi bi-lock" aria-hidden="true" />
                </span>
              </label>
            </div>
          </section>

          <section className={styles.editFormSection} aria-labelledby="edit-access-title">
            <header className={styles.editSectionHeader}>
              <i className="bi bi-shield" aria-hidden="true" />
              <h3 id="edit-access-title">Acceso y estado</h3>
            </header>

            <div className={styles.editFieldsGrid}>
              <label className={styles.editField} htmlFor="edit-user-role">
                <span>Rol</span>
                <select
                  className={styles.formControl}
                  id="edit-user-role"
                  name="rol"
                  onChange={handleChange}
                  value={values.rol}
                >
                  {OFFICIAL_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.editField} htmlFor="edit-user-status">
                <span>Estado</span>
                <select
                  className={styles.formControl}
                  id="edit-user-status"
                  name="estado"
                  onChange={handleChange}
                  value={values.estado}
                >
                  {USER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
        </div>

        <footer className={styles.editModalFooter}>
          <UserButton
            className={styles.editCancelButton}
            disabled={isSubmitting}
            onClick={onClose}
            variant="secondary"
          >
            Cancelar
          </UserButton>
          <UserButton
            className={styles.editSaveButton}
            disabled={isSubmitting}
            type="submit"
            variant="primary"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
          </UserButton>
        </footer>
      </form>
    </div>
  )
}
