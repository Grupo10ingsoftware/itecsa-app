import { useAuth } from '../../../hooks/useAuth'

export default function LoginForm({ returnTo }) {
  const { loginWithRedirect } = useAuth()

  function handleSubmit(event) {
    event.preventDefault()

    loginWithRedirect({
      appState: {
        returnTo,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <button className="btn btn-primary w-100" type="submit">
        Iniciar sesion
      </button>
    </form>
  )
}
