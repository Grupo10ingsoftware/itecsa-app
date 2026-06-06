import { OFFICIAL_ROLES } from '../../../config/roles'
import { useUserCreateForm } from '../hooks/useUserCreateForm'

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

export default function UserCreateForm({ onCreated } = {}) {
  const {
    canRequestPasswordSetupEmail,
    createdUser,
    fieldErrors,
    handleFieldChange,
    handlePasswordSetupEmailRequest,
    handleSubmit,
    isRequestingPasswordEmail,
    isSessionInvalid,
    isSubmitting,
    loginWithRedirect,
    message,
    values,
  } = useUserCreateForm({ onCreated })

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
                Iniciar sesión
              </button>
            )}
          </div>
        </div>
      )}

      <div className="col-12">
        <section className="userCreateSection" aria-labelledby="user-create-information-section">
          <div className="userCreateSectionHeader">
            <i className="bi bi-person" aria-hidden="true" />
            <h2 className="userCreateSectionTitle" id="user-create-information-section">
              Información del usuario
            </h2>
          </div>

          <fieldset className="border-0 m-0 p-0" disabled={isSubmitting}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label" htmlFor="user-first-name">
                  Nombre
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
                  placeholder="Ingresa el nombre"
                  type="text"
                  value={values.primerNombre}
                />
                <FieldErrors errors={fieldErrors.primerNombre} id="user-first-name-errors" />
              </div>

              <div className="col-md-6">
                <label className="form-label" htmlFor="user-last-name">
                  Apellido
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
                  placeholder="Ingresa el apellido"
                  type="text"
                  value={values.apellidoPaterno}
                />
                <FieldErrors errors={fieldErrors.apellidoPaterno} id="user-last-name-errors" />
              </div>

              <div className="col-md-6">
                <label className="form-label" htmlFor="user-email">
                  Correo electrónico
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
                  placeholder="usuario@correo.com"
                  type="email"
                  value={values.correoUsuario}
                />
                <FieldErrors errors={fieldErrors.correoUsuario} id="user-email-errors" />
              </div>

              <div className="col-md-6">
                <label className="form-label" htmlFor="user-rut">
                  RUT
                </label>
                <input
                  aria-describedby="user-rut-errors"
                  aria-invalid={fieldErrors.rutUsuario.length > 0}
                  className={`form-control ${
                    fieldErrors.rutUsuario.length > 0 ? 'is-invalid' : ''
                  }`}
                  id="user-rut"
                  maxLength={12}
                  name="rutUsuario"
                  onChange={handleFieldChange}
                  placeholder="12.345.678-9"
                  type="text"
                  value={values.rutUsuario}
                />
                <FieldErrors errors={fieldErrors.rutUsuario} id="user-rut-errors" />
              </div>

              <div className="col-12">
                <label className="form-label" htmlFor="user-role">
                  Rol
                </label>
                <select
                  aria-describedby="user-role-errors"
                  aria-invalid={fieldErrors.rolUsuario.length > 0}
                  className={`form-select ${
                    fieldErrors.rolUsuario.length > 0 ? 'is-invalid' : ''
                  }`}
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
            </div>
          </fieldset>
        </section>
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

      {createdUser && (
        <div className="col-12">
          <div className="border rounded p-3 bg-light">
            <h2 className="h6 mb-3">Resultado de creación</h2>
            <dl className="row mb-0 small">
              <div className="col-md-4">
                <dt className="text-secondary">Correo electrónico</dt>
                <dd>{createdUser.correoUsuario}</dd>
              </div>
              <div className="col-md-4">
                <dt className="text-secondary">RUT</dt>
                <dd>{createdUser.rut}</dd>
              </div>
              <div className="col-md-4">
                <dt className="text-secondary">Rol</dt>
                <dd>{createdUser.rolUsuario}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </form>
  )
}
