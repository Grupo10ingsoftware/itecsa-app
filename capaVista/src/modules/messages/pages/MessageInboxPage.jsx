import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_ROUTES } from '../../../config/routes'
import { API_ERROR_CODES } from '../../../services/api/apiClient'
import MessageFilters from '../components/MessageFilters'
import MessageList from '../components/MessageList'
import { useMessagesApi } from '../hooks/useMessagesApi'
import { notifyMessagesChanged } from '../utils/messageFormatters'
import styles from './MessageInboxPage.module.css'

const DEFAULT_FILTERS = Object.freeze({ status: 'all', sort: 'latest', from: '', to: '' })
const PAGE_SIZE = 12

function errorText(error) {
  if (error?.code === API_ERROR_CODES.NETWORK_ERROR) return 'No fue posible conectar con el servidor.'
  if (error?.status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.'
  return error?.payload?.message ?? 'No fue posible cargar la bandeja de entrada.'
}

export default function MessageInboxPage() {
  const api = useMessagesApi()
  const navigate = useNavigate()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ messages: [], total: 0, totalPages: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadInbox = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await api.getInbox({ ...filters, page, perPage: PAGE_SIZE })
      setResult({
        messages: response.messages ?? [],
        total: response.total ?? 0,
        totalPages: response.totalPages ?? 0,
      })
    } catch (requestError) {
      setResult({ messages: [], total: 0, totalPages: 0 })
      setError(errorText(requestError))
    } finally {
      setIsLoading(false)
    }
  }, [api, filters, page])

  useEffect(() => {
    const requestTimer = window.setTimeout(() => loadInbox(), 0)
    return () => window.clearTimeout(requestTimer)
  }, [loadInbox])

  function handleFiltersChange(nextFilters) {
    setFilters(nextFilters)
    setPage(1)
  }

  async function handleOpen(message) {
    if (!message.leido) {
      try {
        await api.markAsRead(message.id_mensaje)
        notifyMessagesChanged()
      } catch {
        // El detalle volverá a intentar el marcado; la navegación no se bloquea.
      }
    }

    navigate(APP_ROUTES.MESSAGE_DETAIL.replace(':messageId', message.id_mensaje))
  }

  return (
    <main className={`container-fluid ${styles.page}`} aria-labelledby="message-inbox-title">
      <section className={styles.shell}>
        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Centro de comunicaciones</span>
            <h1 id="message-inbox-title">Bandeja de entrada</h1>
            <p>Revisa novedades, cambios y comunicaciones vinculadas a tus pedidos.</p>
          </div>
          <div className={styles.totalCard} aria-label={`${result.total} mensajes encontrados`}>
            <i className="bi bi-envelope-paper" aria-hidden="true" />
            <span><strong>{result.total}</strong> mensajes</span>
          </div>
        </header>

        <MessageFilters
          filters={filters}
          onChange={handleFiltersChange}
          onClear={() => handleFiltersChange({ ...DEFAULT_FILTERS })}
        />

        {error && (
          <div className={styles.error} role="alert">
            <i className="bi bi-exclamation-triangle" aria-hidden="true" />
            <span>{error}</span>
            <button onClick={loadInbox} type="button">Reintentar</button>
          </div>
        )}

        {!error && <MessageList isLoading={isLoading} messages={result.messages} onOpen={handleOpen} />}

        {!isLoading && !error && result.totalPages > 1 && (
          <nav aria-label="Paginación de mensajes" className={styles.pagination}>
            <button disabled={page === 1} onClick={() => setPage((current) => current - 1)} type="button">
              <i className="bi bi-chevron-left" aria-hidden="true" /> Anterior
            </button>
            <span>Página <strong>{page}</strong> de {result.totalPages}</span>
            <button disabled={page >= result.totalPages} onClick={() => setPage((current) => current + 1)} type="button">
              Siguiente <i className="bi bi-chevron-right" aria-hidden="true" />
            </button>
          </nav>
        )}
      </section>
    </main>
  )
}
