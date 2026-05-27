# Capa Vista - ITECSA

SPA React construida con Vite. Presenta los modulos visuales del sistema y administra el inicio/cierre de sesion mediante Auth0 Universal Login.

## Ejecucion

```bash
npm install
npm run dev
```

Comandos disponibles:

```bash
npm run lint
npm run build
npm run preview
```

## Variables De Entorno

Crear un archivo `.env` local a partir de `env.example`:

```dotenv
VITE_AUTH0_DOMAIN=<dominio-auth0>
VITE_AUTH0_CLIENT_ID=<client-id-spa>
VITE_AUTH0_AUDIENCE=<audience-api>
VITE_API_BASE_URL=http://localhost:3000/api
```

- `VITE_AUTH0_DOMAIN`: tenant usado por Universal Login.
- `VITE_AUTH0_CLIENT_ID`: identificador publico de la SPA.
- `VITE_AUTH0_AUDIENCE`: identificador de la API para solicitar access tokens destinados al backend.
- `VITE_API_BASE_URL`: base prevista para consumir la API Express.

No usar variables `VITE_*` para secretos: todo valor expuesto por Vite queda disponible en el navegador.

## Autenticacion Implementada

- `Auth0Provider` configura el dominio, client ID, audience y URL de retorno local.
- El login redirige a Auth0 Universal Login.
- El logout termina la sesion Auth0 y retorna al origin de la SPA.
- `AuthProvider` mantiene la interfaz interna de autenticacion para los componentes React.

## Limites Actuales

- `ProtectedRoute` verifica sesion para navegacion visual.
- `RoleGuard` y la ruta `/access-denied` siguen siendo controles de experiencia de usuario.
- El frontend aun no consulta `GET /api/auth/verify` ni usa una respuesta `403` del backend para redirigir.
- La autorizacion efectiva de endpoints debe permanecer en la API.

Consulta el diseño transversal en [docs/ARQUITECTURA.md](../docs/ARQUITECTURA.md).
