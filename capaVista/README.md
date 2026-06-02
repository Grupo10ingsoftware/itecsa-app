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

1. Crear el permiso en la API `ITECSA API` dentro de Auth0 y asignarlo al rol correspondiente en Auth0 RBAC.
2. Definir el mismo permiso en `src/config/permissions.js`; crear el permiso en Auth0 no basta si la SPA no lo consume.
3. Separar permisos de vista y permisos de accion. Ejemplo: `view:payments-module` permite entrar a `/pagos`, pero `update:payment-status` permite cambiar estados de pago.
4. Proteger rutas con `RoleGuard` cuando el permiso controle acceso a una vista completa.
5. Consultar `hasPermission(...)` desde `useAuth()` cuando el permiso controle botones, modales, formularios o acciones dentro de una vista compartida.
6. Bloquear tambien los handlers de la accion, no solo deshabilitar u ocultar botones. Si el usuario no tiene permiso, no debe abrir menus, modales ni ejecutar cambios aunque el evento se dispare por accidente.
7. Si la accion es sensible, agregar o reutilizar validacion en backend. `RoleGuard` y `hasPermission(...)` son controles visuales, no seguridad definitiva.
8. Probar con un rol autorizado y uno no autorizado que el access token nuevo incluya el permiso esperado, sin registrar tokens ni datos personales.
9. No hardcodear en frontend una matriz rol-permiso; la matriz vigente vive en Auth0.

## Limites Actuales

- `ProtectedRoute` espera Auth0 y la verificacion backend para navegacion visual.
- `RoleGuard`, `hasPermission(...)` y la ruta `/access-denied` siguen siendo controles de experiencia de usuario.
- La autorizacion efectiva de endpoints debe permanecer en la API.
- ITECSA no recibe ni persiste contrasenas; la captura y gestion de contrasenas ocurre en Auth0.

Consulta el diseno transversal en [docs/ARQUITECTURA.md](../docs/ARQUITECTURA.md) y las convenciones visuales en [docs/CONVENCIONES_UI_FRONTEND.md](../docs/CONVENCIONES_UI_FRONTEND.md).
