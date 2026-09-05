import { useState } from 'react'
import { getRoleLabel, OFFICIAL_ROLES } from '../../../config/roles'
import { API_ERROR_CODES } from '../../../services/api/apiClient'
import { useAuth } from '../../../hooks/useAuth'
import { useAdminUsersApi } from '../hooks/useAdminUsersApi'
import { hasValidationErrors, validateUserCreateForm } from '../utils/userValidation'

const INITIAL_VALUES = Object.freeze({
  nombreUsuario: '',
  apellidoUsuario: '',
  rutUsuario: '',
  correoUsuario: '',
  rolUsuario: '',
})

const INITIAL_ERRORS = Object.freeze({
  nombreUsuario: [],
  apellidoUsuario: [],
  rutUsuario: [],
  correoUsuario: [],
  rolUsuario: [],
})

const MESSAGE_TYPES = Object.freeze({
  SUCCESS: 'success',
  WARNING: 'warning',
  DANGER: 'danger',
  INFO: 'info',
})

function FieldErrors({ errors, id }) {
  if (errors.length === 0) {
    return null
  }

  return (
    <div className="invalid-feedback d-block" id={id}>
      {errors.map((error) => (
        <p className="mb-0" key={error}>
          {error}
        </p>
      ))}
    </div>
  )
}

function getErrorMessage(error) {
  if (error?.code === API_ERROR_CODES.SESSION_INVALID || error?.status === 401) {
    return {
      type: MESSAGE_TYPES.WARNING,
      text: 'La sesion no es valida o expiro. Vuelve a iniciar sesion para crear usuarios.',
      requiresLogin: true,
    }
  }

  if (error?.status === 403) {
    return {
      type: MESSAGE_TYPES.DANGER,
      text: 'Acceso denegado. Tu usuario no tiene permisos para crear usuarios.',
    }
  }

  if (error?.status === 409) {
    return {
      type: MESSAGE_TYPES.WARNING,
      text: 'Ya existe un usuario con ese correo.',
    }
  }

  if (error?.code === API_ERROR_CODES.NETWORK_ERROR) {
    return {
      type: MESSAGE_TYPES.DANGER,
      text: 'No fue posible contactar la API. Revisa la conexion e intenta nuevamente.',
    }
  }

  return {
    type: MESSAGE_TYPES.DANGER,
    text: 'No fue posible crear el usuario. Intenta nuevamente.',
  }
}

function buildCreatedUserMessage(user) {
  if (user.passwordSetupEmailRequested) {
    return {
      type: MESSAGE_TYPES.SUCCESS,
      text: 'Usuario creado correctamente. Auth0 solicitara el correo para establecer contrasena.',
    }
  }

  if (user.roleAssignmentCompleted === false) {
    return {
      type: MESSAGE_TYPES.WARNING,
      text: 'La cuenta fue creada, pero no se pudo asignar el rol de acceso. Requiere gestion manual antes de solicitar el correo de contrasena.',
    }
  }

  return {
    type: MESSAGE_TYPES.WARNING,
    text: 'La cuenta fue creada, pero no se pudo solicitar el correo de establecimiento de contrasena.',
  }
}

export default function UserCreateForm({ onCreated } = {}) {
  const { loginWithRedirect } = useAuth()
  const adminUsersApi = useAdminUsersApi()
  const [values, setValues] = useState(INITIAL_VALUES)
  const [fieldErrors, setFieldErrors] = useState(INITIAL_ERRORS)
  const [message, setMessage] = useState(null)
  const [createdUser, setCreatedUser] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRequestingPasswordEmail, setIsRequestingPasswordEmail] = useState(false)

  function clearResultState() {
    setMessage(null)
    setCreatedUser(null)
  }

  function handleFieldChange(event) {
    const { name, value } = event.target

    setValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
    clearResultState()
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = validateUserCreateForm(values)
    setFieldErrors(nextErrors)
    clearResultState()

    if (hasValidationErrors(nextErrors)) {
      return
    }

    const payload = {
      nombreUsuario: values.nombreUsuario.trim(),
      apellidoUsuario: values.apellidoUsuario.trim(),
      rutUsuario: values.rutUsuario.trim().toUpperCase(),
      correoUsuario: values.correoUsuario.trim().toLowerCase(),
      rolUsuario: values.rolUsuario,
    }

    setIsSubmitting(true)

    try {
      const user = await adminUsersApi.createUser(payload)
      setCreatedUser(user)
      setMessage(buildCreatedUserMessage(user))
      setValues(INITIAL_VALUES)
      setFieldErrors(INITIAL_ERRORS)
      onCreated?.(user)
    } catch (error) {
      setMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handlePasswordSetupEmailRequest() {
    if (!createdUser?.correoUsuario || createdUser.roleAssignmentCompleted === false) {
      return
    }

    setIsRequestingPasswordEmail(true)

    try {
      const response = await adminUsersApi.requestPasswordSetupEmail({
        correoUsuario: createdUser.correoUsuario,
      })
      setCreatedUser((currentUser) => ({
        ...currentUser,
        passwordSetupEmailRequested: response.passwordSetupEmailRequested,
      }))
      setMessage({
        type: MESSAGE_TYPES.SUCCESS,
        text: 'Correo de establecimiento de contrasena solicitado correctamente.',
      })
    } catch (error) {
      const nextMessage = getErrorMessage(error)
      const shouldKeepMappedMessage =
        error?.code === API_ERROR_CODES.SESSION_INVALID ||
        error?.status === 401 ||
        error?.status === 403

      setMessage({
        ...nextMessage,
        text: shouldKeepMappedMessage
          ? nextMessage.text
          : 'No fue posible solicitar el correo de establecimiento de contrasena. Intenta nuevamente.',
      })
    } finally {
      setIsRequestingPasswordEmail(false)
    }
  }

  const canRequestPasswordSetupEmail =
    createdUser?.passwordSetupEmailRequested === false &&
    createdUser?.roleAssignmentCompleted !== false
  const isSessionInvalid = message?.requiresLogin === true
  const nombreUsuarioErrors = fieldErrors.nombreUsuario ?? []
  const apellidoUsuarioErrors = fieldErrors.apellidoUsuario ?? []
  const rutUsuarioErrors = fieldErrors.rutUsuario ?? []
  const correoUsuarioErrors = fieldErrors.correoUsuario ?? []
  const rolUsuarioErrors = fieldErrors.rolUsuario ?? []

  return (
    <form className="row g-3" noValidate onSubmit={handleSubmit}>
      {message && (
        <div className="col-12">
          <div className={`alert alert-${message.type} mb-0`} role="status">
            <p className="mb-0">{message.text}</p>
            {isSessionInvalid && (
              <button
                className="btn btn-sm btn-outline-dark mt-2"
                onClick={() => loginWithRedirect()}
                type="button"
              >
                Iniciar sesion
              </button>
            )}
          </div>
        </div>
      )}

      <div className="col-md-6">
        <label className="form-label" htmlFor="user-first-name">
          Nombres
        </label>
        <input
          aria-describedby="user-first-name-errors"
          aria-invalid={nombreUsuarioErrors.length > 0}
          className={`form-control ${
            nombreUsuarioErrors.length > 0 ? 'is-invalid' : ''
          }`}
          id="user-first-name"
          name="nombreUsuario"
          onChange={handleFieldChange}
          type="text"
          value={values.nombreUsuario}
        />
        <FieldErrors errors={nombreUsuarioErrors} id="user-first-name-errors" />
      </div>

      <div className="col-md-6">
        <label className="form-label" htmlFor="user-last-name">
          Apellidos
        </label>
        <input
          aria-describedby="user-last-name-errors"
          aria-invalid={apellidoUsuarioErrors.length > 0}
          className={`form-control ${
            apellidoUsuarioErrors.length > 0 ? 'is-invalid' : ''
          }`}
          id="user-last-name"
          name="apellidoUsuario"
          onChange={handleFieldChange}
          type="text"
          value={values.apellidoUsuario}
        />
        <FieldErrors errors={apellidoUsuarioErrors} id="user-last-name-errors" />
      </div>

      <div className="col-md-6">
        <label className="form-label" htmlFor="user-rut">
          RUT
        </label>
        <input
          aria-describedby="user-rut-errors"
          aria-invalid={rutUsuarioErrors.length > 0}
          className={`form-control ${rutUsuarioErrors.length > 0 ? 'is-invalid' : ''}`}
          id="user-rut"
          name="rutUsuario"
          onChange={handleFieldChange}
          placeholder="12.345.678-9"
          type="text"
          value={values.rutUsuario}
        />
        <FieldErrors errors={rutUsuarioErrors} id="user-rut-errors" />
      </div>

      <div className="col-md-6">
        <label className="form-label" htmlFor="user-email">
          Correo electronico
        </label>
        <input
          aria-describedby="user-email-errors"
          aria-invalid={correoUsuarioErrors.length > 0}
          className={`form-control ${
            correoUsuarioErrors.length > 0 ? 'is-invalid' : ''
          }`}
          id="user-email"
          name="correoUsuario"
          onChange={handleFieldChange}
          type="email"
          value={values.correoUsuario}
        />
        <FieldErrors errors={correoUsuarioErrors} id="user-email-errors" />
      </div>

      <div className="col-md-6">
        <label className="form-label" htmlFor="user-role">
          Rol
        </label>
        <select
          aria-describedby="user-role-errors"
          aria-invalid={rolUsuarioErrors.length > 0}
          className={`form-select ${rolUsuarioErrors.length > 0 ? 'is-invalid' : ''}`}
          id="user-role"
          name="rolUsuario"
          onChange={handleFieldChange}
          value={values.rolUsuario}
        >
          <option value="">Selecciona un rol</option>
          {OFFICIAL_ROLES.map((role) => (
            <option key={role} value={role}>
              {getRoleLabel(role)}
            </option>
          ))}
        </select>
        <FieldErrors errors={rolUsuarioErrors} id="user-role-errors" />
      </div>

      <div className="col-12">
        <label className="form-label" htmlFor="user-password">
          Contrasena
        </label>
        <input
          aria-describedby="user-password-help"
          className="form-control"
          disabled
          id="user-password"
          name="password"
          placeholder="Gestionada por Auth0"
          type="password"
        />
        <p className="form-text mb-0" id="user-password-help">
          El usuario establecera su contrasena mediante un correo enviado por Auth0.
        </p>
      </div>

      <div className="col-12 d-flex gap-2">
        <button className="btn btn-primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Creando usuario...' : 'Crear usuario'}
        </button>
        {canRequestPasswordSetupEmail && (
          <button
            className="btn btn-outline-primary"
            disabled={isRequestingPasswordEmail}
            onClick={handlePasswordSetupEmailRequest}
            type="button"
          >
            {isRequestingPasswordEmail ? 'Solicitando correo...' : 'Solicitar correo'}
          </button>
        )}
      </div>

      {createdUser && (
        <div className="col-12">
          <div className="border rounded p-3 bg-light">
            <h2 className="h6 mb-3">Resultado de creacion</h2>
            <dl className="row mb-0 small">
              <div className="col-md-6">
                <dt className="text-secondary">Nombre</dt>
                <dd>{createdUser.nombreUsuario} {createdUser.apellidoUsuario}</dd>
              </div>
              <div className="col-md-6">
                <dt className="text-secondary">RUT</dt>
                <dd>{createdUser.rutUsuario}</dd>
              </div>
              <div className="col-md-6">
                <dt className="text-secondary">Correo electronico</dt>
                <dd>{createdUser.correoUsuario}</dd>
              </div>
              <div className="col-md-6">
                <dt className="text-secondary">Rol</dt>
                <dd>{getRoleLabel(createdUser.rolUsuario)}</dd>
              </div>
              <div className="col-md-6">
                <dt className="text-secondary">Correo de contrasena</dt>
                <dd>{createdUser.passwordSetupEmailRequested ? 'Solicitado' : 'Pendiente'}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </form>
  )
}
