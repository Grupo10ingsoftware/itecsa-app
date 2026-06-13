import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import styles from './LoginPage.module.css'

const LOGIN_REDIRECT_TIMEOUT_MS = 10000
const BLOCKED_ACCOUNT_MESSAGE = 'Tu cuenta se encuentra desactivada. Comunicate con el administrador.'
const GENERIC_LOGIN_ERROR_MESSAGE = 'No fue posible iniciar sesion. Intenta nuevamente.'

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

function getErrorText(error) {
  return [
    error?.error,
    error?.error_description,
    error?.message,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function isBlockedAccountError(error) {
  const errorText = getErrorText(error)

  return (
    error?.error === 'unauthorized' ||
    errorText.includes('blocked') ||
    errorText.includes('user is blocked')
  )
}

function getLoginErrorMessage(error) {
  return isBlockedAccountError(error) ? BLOCKED_ACCOUNT_MESSAGE : GENERIC_LOGIN_ERROR_MESSAGE
}

export default function LoginPage() {
  const { auth0User, error, isAuthenticated, isLoading, loginWithRedirect } = useAuth()
  const [shouldStartLogin, setShouldStartLogin] = useState(false)
  const location = useLocation()
  const returnTo = getSafeRedirectPath(location.state, location.search)

  useEffect(() => {
    if (error || isAuthenticated || auth0User || shouldStartLogin) {
      return undefined
    }

    const delay = isLoading ? LOGIN_REDIRECT_TIMEOUT_MS : 0
    const timeoutId = window.setTimeout(() => {
      setShouldStartLogin(true)
    }, delay)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [auth0User, error, isAuthenticated, isLoading, shouldStartLogin])

  useEffect(() => {
    if (error || !shouldStartLogin || isAuthenticated) {
      return
    }

    loginWithRedirect({
      appState: {
        returnTo,
      },
    })
  }, [error, isAuthenticated, loginWithRedirect, returnTo, shouldStartLogin])

  const handleLoginRetry = () => {
    loginWithRedirect({
      appState: {
        returnTo,
      },
    })
  }

  if (isAuthenticated) {
    return <Navigate replace to={returnTo} />
  }

  if (error) {
    return (
      <main className={`container-fluid ${styles.loginPage}`}>
        <section className={styles.loginPanel} aria-labelledby="login-title">
          <div className={styles.loginHero}>
            <span className={styles.brandMark}>ITECSA</span>
            <h1 className="h3 mt-3 mb-2" id="login-title">
              Inicio de sesion
            </h1>
            <p className="text-secondary mb-0">
              Ingresa mediante el acceso seguro de Auth0.
            </p>
          </div>

          <div className={styles.loginBody}>
            <div className="alert alert-danger" role="alert">
              {getLoginErrorMessage(error)}
            </div>
            <button className="btn btn-warning w-100" type="button" onClick={handleLoginRetry}>
              Volver a intentar
            </button>
          </div>
        </section>
      </main>
    )
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
      <section className={styles.loginPanel} aria-labelledby="login-title">
        <div className={styles.loginHero}>
          <span className={styles.brandMark}>ITECSA</span>
          <h1 className="h3 mt-3 mb-2" id="login-title">
            Inicio de sesion
          </h1>
          <p className="text-secondary mb-0">
            Ingresa mediante el acceso seguro de Auth0.
          </p>
        </div>

        <div className={styles.loginBody}>
          <button className="btn btn-warning w-100" type="button" onClick={handleLoginRetry}>
            Iniciar sesion
          </button>
        </div>
      </section>
    </main>
  )
}
