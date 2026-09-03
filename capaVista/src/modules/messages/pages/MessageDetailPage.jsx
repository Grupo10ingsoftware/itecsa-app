import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { APP_ROUTES } from '../../../config/routes'
import { useMessagesApi } from '../hooks/useMessagesApi'
import { formatMessageDate, notifyMessagesChanged } from '../utils/messageFormatters'
import styles from './MessageDetailPage.module.css'

export default function MessageDetailPage() {
  const { messageId } = useParams()
  const api = useMessagesApi()
  const [message, setMessage] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadMessage = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      let response = await api.getMessage(messageId)

      if (!response.leido) {
        response = await api.markAsRead(messageId)
        notifyMessagesChanged()
      }

      setMessage(response)
    } catch (requestError) {
      setError(requestError?.status === 404 ? 'El mensaje no existe o no te pertenece.' : 'No fue posible cargar el mensaje.')
    } finally {
      setIsLoading(false)
    }
  }, [api, messageId])

  useEffect(() => {
    const requestTimer = window.setTimeout(() => loadMessage(), 0)
    return () => window.clearTimeout(requestTimer)
  }, [loadMessage])

  return (
    <main className={`container-fluid ${styles.page}`}>
      <section className={styles.shell}>
        <Link className={styles.backLink} to={APP_ROUTES.MESSAGES}>
          <i className="bi bi-arrow-left" aria-hidden="true" /> Volver a la bandeja
        </Link>

        {isLoading && <div className={styles.state} role="status"><span className="spinner-border text-warning" aria-hidden="true" /> Cargando mensaje…</div>}

        {!isLoading && error && (
          <div className={styles.state} role="alert">
            <i className="bi bi-exclamation-circle" aria-hidden="true" />
            <strong>{error}</strong>
            <button onClick={loadMessage} type="button">Reintentar</button>
          </div>
        )}

        {!isLoading && message && (
          <article className={styles.messageCard}>
            <header className={styles.header}>
              <div className={styles.mailIcon}><i className="bi bi-envelope-open" aria-hidden="true" /></div>
              <div className={styles.heading}>
                <span className={styles.eyebrow}>Mensaje recibido</span>
                <h1>{message.Asunto}</h1>
                <time dateTime={message.fecha_publicacion}>{formatMessageDate(message.fecha_publicacion)}</time>
              </div>
              <span className={styles.readBadge}><i className="bi bi-check2-all" aria-hidden="true" /> Leído</span>
            </header>

            <div className={styles.content}>{message.contenido}</div>

            {message.id_pedido && (
              <aside className={styles.orderCard}>
                <span className={styles.orderIcon}><i className="bi bi-box-seam" aria-hidden="true" /></span>
                <div>
                  <small>Pedido relacionado</small>
                  <strong>Pedido #{message.id_pedido}</strong>
                  {message.pedido?.fecha_estimada_termino && <span>Entrega estimada: {formatMessageDate(message.pedido.fecha_estimada_termino, { includeTime: false })}</span>}
                </div>
              </aside>
            )}
          </article>
        )}
      </section>
    </main>
  )
}
