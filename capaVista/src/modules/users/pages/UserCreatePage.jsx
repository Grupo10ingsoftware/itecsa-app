import UserCreateForm from '../components/UserCreateForm'

export default function UserCreatePage() {
  return (
    <section className="p-4" aria-labelledby="user-create-title">
      <div className="mb-4">
        <p className="text-uppercase text-secondary small fw-semibold mb-1">
          Administracion
        </p>
        <h1 className="h3 mb-2" id="user-create-title">
          Crear usuario
        </h1>
        <p className="text-secondary mb-0">
          Completa los datos obligatorios para crear una nueva cuenta Auth0.
        </p>
      </div>

      <div className="alert alert-info" role="note">
        RUT, firma electronica y contrasena no se enviaran en esta etapa.
      </div>

      <UserCreateForm />
    </section>
  )
}
