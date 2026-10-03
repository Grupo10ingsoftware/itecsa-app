export default function ModuleLoadingState() {
  return <div className="d-flex align-items-center justify-content-center py-5" role="status">
    <span className="spinner-border text-warning" aria-hidden="true" />
    <span className="visually-hidden">Cargando módulo…</span>
  </div>
}
