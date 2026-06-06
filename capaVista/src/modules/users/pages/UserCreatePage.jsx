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
        </header>

        <div className={styles.content}>
          <div className={`alert ${styles.noteAlert}`} role="note">
            <i className="bi bi-envelope me-2" aria-hidden="true" />
            Auth0 enviará un correo para que el usuario establezca su contraseña.
          </div>

          <div className={styles.formCard}>
            <UserCreateForm />
          </div>
        </div>
      </section>
    </main>
  )
}
