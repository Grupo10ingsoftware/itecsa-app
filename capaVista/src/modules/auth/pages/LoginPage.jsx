import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
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
  const { error, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const returnTo = getSafeRedirectPath(location.state, location.search)

  if (isLoading) {
    return (
      <main className={`container-fluid ${styles.loginPage}`}>
        <section className={`shadow-sm ${styles.loginPanel}`} aria-live="polite">
          <p className="mb-0 text-secondary">Cargando sesion...</p>
        </section>
      </main>
    )
  }

  if (isAuthenticated) {
    return <Navigate replace to={returnTo} />
  }

  return (
    <main className={`container-fluid ${styles.loginPage}`}>
      <section className={`shadow-sm ${styles.loginPanel}`} aria-labelledby="login-title">
        <div className="mb-4">
          <span className={styles.brandMark}>ITECSA</span>
          <h1 className="h3 mt-3 mb-2" id="login-title">
            Inicio de sesion
          </h1>
          <p className="text-secondary mb-0">
            Ingresa mediante el acceso seguro de Auth0.
          </p>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            No fue posible iniciar sesion. Intenta nuevamente.
          </div>
        )}

        <LoginForm returnTo={returnTo} />
      </section>
    </main>
  )
}
