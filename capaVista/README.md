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

No usar variables `VITE_*` para secretos: todo valor expuesto por Vite queda disponible en el navegador. La SPA nunca debe recibir `AUTH0_MANAGEMENT_CLIENT_SECRET`, tokens M2M ni credenciales de Auth0 Management.

## Autenticacion Implementada

- `Auth0Provider` configura el dominio, client ID, audience y URL de retorno local.
- El login redirige a Auth0 Universal Login.
- El logout termina la sesion Auth0 y retorna al origin de la SPA.
- `AuthProvider` mantiene la interfaz interna de autenticacion para los componentes React y verifica la sesion contra `GET /api/auth/verify`.
- La SPA obtiene access tokens con `getAccessTokenSilently`; no los persiste manualmente en `localStorage` ni `sessionStorage`.
- El campo `rolUsuario` que consume la SPA viene desde la respuesta backend y representa un unico rol Auth0 RBAC validado.
- Los permisos visuales vienen desde `permissions`, proyectados por `/api/auth/verify` a partir del access token de `ITECSA API`.

## Recursos Auth0 Esperados

- SPA: `ITECSA Frontend Local`.
- API: `ITECSA API`, con audience `https://api.itecsa.local`.
- Action Post Login: `ITECSA Add Role Claim`.
- Conexion Database: `Username-Password-Authentication`.
- Roles permitidos: `Administrador`, `Gerencia`, `Operario`, `Ventas` y `Cobranzas`.

El frontend no lee `app_metadata.rolUsuario` ni decide autorizacion efectiva. La fuente de roles es Auth0 RBAC y la validacion de endpoints pertenece al backend.

## Conectar Una Nueva Vista A Permisos Auth0

1. Definir el permiso visual en `src/config/permissions.js` si todavia no existe.
2. Crear el permiso equivalente en la API `ITECSA API` dentro de Auth0.
3. Asignar ese permiso al rol correspondiente en Auth0 RBAC.
4. Proteger la ruta con `RoleGuard` o consultar `hasPermission(...)` desde `useAuth()`.
5. No hardcodear en frontend una matriz rol-permiso; la matriz vigente vive en Auth0.
6. Si la vista ejecuta una accion sensible, agregar o reutilizar validacion en backend. `RoleGuard` y `hasPermission(...)` son controles visuales, no seguridad definitiva.
7. Probar con usuarios controlados que el access token nuevo incluya el permiso esperado sin registrar tokens ni datos personales.

## Limites Actuales

- `ProtectedRoute` espera Auth0 y la verificacion backend para navegacion visual.
- `RoleGuard`, `hasPermission(...)` y la ruta `/access-denied` siguen siendo controles de experiencia de usuario.
- La autorizacion efectiva de endpoints debe permanecer en la API.
- ITECSA no recibe ni persiste contrasenas; la captura y gestion de contrasenas ocurre en Auth0.

Consulta el diseno transversal en [docs/ARQUITECTURA.md](../docs/ARQUITECTURA.md).
