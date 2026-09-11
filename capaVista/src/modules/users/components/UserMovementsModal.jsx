import { useEffect, useRef, useState } from 'react'
import UserButton from './UserButton'
import { formatProfileDate } from '../../profile/utils/profileFormatters'
import styles from '../pages/UserManagementPage.module.css'

export default function UserMovementsModal({ user, api, onClose }) {
  const dialogRef = useRef(null)
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [])

  useEffect(() => {
    let active = true
    api.getMovements(user.idUsuarioAutenticacionExterna, { page })
      .then((response) => {
        if (active) setResult(response)
      })
      .catch((failure) => {
        if (active) setError(failure?.payload?.message || 'No fue posible consultar los movimientos. Intenta nuevamente.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [api, user.idUsuarioAutenticacionExterna, page, attempt])

  function loadPage(nextPage) {
    setLoading(true)
    setError('')
    setPage(nextPage)
  }

  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / (result?.perPage ?? 10)))

  return (
    <dialog
      ref={dialogRef}
      className={styles.movementsModal}
      aria-labelledby="user-movements-title"
      onCancel={(event) => { event.preventDefault(); onClose() }}
    >
      <header className={styles.modalHeader}>
        <div>
          <h2 id="user-movements-title">Movimientos de usuario</h2>
          <p className={styles.movementsUser}>{user.nombreCompleto}</p>
        </div>
        <button type="button" className={styles.modalCloseButton} aria-label="Cerrar movimientos" onClick={onClose} autoFocus>
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </header>
      <div className={styles.modalBody} aria-busy={loading}>
        {loading ? <p role="status">Cargando movimientos...</p> : error ? (
          <div role="alert">
            <p>{error}</p>
            <UserButton variant="secondary" onClick={() => { loadPage(page); setAttempt((value) => value + 1) }}>
              Reintentar
            </UserButton>
          </div>
        ) : result?.records.length === 0 ? (
          <p role="status">No existen movimientos asociados al usuario.</p>
        ) : (
          <ol className={styles.movementsList}>
            {result?.records.map((record) => (
              <li key={record.id}>
                <time dateTime={record.dateTime}>{formatProfileDate(record.dateTime)}</time>
                <p>{record.detail}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
      <footer className={styles.modalFooter}>
        {result && totalPages > 1 && (
          <nav className={styles.userActions} aria-label="Paginación de movimientos">
            <UserButton variant="secondary" disabled={loading || page <= 1} onClick={() => loadPage(page - 1)}>Anterior</UserButton>
            <span>Página {page} de {totalPages}</span>
            <UserButton variant="secondary" disabled={loading || page >= totalPages} onClick={() => loadPage(page + 1)}>Siguiente</UserButton>
          </nav>
        )}
        <UserButton variant="secondary" onClick={onClose}>Cerrar</UserButton>
      </footer>
    </dialog>
  )
}
