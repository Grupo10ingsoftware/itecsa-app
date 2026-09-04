import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_ROUTES } from '../../../config/routes'
import { useMessagesApi } from '../hooks/useMessagesApi'
import { formatMessageDate, messagePreview, notifyMessagesChanged } from '../utils/messageFormatters'
import styles from './NotificationBell.module.css'

const REFRESH_INTERVAL_MS = 60_000

export default function NotificationBell() {
  const api = useMessagesApi()
  const navigate = useNavigate()
  const rootRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadNotifications = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setIsLoading(true)

    try {
      const result = await api.getNotifications(10)
      setNotifications(result.notifications ?? [])
      setUnreadCount(result.unreadCount ?? 0)
      setError('')
    } catch {
      setError('No fue posible cargar las notificaciones.')
    } finally {
      if (!quiet) setIsLoading(false)
    }
  }, [api])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => loadNotifications(), 0)
    const interval = window.setInterval(() => loadNotifications({ quiet: true }), REFRESH_INTERVAL_MS)
    const handleMessagesChanged = () => loadNotifications({ quiet: true })
    window.addEventListener('messages:changed', handleMessagesChanged)

    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
      window.removeEventListener('messages:changed', handleMessagesChanged)
    }
  }, [loadNotifications])

  useEffect(() => {
    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  async function handleOpenMessage(message) {
    try {
      await api.markAsRead(message.id_mensaje)
      notifyMessagesChanged()
      setIsOpen(false)
      navigate(APP_ROUTES.MESSAGE_DETAIL.replace(':messageId', message.id_mensaje))
    } catch {
      setError('No fue posible abrir la notificación.')
    }
  }

  async function handleHide(event, messageId) {
    event.stopPropagation()

    try {
      await api.hideNotification(messageId)
      setNotifications((current) => current.filter((item) => item.id_mensaje !== messageId))
      setUnreadCount((current) => Math.max(0, current - 1))
      notifyMessagesChanged()
    } catch {
      setError('No fue posible limpiar la notificación.')
    }
  }

  async function handleClearAll() {
    try {
      await api.clearNotifications()
      setNotifications([])
      setUnreadCount(0)
      setError('')
      notifyMessagesChanged()
    } catch {
      setError('No fue posible limpiar las notificaciones.')
    }
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Notificaciones${unreadCount ? `, ${unreadCount} sin leer` : ''}`}
        className={styles.bellButton}
        onClick={() => {
          setIsOpen((current) => !current)
          if (!isOpen) loadNotifications()
        }}
        type="button"
      >
        <i className="bi bi-bell" aria-hidden="true" />
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {isOpen && (
        <section aria-label="Notificaciones nuevas" className={styles.panel} role="dialog">
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Actividad reciente</p>
              <h2>Notificaciones</h2>
            </div>
            <button className={styles.clearButton} disabled={notifications.length === 0} onClick={handleClearAll} type="button">
              <i className="bi bi-trash3" aria-hidden="true" />
              Limpiar
            </button>
          </header>

          <div className={styles.body}>
            {isLoading && <div className={styles.state}>Cargando notificaciones…</div>}
            {!isLoading && error && <div className={styles.error} role="alert">{error}</div>}
            {!isLoading && !error && notifications.length === 0 && (
              <div className={styles.emptyState}>
                <i className="bi bi-bell-slash" aria-hidden="true" />
                <strong>Todo al día</strong>
                <span>No tienes notificaciones nuevas.</span>
              </div>
            )}
            {!isLoading && notifications.map((notification) => (
              <article className={styles.notification} key={notification.id_mensaje}>
                <button className={styles.notificationMain} onClick={() => handleOpenMessage(notification)} type="button">
                  <span className={styles.unreadDot} aria-label="Sin leer" />
                  <span className={styles.notificationCopy}>
                    <strong>{notification.Asunto}</strong>
                    <span>{messagePreview(notification.contenido, 82)}</span>
                    <small>{formatMessageDate(notification.fecha_publicacion)}</small>
                  </span>
                </button>
                <button aria-label={`Limpiar ${notification.Asunto}`} className={styles.itemTrash} onClick={(event) => handleHide(event, notification.id_mensaje)} type="button">
                  <i className="bi bi-trash3" aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>

          <button className={styles.viewAll} onClick={() => { setIsOpen(false); navigate(APP_ROUTES.MESSAGES) }} type="button">
            Ver bandeja de entrada
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </button>
        </section>
      )}
    </div>
  )
}
