import UserCreateForm from '../components/UserCreateForm'
import styles from './UserCreatePage.module.css'

export default function UserCreatePage() {
  return (
    <main className={`container-fluid ${styles.page}`} aria-labelledby="user-create-title">
      <section className={styles.dashboardShell}>
        <header className={styles.hero}>
          <span className={styles.sectionLabel}>Administración</span>
          <h1 className={styles.pageTitle} id="user-create-title">
            Crear usuario
          </h1>
          <p className={styles.pageSubtitle}>
            Completa los datos obligatorios para preparar una nueva cuenta.
          </p>
        </header>

        <div className={styles.content}>
          <div className={`alert alert-warning ${styles.noteAlert}`} role="note">
            <i className="bi bi-exclamation-triangle me-2" />
            Esta acción solo muestra una confirmación en pantalla; los datos no se guardan.
          </div>

          <div className={styles.formCard}>
            <UserCreateForm />
          </div>
        </div>
      </section>
    </main>
  )
}
