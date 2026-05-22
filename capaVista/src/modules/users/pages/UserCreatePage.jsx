import UserCreateForm from '../components/UserCreateForm'

export default function UserCreatePage() {
  return (
    <section className="p-4" aria-labelledby="user-create-title">
      <div className="mb-4">
        <p className="text-uppercase text-secondary small fw-semibold mb-1">
          Administracion visual
        </p>
        <h1 className="h3 mb-2" id="user-create-title">
          Crear usuario
        </h1>
        <p className="text-secondary mb-0">
          Esta pantalla prepara visualmente el registro de usuarios. La creación real
          queda pendiente de backend/Auth0.
        </p>
      </div>

      <div className="alert alert-warning" role="note">
        En esta version no se crearan usuarios reales, no se llamara a APIs y no se
        modificaran mocks persistentes desde este formulario.
      </div>

      <UserCreateForm />
    </section>
  )
}
