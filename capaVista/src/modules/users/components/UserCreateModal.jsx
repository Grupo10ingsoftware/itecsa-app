import { useEffect, useRef } from 'react'
import { OFFICIAL_ROLES } from '../../../config/roles'
import { useUserCreateForm } from '../hooks/useUserCreateForm'
import styles from '../pages/UserManagementPage.module.css'
import UserButton from './UserButton'

function FieldErrors({ errors, id }) {
  if (errors.length === 0) {
    return null
  }

  return (
    <div className={styles.createFieldErrors} id={id} role="alert">
      {errors.map((error) => (
        <p key={error}>{error}</p>
      ))}
    </div>
  )
}

export default function UserCreateModal({ isOpen, onClose, onCreated }) {
  const firstInputRef = useRef(null)
  const {
    fieldErrors,
    handleFieldChange,
    handleSubmit,
    isSessionInvalid,
    isSubmitting,
    loginWithRedirect,
    message,
    resetForm,
    values,
  } = useUserCreateForm({ onCreated })

  useEffect(() => {
    if (!isOpen) {
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
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handleEscape(event) {
      if (event.key === 'Escape' && !isSubmitting) {
        resetForm()
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, isSubmitting, onClose, resetForm])

  if (!isOpen) {
    return null
  }

  function handleClose() {
    if (isSubmitting) {
      return
    }

    resetForm()
    onClose()
  }

  function handleBackdropMouseDown(event) {
    if (event.target === event.currentTarget) {
      handleClose()
    }
  }

  const messageClass = message
    ? styles[`createFeedback${message.type[0].toUpperCase()}${message.type.slice(1)}`]
    : ''

  return (
    <div className={styles.modalLayer} onMouseDown={handleBackdropMouseDown} role="presentation">
      <form
        aria-labelledby="user-create-modal-title"
        aria-modal="true"
        className={styles.createModal}
        noValidate
        onSubmit={handleSubmit}
        role="dialog"
      >
        <header className={styles.createModalHeader}>
          <div>
            <span className={styles.createModalKicker}>Usuario</span>
            <h2 className={styles.createModalTitle} id="user-create-modal-title">
              Crear usuario
            </h2>
          </div>

          <button
            aria-label="Cerrar modal de creación"
            className={styles.createModalCloseButton}
            disabled={isSubmitting}
            onClick={handleClose}
            type="button"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div className={styles.createModalBody}>
          {message && (
            <div className={`${styles.createFeedback} ${messageClass}`} role="status">
              <span>{message.text}</span>
              {isSessionInvalid && (
                <UserButton onClick={() => loginWithRedirect()} variant="secondary">
                  Iniciar sesión
                </UserButton>
              )}
            </div>
          )}

          <div className={styles.createAuth0Note} role="note">
            <i className="bi bi-envelope" aria-hidden="true" />
            <span>Auth0 enviará un correo para que el usuario establezca su contraseña.</span>
          </div>

          <section className={styles.createFormSection} aria-labelledby="create-user-information-title">
            <header className={styles.createSectionHeader}>
              <i className="bi bi-person" aria-hidden="true" />
              <h3 id="create-user-information-title">Información del usuario</h3>
            </header>

            <fieldset className={styles.createFieldset} disabled={isSubmitting}>
              <div className={styles.createFieldsGrid}>
                <label className={styles.createField} htmlFor="create-user-first-name">
                  <span>Nombre</span>
                  <input
                    aria-describedby="create-user-first-name-errors"
                    aria-invalid={fieldErrors.primerNombre.length > 0}
                    className={`${styles.formControl} ${
                      fieldErrors.primerNombre.length > 0 ? styles.createInvalidControl : ''
                    }`}
                    id="create-user-first-name"
                    name="primerNombre"
                    onChange={handleFieldChange}
                    placeholder="Ingresa el nombre"
                    ref={firstInputRef}
                    type="text"
                    value={values.primerNombre}
                  />
                  <FieldErrors
                    errors={fieldErrors.primerNombre}
                    id="create-user-first-name-errors"
                  />
                </label>

                <label className={styles.createField} htmlFor="create-user-last-name">
                  <span>Apellido</span>
                  <input
                    aria-describedby="create-user-last-name-errors"
                    aria-invalid={fieldErrors.apellidoPaterno.length > 0}
                    className={`${styles.formControl} ${
                      fieldErrors.apellidoPaterno.length > 0 ? styles.createInvalidControl : ''
                    }`}
                    id="create-user-last-name"
                    name="apellidoPaterno"
                    onChange={handleFieldChange}
                    placeholder="Ingresa el apellido"
                    type="text"
                    value={values.apellidoPaterno}
                  />
                  <FieldErrors
                    errors={fieldErrors.apellidoPaterno}
                    id="create-user-last-name-errors"
                  />
                </label>

                <label className={styles.createField} htmlFor="create-user-email">
                  <span>Correo electrónico</span>
                  <input
                    aria-describedby="create-user-email-errors"
                    aria-invalid={fieldErrors.correoUsuario.length > 0}
                    className={`${styles.formControl} ${
                      fieldErrors.correoUsuario.length > 0 ? styles.createInvalidControl : ''
                    }`}
                    id="create-user-email"
                    name="correoUsuario"
                    onChange={handleFieldChange}
                    placeholder="usuario@correo.com"
                    type="email"
                    value={values.correoUsuario}
                  />
                  <FieldErrors errors={fieldErrors.correoUsuario} id="create-user-email-errors" />
                </label>

                <label className={styles.createField} htmlFor="create-user-rut">
                  <span>RUT</span>
                  <input
                    aria-describedby="create-user-rut-errors"
                    aria-invalid={fieldErrors.rutUsuario.length > 0}
                    className={`${styles.formControl} ${
                      fieldErrors.rutUsuario.length > 0 ? styles.createInvalidControl : ''
                    }`}
                    id="create-user-rut"
                    inputMode="text"
                    maxLength={12}
                    name="rutUsuario"
                    onChange={handleFieldChange}
                    placeholder="12.345.678-9"
                    type="text"
                    value={values.rutUsuario}
                  />
                  <FieldErrors errors={fieldErrors.rutUsuario} id="create-user-rut-errors" />
                </label>

                <label
                  className={`${styles.createField} ${styles.createRoleField}`}
                  htmlFor="create-user-role"
                >
                  <span>Rol</span>
                  <select
                    aria-describedby="create-user-role-errors"
                    aria-invalid={fieldErrors.rolUsuario.length > 0}
                    className={`${styles.formControl} ${
                      fieldErrors.rolUsuario.length > 0 ? styles.createInvalidControl : ''
                    }`}
                    id="create-user-role"
                    name="rolUsuario"
                    onChange={handleFieldChange}
                    value={values.rolUsuario}
                  >
                    <option value="">Selecciona un rol</option>
                    {OFFICIAL_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <FieldErrors errors={fieldErrors.rolUsuario} id="create-user-role-errors" />
                </label>
              </div>
            </fieldset>
          </section>
        </div>

        <footer className={styles.createModalFooter}>
          <UserButton
            className={styles.createCancelButton}
            disabled={isSubmitting}
            onClick={handleClose}
            variant="secondary"
          >
            Cancelar
          </UserButton>
          <UserButton
            className={styles.createSubmitButton}
            disabled={isSubmitting}
            type="submit"
            variant="primary"
          >
            {isSubmitting ? 'Creando usuario...' : 'Crear usuario'}
          </UserButton>
        </footer>
      </form>
    </div>
  )
}
