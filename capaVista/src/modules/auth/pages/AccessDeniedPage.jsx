import { Link } from 'react-router-dom'

export default function AccessDeniedPage() {
  return (
    <main className="container py-5">
      <section className="mx-auto text-center" style={{ maxWidth: '36rem' }}>
        <i aria-hidden="true" className="bi bi-shield-lock fs-1 text-danger" />
        <h1 className="h3 mt-3 mb-2">Acceso denegado</h1>
        <p className="text-secondary mb-4">No tienes permisos para acceder a este recurso.</p>
        <Link className="btn btn-primary" to="/kanban">
          Volver al area principal
        </Link>
      </section>
    </main>
  )
}
