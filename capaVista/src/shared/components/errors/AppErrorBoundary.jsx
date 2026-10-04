import { Component } from 'react'

export default class AppErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // Se omiten mensaje, props y datos del pedido para no registrar información de negocio.
    console.error('UI_RENDER_FAILURE', {
      errorName: error?.name ?? 'Error',
      componentStack: info?.componentStack ?? '',
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="container py-5" role="alert" aria-live="assertive">
          <div className="alert alert-danger">
            <h1 className="h4">No fue posible mostrar esta pantalla</h1>
            <p className="mb-3">
              La vista encontró un error inesperado. Tus datos no fueron modificados.
            </p>
            <button className="btn btn-outline-danger" type="button" onClick={() => window.location.reload()}>
              Recargar la aplicación
            </button>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}
