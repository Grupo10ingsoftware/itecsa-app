import UserCreateForm from '../components/UserCreateForm'

export default function UserCreatePage() {
  return (
    <section className="p-4" aria-labelledby="user-create-title">
      <div className="mb-4">
        <p className="text-uppercase text-secondary small fw-semibold mb-1">
          Administración
        </p>
        <h1 className="h3 mb-2" id="user-create-title">
          Crear usuario
        </h1>
        <p className="text-secondary mb-0">
          Completa los datos obligatorios para preparar una nueva cuenta.
        </p>
      </div>

      <div className="alert alert-warning" role="note">
        Esta acción solo muestra una confirmación en pantalla; los datos no se guardan.
      </div>

      <UserCreateForm />
    </section>
  )
}
