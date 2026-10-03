import { useEffect, useRef, useState } from 'react'
import UserMovementsTable from './UserMovementsTable'
import styles from './UserMovementsModal.module.css'

export default function UserMovementsModal({ user, api, onClose, title = 'Movimientos de usuario', description }) {
  const dialogRef = useRef(null)
  const [query, setQuery] = useState({ page: 1, perPage: 10, search: '' })
  const [search, setSearch] = useState('')
  const [outcome, setOutcome] = useState(null)
  const subject = user.idUsuarioAutenticacionExterna
  const current = outcome?.query === query && outcome?.subject === subject && outcome?.api === api
  const result = current ? outcome.data : null
  const error = current ? outcome.error : ''
  const loading = !current
  const total = result?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / query.perPage))
  const pageNumbers = [...new Set([1, query.page - 1, query.page, query.page + 1, totalPages])]
    .filter(page => page >= 1 && page <= totalPages).sort((a, b) => a - b)

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [])

  useEffect(() => {
    let active = true
    api.getMovements(subject, query)
      .then(data => { if (active) setOutcome({ query, subject, api, data }) })
      .catch(failure => {
        if (active) setOutcome({ query, subject, api,
          error: failure?.payload?.message || 'No fue posible consultar los movimientos. Intenta nuevamente.' })
      })
    return () => { active = false }
  }, [api, subject, query])

  return <dialog ref={dialogRef} className={styles.modal} aria-labelledby="user-movements-title"
    aria-describedby="user-movements-description" onCancel={event => { event.preventDefault(); onClose() }}>
    <header className={styles.header}>
      <span className={styles.headerIcon}><i className="bi bi-clock-history" aria-hidden="true" /></span>
      <div><h2 id="user-movements-title">{title}</h2>
        <p id="user-movements-description">{description ?? `Consulta los movimientos de ${user.nombreCompleto}.`}</p></div>
      <button type="button" className={styles.close} aria-label="Cerrar historial" onClick={onClose} autoFocus>
        <i className="bi bi-x-lg" aria-hidden="true" />
      </button>
    </header>
    <div className={styles.body}>
      <form className={styles.filters} onSubmit={event => { event.preventDefault(); setQuery({ ...query, page: 1, search: search.trim() }) }}>
        <label className={styles.search}><i className="bi bi-search" aria-hidden="true" /><span className="visually-hidden">Buscar por identificador o detalle</span>
          <input type="search" value={search} maxLength={120} placeholder="Buscar por identificador o detalle…"
            onChange={event => setSearch(event.target.value)} /></label>
        <button className={styles.button} type="submit">Buscar</button>
        <button className={styles.button} type="button" onClick={() => { setSearch(''); setQuery({ ...query, page: 1, search: '' }) }}>
          <i className="bi bi-arrow-clockwise" aria-hidden="true" /> Limpiar filtros
        </button>
      </form>
      <div className={styles.scroll} aria-busy={loading}>
        {loading ? <p className={styles.state} role="status">Cargando movimientos…</p> : error ? <div className={styles.state} role="alert">
          <p>{error}</p><button className={styles.button} type="button" onClick={() => setQuery({ ...query })}>Reintentar</button>
        </div> : !result?.records?.length ? <p className={styles.state} role="status">No existen movimientos para esta consulta.</p>
          : <UserMovementsTable records={result.records} includeTime />}
      </div>
    </div>
    <footer className={styles.footer}>
      <span role="status">{loading ? 'Consultando historial…' : error ? 'Consulta pendiente' : total
        ? `Mostrando ${(query.page - 1) * query.perPage + 1}–${Math.min(query.page * query.perPage, total)} de ${total} registros`
        : '0 registros'}</span>
      <nav className={styles.pagination} aria-label="Paginación de movimientos">
        <button className={styles.button} type="button" disabled={loading || Boolean(error) || query.page <= 1}
          onClick={() => setQuery({ ...query, page: query.page - 1 })}>Anterior</button>
        {pageNumbers.map((page, index) => <span className={styles.pageNumber} key={page}>
          {index > 0 && page - pageNumbers[index - 1] > 1 && <span aria-hidden="true">…</span>}
          <button className={`${styles.button} ${page === query.page ? styles.active : ''}`} type="button"
            aria-label={`Página ${page}`} aria-current={page === query.page ? 'page' : undefined}
            disabled={loading || Boolean(error)} onClick={() => setQuery({ ...query, page })}>{page}</button>
        </span>)}
        <button className={styles.button} type="button" disabled={loading || Boolean(error) || query.page >= totalPages}
          onClick={() => setQuery({ ...query, page: query.page + 1 })}>Siguiente</button>
      </nav>
    </footer>
  </dialog>
}
