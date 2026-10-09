import { Component } from 'react'
import styles from '../styles/Kanban.module.css'

export default class KanbanDetailBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className={styles.offcanvasLayer} role="presentation">
          <aside aria-label="Error del detalle" className={styles.offcanvasPanel} role="dialog">
            <header className={styles.offcanvasHeader}>
              <h2>No fue posible mostrar el detalle</h2>
              <button aria-label="Cerrar detalle" className={styles.offcanvasCloseButton} onClick={this.props.onClose} type="button">
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </header>
            <div className={styles.offcanvasBody}>El tablero sigue disponible. Cierra este panel e intenta nuevamente.</div>
          </aside>
        </div>
      )
    }

    return this.props.children
  }
}
