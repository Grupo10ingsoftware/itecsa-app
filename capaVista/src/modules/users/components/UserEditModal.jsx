import { useEffect, useMemo, useRef, useState } from 'react'
import { getRoleLabel, OFFICIAL_ROLES } from '../../../config/roles'
import UserButton from './UserButton'
import styles from '../pages/UserManagementPage.module.css'

const SELF_ROLE_EDIT_MESSAGE = 'No puedes cambiar tu propio rol.'

function createFormState(user) {
  return {
    nombreUsuario: user.nombreUsuario ?? '',
    apellidoUsuario: user.apellidoUsuario ?? '',
    correoUsuario: user.correoUsuario ?? '',
    rolUsuario: user.rolUsuario ?? '',
  }
}

export default function UserEditModal({ isCurrentUser = false, isOpen, onClose, onSave, user }) {
  const [values, setValues] = useState(() => (user ? createFormState(user) : null))
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const firstInputRef = useRef(null)

  useEffect(() => {
    if (!isOpen || !user) {
      return undefined
    }

    setPin('')
    setPinError('')
    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusTimer = window.setTimeout(() => firstInputRef.current?.focus(), 0)

    function handleEscape(event) {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousBodyOverflow
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, isSubmitting, onClose, user])

  const canSubmit = useMemo(() => {
    if (!values) {
      return false
    }

    const currentRole = user?.rolUsuario ?? ''

    return (
      Object.values(values).every((value) => String(value).trim().length > 0) &&
      /^\d{6}$/.test(pin.trim()) &&
      !(isCurrentUser && values.rolUsuario !== currentRole)
    )
  }, [isCurrentUser, pin, user?.rolUsuario, values])

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

    const trimmedPin = pin.trim()

    if (!/^\d{6}$/.test(trimmedPin)) {
      setPinError('Ingrese un PIN valido de 6 digitos.')
      return
    }

    if (isCurrentUser && values.rolUsuario !== (user.rolUsuario ?? '')) {
      return
    }

    setIsSubmitting(true)

    try {
      await onSave({
        ...user,
        nombreUsuario: values.nombreUsuario.trim(),
        apellidoUsuario: values.apellidoUsuario.trim(),
        correoUsuario: values.correoUsuario.trim().toLowerCase(),
        rolUsuario: values.rolUsuario,
        pin: trimmedPin,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

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
        <header className={styles.modalHeader}>
          <div>
            <span className={styles.modalKicker}>Usuario</span>
            <h2 id="user-edit-modal-title">Editar usuario</h2>
          </div>
          <button
            aria-label="Cerrar modal de edicion"
            className={styles.modalCloseButton}
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div className={styles.modalBody}>
          <div className={styles.editIdentityCard}>
            <span className={styles.editIdentityAvatar} aria-hidden="true">
              <i className="bi bi-person-fill" />
            </span>
            <div>
              <h3>{user.nombreCompleto}</h3>
              <p>{user.rutUsuario}</p>
            </div>
          </div>

          <div className={styles.editFieldsGrid}>
            <label className={styles.editField} htmlFor="edit-user-first-name">
              <span>Nombre</span>
              <input
                className={styles.formControl}
                id="edit-user-first-name"
                name="nombreUsuario"
                onChange={handleChange}
                ref={firstInputRef}
                required
                type="text"
                value={values.nombreUsuario}
              />
            </label>

            <label className={styles.editField} htmlFor="edit-user-last-name">
              <span>Apellido</span>
              <input
                className={styles.formControl}
                id="edit-user-last-name"
                name="apellidoUsuario"
                onChange={handleChange}
                required
                type="text"
                value={values.apellidoUsuario}
              />
            </label>

            <label className={styles.editField} htmlFor="edit-user-email">
              <span>Correo electronico</span>
              <input
                className={styles.formControl}
                id="edit-user-email"
                name="correoUsuario"
                onChange={handleChange}
                required
                type="email"
                value={values.correoUsuario}
              />
            </label>

            <label className={styles.editField} htmlFor="edit-user-role">
              <span>Rol</span>
              <select
                className={styles.formControl}
                disabled={isCurrentUser}
                id="edit-user-role"
                name="rolUsuario"
                onChange={handleChange}
                value={values.rolUsuario}
              >
                <option value="">Selecciona un rol</option>
                {OFFICIAL_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {getRoleLabel(role)}
                  </option>
                ))}
              </select>
              {isCurrentUser && <small className={styles.fieldHelpText}>{SELF_ROLE_EDIT_MESSAGE}</small>}
            </label>
          </div>

          <label className={styles.editField} htmlFor="edit-user-pin">
            <span>PIN de autorizacion</span>
            <input
              autoComplete="one-time-code"
              className={styles.formControl}
              id="edit-user-pin"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, '').slice(0, 6))
                setPinError('')
              }}
              placeholder="000000"
              required
              type="password"
              value={pin}
            />
            {pinError && <small className={styles.fieldHelpText}>{pinError}</small>}
          </label>
        </div>

        <footer className={styles.modalFooter}>
          <UserButton disabled={isSubmitting} onClick={onClose} variant="secondary">
            Cancelar
          </UserButton>
          <UserButton disabled={isSubmitting || !canSubmit} type="submit" variant="primary">
            {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
          </UserButton>
        </footer>
      </form>
    </div>
  )
}
