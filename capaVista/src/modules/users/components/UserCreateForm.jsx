import { useState } from 'react'
import { OFFICIAL_ROLES } from '../../../config/roles'
import { useAuth } from '../../../hooks/useAuth'
import PasswordRules from '../../auth/components/PasswordRules'
import {
  hasValidationErrors,
  normalizeRut,
  validateUserCreateForm,
} from '../utils/userValidation'

const INITIAL_VALUES = Object.freeze({
  primerNombre: '',
  apellidoPaterno: '',
  rutUsuario: '',
  correoUsuario: '',
  rolUsuario: '',
  password: '',
  referenciaFirmaElectronica: '',
})

const INITIAL_ERRORS = Object.freeze({
  primerNombre: [],
  apellidoPaterno: [],
  rutUsuario: [],
  correoUsuario: [],
  rolUsuario: [],
  password: [],
  referenciaFirmaElectronica: [],
})

const SUCCESS_MESSAGE =
  'Usuario preparado correctamente. Los datos no se han guardado.'

const PREVIEW_FIELDS = Object.freeze([
  ['Primer nombre', 'primerNombre'],
  ['Apellido paterno', 'apellidoPaterno'],
  ['RUT', 'rutUsuario'],
  ['Correo electrónico', 'correoUsuario'],
  ['Rol', 'rolUsuario'],
  ['Estado', 'estadoUsuario'],
  ['Firma electrónica', 'referenciaFirmaElectronica'],
])

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

export default function UserCreateForm() {
  const { mockUsers } = useAuth()
  const [values, setValues] = useState(INITIAL_VALUES)
  const [fieldErrors, setFieldErrors] = useState(INITIAL_ERRORS)
  const [successMessage, setSuccessMessage] = useState('')
  const [preparedUser, setPreparedUser] = useState(null)
  const [fileInputKey, setFileInputKey] = useState(0)

  function handleFieldChange(event) {
    const { name, value } = event.target

    setValues((currentValues) => ({
      ...currentValues,
      [name]: name === 'rutUsuario' ? normalizeRut(value) : value,
    }))
    setSuccessMessage('')
    setPreparedUser(null)
  }

  function handleSignatureChange(event) {
    const fileName = event.target.files?.[0]?.name ?? ''

    // Solo se conserva el nombre como referencia documental visual; no se lee binario ni se sube archivo.
    setValues((currentValues) => ({
      ...currentValues,
      referenciaFirmaElectronica: fileName,
    }))
    setSuccessMessage('')
    setPreparedUser(null)
  }

  function handleSubmit(event) {
    event.preventDefault()

    // Validaciones preventivas frontend: backend/Auth0 debe validar y crear usuarios reales en la integracion futura.
    const nextErrors = validateUserCreateForm(values, mockUsers)
    setFieldErrors(nextErrors)
    setSuccessMessage('')
    setPreparedUser(null)

    if (hasValidationErrors(nextErrors)) {
      return
    }

    const nextPreparedUser = {
      primerNombre: values.primerNombre.trim(),
      apellidoPaterno: values.apellidoPaterno.trim(),
      rutUsuario: normalizeRut(values.rutUsuario),
      correoUsuario: values.correoUsuario.trim().toLowerCase(),
      rolUsuario: values.rolUsuario,
      estadoUsuario: 'vinculado',
      referenciaFirmaElectronica: values.referenciaFirmaElectronica,
      idUsuarioAutenticacionExterna: 'pendiente-integracion-auth0',
    }

    // La creacion real queda pendiente de backend/Auth0; no se muta MOCK_USERS ni se persiste informacion.
    setPreparedUser(nextPreparedUser)
    setSuccessMessage(SUCCESS_MESSAGE)
    setValues(INITIAL_VALUES)
    setFileInputKey((currentKey) => currentKey + 1)
  }

  return (
    <form className="row g-3" noValidate onSubmit={handleSubmit}>
      {successMessage && (
        <div className="col-12">
          <div className="alert alert-success mb-0" role="status">
            {successMessage}
          </div>
        </div>
      )}

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
          aria-describedby="user-rut-help user-rut-errors"
          aria-invalid={fieldErrors.rutUsuario.length > 0}
          className={`form-control ${fieldErrors.rutUsuario.length > 0 ? 'is-invalid' : ''}`}
          id="user-rut"
          name="rutUsuario"
          onChange={handleFieldChange}
          placeholder="12.345.678-K"
          type="text"
          value={values.rutUsuario}
        />
        <div className="form-text" id="user-rut-help">
          Usa el formato 12.345.678-9 o 12.345.678-K.
        </div>
        <FieldErrors errors={fieldErrors.rutUsuario} id="user-rut-errors" />
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
          type="email"
          value={values.correoUsuario}
        />
        <FieldErrors errors={fieldErrors.correoUsuario} id="user-email-errors" />
      </div>

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
          Firma electrónica
        </label>

        <div
          className={`signatureFilePicker ${
            fieldErrors.referenciaFirmaElectronica.length > 0 ? 'is-invalid' : ''
          }`}
        >
          <input
            accept=".xml,.cms,.pdf"
            aria-describedby="user-signature-help user-signature-errors"
            aria-invalid={fieldErrors.referenciaFirmaElectronica.length > 0}
            className="signatureFileInput"
            id="user-signature"
            key={fileInputKey}
            name="referenciaFirmaElectronica"
            onChange={handleSignatureChange}
            type="file"
          />

          <label className="signatureFileButton" htmlFor="user-signature">
            <i className="bi bi-upload me-2" />
            Elegir archivo
          </label>

          <span className="signatureFileName">
            {values.referenciaFirmaElectronica || 'No se eligió ningún archivo'}
          </span>
        </div>

        <div className="form-text" id="user-signature-help">
          Formatos permitidos: XML, CMS o PDF.
        </div>

        <FieldErrors
          errors={fieldErrors.referenciaFirmaElectronica}
          id="user-signature-errors"
        />
      </div>

      <div className="col-12">
        <label className="form-label" htmlFor="user-password">
          Contraseña
        </label>
        <input
          aria-describedby="user-password-rules user-password-errors"
          aria-invalid={fieldErrors.password.length > 0}
          className={`form-control ${fieldErrors.password.length > 0 ? 'is-invalid' : ''}`}
          id="user-password"
          name="password"
          onChange={handleFieldChange}
          type="password"
          value={values.password}
        />
        <div id="user-password-rules">
          <PasswordRules password={values.password} />
        </div>
        <p className="form-text mb-0">
          Debe cumplir todas las reglas indicadas.
        </p>
        <FieldErrors errors={fieldErrors.password} id="user-password-errors" />
      </div>

      <div className="col-12">
        <button className="btn btn-primary" type="submit">
          Preparar usuario
        </button>
      </div>

      {preparedUser && (
        <div className="col-12">
          <div className="border rounded p-3 bg-light">
            <h2 className="h6 mb-3">Resumen del usuario</h2>
            <dl className="row mb-0 small">
              {PREVIEW_FIELDS.map(([label, field]) => (
                <div className="col-md-6" key={field}>
                  <dt className="text-secondary">{label}</dt>
                  <dd>{preparedUser[field]}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </form>
  )
}
