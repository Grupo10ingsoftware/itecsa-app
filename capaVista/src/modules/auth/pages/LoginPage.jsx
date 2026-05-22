import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import DevLoginButton from '../components/DevLoginButton'
import LoginForm from '../components/LoginForm'
import styles from './LoginPage.module.css'

function getSafeRedirectPath(state, search) {
  const searchParams = new URLSearchParams(search)
  const candidatePath = state?.fromPath ?? searchParams.get('from') ?? state?.from?.pathname

  if (
    typeof candidatePath === 'string' &&
    candidatePath.startsWith('/') &&
    !candidatePath.startsWith('//')
  ) {
    return candidatePath
  }

  return '/kanban'
}

export default function LoginPage() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const [recoveryMessage, setRecoveryMessage] = useState('')

  if (isAuthenticated) {
    // Redireccion con sesion simulada: evita volver al login mientras el usuario visual esta activo.
    return <Navigate replace to={getSafeRedirectPath(location.state, location.search)} />
  }

  function handleForgotPassword() {
    // Preparacion visual para RF14 / UR 1.15: no envia correos, no genera tokens y no llama backend/Auth0.
    setRecoveryMessage('La recuperación de contraseña estará disponible próximamente.')
  }

  return (
    <main className={`container-fluid ${styles.loginPage}`}>
      <section className={`shadow-sm ${styles.loginPanel}`} aria-labelledby="login-title">
        <div className="mb-4">
          <span className={styles.brandMark}>ITECSA</span>
          <h1 className="h3 mt-3 mb-2" id="login-title">
            Inicio de sesión
          </h1>
          <p className="text-secondary mb-0">
            Ingresa con tu correo y contraseña.
          </p>
        </div>

        {recoveryMessage && (
          <div className="alert alert-info" role="status">
            {recoveryMessage}
          </div>
        )}

        <LoginForm onLoginError={() => setRecoveryMessage('')} />

        <div className="text-center mt-3">
          <button className="btn btn-link p-0" onClick={handleForgotPassword} type="button">
            Olvidé mi contraseña
          </button>
        </div>
      </section>

      <div className={styles.devLoginPanel}>
        <DevLoginButton />
      </div>
    </main>
  )
}
