import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import styles from './LoginPage.module.css'

const LOGIN_REDIRECT_TIMEOUT_MS = 10000

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
  const { auth0User, error, isAuthenticated, isLoading, loginWithRedirect } = useAuth()
  const [shouldStartLogin, setShouldStartLogin] = useState(false)
  const location = useLocation()
  const returnTo = getSafeRedirectPath(location.state, location.search)

  useEffect(() => {
    if (isAuthenticated || auth0User || shouldStartLogin) {
      return undefined
    }

    const delay = isLoading ? LOGIN_REDIRECT_TIMEOUT_MS : 0
    const timeoutId = window.setTimeout(() => {
      setShouldStartLogin(true)
    }, delay)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [auth0User, isAuthenticated, isLoading, shouldStartLogin])

  useEffect(() => {
    if (!shouldStartLogin || isAuthenticated) {
      return
    }

    loginWithRedirect({
      appState: {
        returnTo,
      },
    })
  }, [isAuthenticated, loginWithRedirect, returnTo, shouldStartLogin])

  if (isAuthenticated) {
    return <Navigate replace to={returnTo} />
  }

  if (isLoading || auth0User || shouldStartLogin) {
    return (
      <main className={`container-fluid ${styles.loginPage}`}>
        <section className={`shadow-sm ${styles.loginPanel}`} aria-live="polite">
          <p className="mb-0 text-secondary">Cargando sesion...</p>
        </section>
      </main>
    )
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
      </section>
    </main>
  )
}
