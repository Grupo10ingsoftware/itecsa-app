import UserCreateForm from '../components/UserCreateForm'
import styles from './UserCreatePage.module.css'

export default function UserCreatePage() {
  return (
    <main className={`container-fluid ${styles.page}`} aria-labelledby="user-create-title">
      <section className={styles.dashboardShell}>
        <header className={styles.hero}>
          <span className={styles.sectionLabel}>Administracion</span>
          <h1 className={styles.pageTitle} id="user-create-title">
            Crear usuario
          </h1>
          <p className={styles.pageSubtitle}>
            Completa los datos de acceso para crear una nueva cuenta Auth0.
          </p>
        </header>

        <div className={styles.content}>
          <div className={`alert alert-info ${styles.noteAlert}`} role="note">
            <i className="bi bi-info-circle me-2" aria-hidden="true" />
            La contrasena sera gestionada por Auth0 mediante correo de establecimiento.
          </div>

          <div className={styles.formCard}>
            <UserCreateForm />
          </div>
        </div>
      </section>
    </main>
  )
}
