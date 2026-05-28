import { Link } from 'react-router-dom'
import styles from './AccessDeniedPage.module.css'

export default function AccessDeniedPage() {
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
          <p className={styles.description}>No tienes permisos para acceder a este recurso.</p>
          <Link className={styles.button} to="/kanban">
            <i className="bi bi-arrow-left" />
            Volver al área principal
          </Link>
        </div>
      </section>
    </main>
  )
}
