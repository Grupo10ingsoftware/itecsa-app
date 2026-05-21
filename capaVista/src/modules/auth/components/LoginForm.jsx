import { useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { findMockLoginCredential } from '../mocks/authCredentials'

const ACCOUNT_DISABLED_MESSAGE = 'Cuenta desactivada'
const INVALID_CREDENTIALS_MESSAGE = 'Correo o contraseña incorrectos'

function validateEmail(email) {
  const trimmedEmail = email.trim()
  const errors = []
  const atMatches = trimmedEmail.match(/@/g) ?? []
  const [, domain = ''] = trimmedEmail.split('@')

  if (!trimmedEmail) {
    errors.push('El correo es obligatorio.')
  }

  if (/\s/.test(email)) {
    errors.push('El correo no debe contener espacios.')
  }

  if (atMatches.length > 1) {
    errors.push('El correo no debe contener multiples arrobas.')
  }

  if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.push('Ingresa un correo con formato texto@dominio.extension.')
  }

  if (trimmedEmail && atMatches.length === 1 && !domain.includes('.')) {
    errors.push('El dominio del correo debe incluir al menos un punto.')
  }

  return errors
}

function validatePassword(password) {
  if (!password) {
    return ['La contrasena es obligatoria.']
  }

  return []
}

export default function LoginForm({ onLoginError }) {
  const { loginAsMockUser, mockUsers } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({
    email: [],
    password: [],
  })
  const [submitMessage, setSubmitMessage] = useState('')

  function handleSubmit(event) {
    event.preventDefault()

    // Validaciones preventivas de frontend: backend/Auth0 debe validar credenciales reales en la integracion futura.
    const nextErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    }

    setFieldErrors(nextErrors)
    setSubmitMessage('')
    onLoginError('')

    if (nextErrors.email.length > 0 || nextErrors.password.length > 0) {
      return
    }

    const credential = findMockLoginCredential(email)

    if (!credential || credential.password !== password) {
      setSubmitMessage(INVALID_CREDENTIALS_MESSAGE)
      onLoginError(INVALID_CREDENTIALS_MESSAGE)
      return
    }

    const user = mockUsers.find((candidate) => {
      return candidate.idUsuario === credential.idUsuario
    })

    if (user?.estadoUsuario === 'desvinculado') {
      setSubmitMessage(ACCOUNT_DISABLED_MESSAGE)
      onLoginError(ACCOUNT_DISABLED_MESSAGE)
      return
    }

    loginAsMockUser(credential.idUsuario)
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      {submitMessage && (
        <div className="alert alert-danger" role="alert">
          {submitMessage}
        </div>
      )}

      <div className="mb-3">
        <label className="form-label" htmlFor="login-email">
          Correo electronico
        </label>
        <input
          aria-describedby="login-email-errors"
          aria-invalid={fieldErrors.email.length > 0}
          className={`form-control ${fieldErrors.email.length > 0 ? 'is-invalid' : ''}`}
          id="login-email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          value={email}
        />
        {fieldErrors.email.length > 0 && (
          <div className="invalid-feedback d-block" id="login-email-errors">
            {fieldErrors.email.map((error) => (
              <p className="mb-0" key={error}>
                {error}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="login-password">
          Contrasena
        </label>
        <input
          aria-describedby="login-password-errors"
          aria-invalid={fieldErrors.password.length > 0}
          className={`form-control ${fieldErrors.password.length > 0 ? 'is-invalid' : ''}`}
          id="login-password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
        {fieldErrors.password.length > 0 && (
          <div className="invalid-feedback d-block" id="login-password-errors">
            {fieldErrors.password.map((error) => (
              <p className="mb-0" key={error}>
                {error}
              </p>
            ))}
          </div>
        )}
      </div>

      <button className="btn btn-primary w-100" type="submit">
        Iniciar sesion
      </button>
    </form>
  )
}
