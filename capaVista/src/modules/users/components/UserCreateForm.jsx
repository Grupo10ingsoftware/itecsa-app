import { useState } from 'react'
import { OFFICIAL_ROLES } from '../../../config/roles'
import { API_ERROR_CODES } from '../../../services/api/apiClient'
import { useAuth } from '../../../hooks/useAuth'
import { useAdminUsersApi } from '../hooks/useAdminUsersApi'
import { hasValidationErrors, validateUserCreateForm } from '../utils/userValidation'

const INITIAL_VALUES = Object.freeze({
  primerNombre: '',
  apellidoPaterno: '',
  correoUsuario: '',
  rolUsuario: '',
})

const INITIAL_ERRORS = Object.freeze({
  primerNombre: [],
  apellidoPaterno: [],
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

export default function UserCreateForm() {
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
      primerNombre: values.primerNombre.trim(),
      apellidoPaterno: values.apellidoPaterno.trim(),
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

  return (
    <form className="row g-3 user-create-form" noValidate onSubmit={handleSubmit}>
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

      <div className="col-12">
        <section className="userCreateSection" aria-labelledby="user-create-personal-section">
          <div className="userCreateSectionHeader">
            <i className="bi bi-person" aria-hidden="true" />
            <h2 className="userCreateSectionTitle" id="user-create-personal-section">
              Datos personales
            </h2>
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor="user-first-name">
                Primer nombre
              </label>
              <input
                aria-describedby="user-first-name-errors"
                aria-invalid={fieldErrors.primerNombre.length > 0}
                className={`form-control ${
                  fieldErrors.primerNombre.length > 0 ? 'is-invalid' : ''
                }`}
                id="user-first-name"
                name="primerNombre"
                onChange={handleFieldChange}
                type="text"
                value={values.primerNombre}
              />
              <FieldErrors errors={fieldErrors.primerNombre} id="user-first-name-errors" />
            </div>

            <div className="col-md-6">
              <label className="form-label" htmlFor="user-last-name">
                Apellido paterno
              </label>
              <input
                aria-describedby="user-last-name-errors"
                aria-invalid={fieldErrors.apellidoPaterno.length > 0}
                className={`form-control ${
                  fieldErrors.apellidoPaterno.length > 0 ? 'is-invalid' : ''
                }`}
                id="user-last-name"
                name="apellidoPaterno"
                onChange={handleFieldChange}
                type="text"
                value={values.apellidoPaterno}
              />
              <FieldErrors errors={fieldErrors.apellidoPaterno} id="user-last-name-errors" />
            </div>

            <div className="col-md-6">
              <label className="form-label" htmlFor="user-rut">
                RUT
              </label>
              <input
                aria-describedby="user-rut-help"
                className="form-control"
                disabled
                id="user-rut"
                name="rutUsuario"
                placeholder="No disponible"
                type="text"
              />
              <div className="form-text" id="user-rut-help">
                Disponible cuando se integre la base de datos.
              </div>
            </div>

            <div className="col-md-6">
              <label className="form-label" htmlFor="user-email">
                Correo electronico
              </label>
              <input
                aria-describedby="user-email-errors"
                aria-invalid={fieldErrors.correoUsuario.length > 0}
                className={`form-control ${
                  fieldErrors.correoUsuario.length > 0 ? 'is-invalid' : ''
                }`}
                id="user-email"
                name="correoUsuario"
                onChange={handleFieldChange}
                type="email"
                value={values.correoUsuario}
              />
              <FieldErrors errors={fieldErrors.correoUsuario} id="user-email-errors" />
            </div>
          </div>
        </section>
      </div>

      <div className="col-12">
        <section className="userCreateSection" aria-labelledby="user-create-access-section">
          <div className="userCreateSectionHeader">
            <i className="bi bi-lock" aria-hidden="true" />
            <h2 className="userCreateSectionTitle" id="user-create-access-section">
              Acceso de usuario
            </h2>
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor="user-role">
                Rol
              </label>
              <select
                aria-describedby="user-role-errors"
                aria-invalid={fieldErrors.rolUsuario.length > 0}
                className={`form-select ${fieldErrors.rolUsuario.length > 0 ? 'is-invalid' : ''}`}
                id="user-role"
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
              <FieldErrors errors={fieldErrors.rolUsuario} id="user-role-errors" />
            </div>

            <div className="col-md-6">
              <label className="form-label" htmlFor="user-signature">
                Firma electronica
              </label>
              <input
                aria-describedby="user-signature-help"
                className="form-control"
                disabled
                id="user-signature"
                name="referenciaFirmaElectronica"
                placeholder="No disponible"
                type="text"
              />
              <div className="form-text" id="user-signature-help">
                Disponible cuando se integre la base de datos.
              </div>
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

            <div className="col-12">
              <div className="userCreateActions">
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
            </div>
          </div>
        </section>
      </div>

      {createdUser && (
        <div className="col-12">
          <div className="border rounded p-3 bg-light">
            <h2 className="h6 mb-3">Resultado de creacion</h2>
            <dl className="row mb-0 small">
              <div className="col-md-6">
                <dt className="text-secondary">Correo electronico</dt>
                <dd>{createdUser.correoUsuario}</dd>
              </div>
              <div className="col-md-6">
                <dt className="text-secondary">Rol</dt>
                <dd>{createdUser.rolUsuario}</dd>
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
