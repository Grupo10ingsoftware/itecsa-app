# Capa Vista - ITECSA

SPA React construida con Vite. Presenta los modulos visuales del sistema y administra el inicio/cierre de sesion mediante Auth0 Universal Login.

## Ejecucion

```bash
npm install
npm run dev
```

Comandos disponibles:

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

Actualmente no existe script de test frontend en `package.json`; usar `npm run lint` y `npm run build` como verificacion local de la SPA.

## Variables De Entorno

Crear un archivo `.env` local a partir de `env.example`:

```dotenv
VITE_AUTH0_DOMAIN=<tenant-auth0>
VITE_AUTH0_CLIENT_ID=<client-id-spa>
VITE_AUTH0_AUDIENCE=https://api.itecsa.local
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
- El Classic Universal Login personalizado envia el link `Recuperar contrasena` a `/recuperar-contrasena`.
- Si Auth0 devuelve un error de cuenta bloqueada o `unauthorized`, `LoginPage` muestra el mensaje de cuenta desactivada y no relanza automaticamente `loginWithRedirect`.
- El logout termina la sesion Auth0 y retorna al origin de la SPA.
- `AuthProvider` mantiene la interfaz interna de autenticacion para los componentes React y verifica la sesion contra `GET /api/auth/verify`.
- La SPA obtiene access tokens con `getAccessTokenSilently`; no los persiste manualmente en `localStorage` ni `sessionStorage`.
- El campo `rolUsuario` que consume la SPA viene desde la respuesta backend y representa un unico rol Auth0 RBAC validado.
- Los permisos visuales vienen desde `permissions`, proyectados por `/api/auth/verify` a partir del access token de `ITECSA API`.

## Recursos Auth0 Esperados

- SPA: `ITECSA Frontend Local`.
- API: `ITECSA API`, con audience `https://api.itecsa.local`.
- API `ITECSA API`: audience `https://api.itecsa.local`, firma `RS256` y RBAC con permisos en el access token. Catálogo y asignaciones: [matriz vigente](../docs/auth0/RBAC-PERMISOS-POR-ROL.md), generada desde `shared/authorization.js`.
- Action Post Login: `ITECSA Add Claims`.
- Conexion Database: `Username-Password-Authentication`.
- Roles permitidos: `Administrador Produccion`, `Soporte`, `Gerencia`, `Operario Produccion`, `Operario Ventas` y `Operario Cobranzas`.

El frontend no lee `app_metadata.rolUsuario` ni decide autorizacion efectiva. La fuente de roles es Auth0 RBAC y la validacion de endpoints pertenece al backend.

## Integraciones Backend Actuales

- Autenticacion: `useAuthApi` consume `GET /api/auth/verify`.
- Recuperacion publica de contrasena: `PasswordResetPage` consume `POST /api/auth/password-reset/request` sin token Auth0.
- Usuarios administrativos: `useAdminUsersApi` consume listado, resumen, edicion, desvinculacion, `POST /api/admin/users` con `FormData` y `POST /api/admin/users/password-setup-email`.
- Kanban: `useKanbanApi` consume `GET /api/orders`, `GET /api/order-status` y `PATCH /api/orders/:orderId/move`; el paso a `En produccion` requiere `move:kanban-to-production`.
- Pagos: `usePaymentsApi` consume `GET /api/orders`, `GET /api/payment-status`, `PATCH /api/orders/:orderId/payment-status`, `GET /api/orders/:orderId/payment-signature-preview` y `GET /api/orders/:orderId/payment-signature-evidence`; los mocks quedan solo como fixtures de desarrollo.
- Registro de orden: `/ordenes/nuevo` mantiene el flujo visual con mocks y `sessionStorage`; aun no llama al `POST /api/orders` del backend.

## Rutas Frontend Actuales

- `/login`: inicio de sesion.
- `/recuperar-contrasena`: recuperacion publica de contrasena.
- `/kanban`: tablero de produccion.
- `/pagos`: confirmacion de pagos.
- `/ordenes/nuevo`: registro visual de orden.
- `/admin/usuarios`: gestion administrativa de usuarios.

## Conectar Una Nueva Vista A Permisos Auth0

1. Crear el permiso en la API `ITECSA API` dentro de Auth0 y asignarlo al rol correspondiente en Auth0 RBAC.
2. Definir el mismo permiso en `src/config/permissions.js`; crear el permiso en Auth0 no basta si la SPA no lo consume.
3. El acceso a `/pagos` requiere `read:payments`; cambiar estados requiere `update:payment-status`. Kanban usa `read:orders` y Métricas usa `view:metrics`.
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
- `/recuperar-contrasena` es publica, pero la decision de enviar correo queda en backend segun existencia y estado interno del usuario.
- ITECSA no recibe ni persiste contrasenas; la captura y gestion de contrasenas ocurre en Auth0.

Consulta el diseno transversal en [docs/ARQUITECTURA.md](../docs/ARQUITECTURA.md) y las convenciones visuales en [docs/CONVENCIONES_UI_FRONTEND.md](../docs/CONVENCIONES_UI_FRONTEND.md).

El valor oficial del administrador en Auth0, API y base de datos es
`Administrador Produccion` (sin tilde). La interfaz muestra la etiqueta
`Administrador Producción` mediante `getRoleLabel`; nunca envía esa etiqueta
como valor del rol. `Operario Produccion` también usa un valor oficial sin tilde y se muestra como
`Operario Producción` mediante la misma función.
