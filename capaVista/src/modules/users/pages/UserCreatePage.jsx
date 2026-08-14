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
            Completa los datos del usuario y su rol para registrarlo en el sistema.
          </p>
        </header>

        <div className={styles.content}>
          <div className={`alert alert-info ${styles.noteAlert}`} role="note">
            <i className="bi bi-info-circle me-2" aria-hidden="true" />
            El usuario se guarda en la BD interna y se sincroniza con Auth0 para acceso y contrasena.
          </div>

          <div className={styles.formCard}>
            <UserCreateForm />
          </div>
        </div>
      </section>
    </main>
  )
}
