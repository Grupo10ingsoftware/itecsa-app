import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import styles from './AccessDeniedPage.module.css'

export default function AccessDeniedPage() {
  const { logout, refreshSession } = useAuth()
  const navigate = useNavigate()
  const automaticRetryStarted = useRef(false)
  const [isRetrying, setIsRetrying] = useState(true)
  const [retryFailed, setRetryFailed] = useState(false)

  const retryAccess = useCallback(async () => {
    setIsRetrying(true)
    setRetryFailed(false)

    try {
      await refreshSession()
      navigate('/kanban', { replace: true })
    } catch {
      setRetryFailed(true)
      setIsRetrying(false)
    }
  }, [navigate, refreshSession])

  useEffect(() => {
    if (automaticRetryStarted.current) return
    automaticRetryStarted.current = true
    retryAccess()
  }, [retryAccess])

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <header className={styles.cardHeader}>
          <span className={styles.icon}>
            <i aria-hidden="true" className="bi bi-shield-lock" />
          </span>
          <h1 className={styles.title}>Acceso denegado</h1>
        </header>
        <div className={styles.body}>
          <p className={styles.description} aria-live="polite">
            {isRetrying
              ? 'Comprobando nuevamente tu acceso…'
              : retryFailed
                ? 'No fue posible validar esta sesión. Puedes reintentar o iniciar una sesión nueva.'
                : 'No tienes permisos para acceder a este recurso.'}
          </p>
          <div className={styles.actions}>
            <button className={styles.button} disabled={isRetrying} onClick={retryAccess} type="button">
              <i className="bi bi-arrow-clockwise" />
              {isRetrying ? 'Verificando…' : 'Reintentar acceso'}
            </button>
            <button className={styles.secondaryButton} onClick={logout} type="button">
              Cerrar sesión
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
