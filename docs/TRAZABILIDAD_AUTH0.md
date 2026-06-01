# Trazabilidad de Login, Creacion de Usuarios e Integracion Auth0

## Objetivo

Este documento registra como la aplicacion ITECSA integra Auth0 para autenticacion, verificacion de sesion, roles, permisos y administracion de usuarios. Su foco es trazar el trabajo implementado en login, logout, creacion administrativa de usuarios y comunicacion frontend/backend con Auth0.

No es una bitacora ni un plan historico. La finalidad es dejar evidencia tecnica verificable de lo construido y de las decisiones de seguridad asociadas.

## Alcance Implementado

- Login mediante Auth0 Universal Login desde la SPA React.
- Logout mediante Auth0 Universal Logout.
- Verificacion backend de access tokens emitidos por Auth0 con `GET /api/auth/verify`.
- Uso de Auth0 RBAC para los roles `Administrador`, `Gerencia`, `Operario`, `Ventas` y `Cobranzas`.
- Uso del claim estandar `permissions` para permisos visuales en la SPA.
- Creacion administrativa de usuarios Auth0 con `POST /api/admin/users`.
- Solicitud de correo de establecimiento/cambio de contrasena con `POST /api/admin/users/password-setup-email`.
- Proteccion backend de endpoints administrativos mediante JWT Auth0 y rol `Administrador` emitido por Auth0 RBAC.

Quedan fuera de este alcance pedidos, pagos, Kanban real, produccion real, Prisma, MySQL y persistencia local de usuarios.

## Trazabilidad UR/RF

| Requisito | Cobertura implementada | Evidencia tecnica |
| --- | --- | --- |
| UR 1.1 - Ingresar credenciales validas | La SPA inicia sesion mediante Auth0 Universal Login. ITECSA no captura credenciales en una pantalla propia. | `capaVista/src/modules/auth/components/LoginForm.jsx`, `capaVista/src/modules/auth/pages/LoginPage.jsx`, `capaVista/src/app/providers/AppProviders.jsx`. |
| UR 1.4 - Permisos por roles minimos | Auth0 RBAC es la fuente de roles y permisos. La SPA consume permisos visuales desde el claim `permissions` emitido por Auth0. | `capaVista/src/config/permissions.js`, `capaVista/src/shared/components/navigation/RoleGuard.jsx`, `capaVista/src/app/providers/AuthProvider.jsx`. |
| UR 1.10 - Validar correo y contrasena | La validacion de credenciales ocurre en Auth0 Universal Login y en la conexion Database configurada, no en codigo propio. | `@auth0/auth0-react`, `Auth0Provider`, tenant Auth0 y conexion `Username-Password-Authentication`. |
| UR 1.11 - Ingresar solo usuarios validados y vinculados | La SPA espera sesion Auth0 y el backend valida que el access token emitido por Auth0 contenga identidad, rol y permisos con el contrato esperado. | `capaVista/src/shared/components/navigation/ProtectedRoute.jsx`, `capaVista/src/modules/auth/api/authApi.js`, `capaServidor/src/routes/auth.routes.js`. |
| UR 1.12 - Impedir correos duplicados | La creacion administrativa delega unicidad de correo en Auth0 y normaliza el duplicado como respuesta `409`. | `capaServidor/src/routes/adminUsers.routes.js`, `capaServidor/src/services/auth0Management.service.js`. |
| UR 1.13 - Restringir URL protegidas por rol | El frontend aplica restricciones visuales usando roles/permisos emitidos por Auth0 y el backend protege endpoints administrativos validando el rol `Administrador` del token Auth0. | `RoleGuard`, `ProtectedRoute`, `capaServidor/src/middlewares/checkJwt.js`, `capaServidor/src/middlewares/requireAdministrador.js`. |
| UR 1.14 - Mostrar acceso denegado | La SPA redirige a una vista de acceso denegado cuando el rol o permiso visual no permite continuar. | `capaVista/src/modules/auth/pages/AccessDeniedPage.jsx`, `RoleGuard`. |
| UR 1.15 - Recuperar o establecer contrasena por correo | El backend solicita a Auth0 el correo de establecimiento/cambio de contrasena sin retornar tickets, enlaces ni contrasenas. | `POST /api/admin/users/password-setup-email`, `requestPasswordSetupEmail(...)`. |
| UR 1.18 - Cerrar sesion desde cualquier interfaz | La SPA ejecuta Auth0 Universal Logout y retorna al origen local autorizado. | `capaVista/src/modules/auth/components/LogoutButton.jsx`, `AuthProvider.logout(...)`. |
| RF - Creacion administrativa de usuarios | Solo `Administrador` puede crear usuarios Auth0 con correo y rol permitido; nombre y apellido quedan pendientes para la futura BD propia. | `POST /api/admin/users`, `requireAdministrador`, `createAuth0User(...)`. |
| RF - Seguridad de secretos | El frontend no recibe credenciales Auth0 Management; los secrets quedan fuera del repositorio y de variables `VITE_*`. | `capaVista/env.example`, `capaServidor/env.example`, `capaVista/README.md`, `capaServidor/README.md`. |

## Contratos Reales Implementados

### `GET /api/auth/verify`

Requiere un access token Auth0 en el encabezado:

```http
Authorization: Bearer <access_token>
```

Responsabilidades:

- Validar issuer y audience mediante `express-oauth2-jwt-bearer`.
- Exigir identidad Auth0 con `sub`.
- Exigir correo namespaced emitido por Auth0 en `https://itecsa.local/email`.
- Exigir exactamente un rol oficial emitido por Auth0 RBAC en `https://itecsa.local/roles`.
- Validar que `permissions`, emitido por Auth0 para la API ITECSA, sea un arreglo si existe.
- Devolver `sub`, `email`, `rolUsuario`, `isAdministrador` y `permissions`.

### `POST /api/admin/users`

Requiere access token valido y rol unico `Administrador`.

Cuerpo aceptado:

```json
{
  "correoUsuario": "correo.controlado@example.cl",
  "rolUsuario": "Ventas"
}
```

Responsabilidades:

- Rechazar campos no permitidos.
- Validar correo y rol permitido.
- Crear el usuario en Auth0 Database sin nombre, apellido ni `app_metadata.rolUsuario`.
- Resolver y asignar el rol Auth0 RBAC existente.
- Solicitar el correo de establecimiento/cambio de contrasena.
- Normalizar correo duplicado como `409`.
- No recibir ni retornar contrasenas.

### `POST /api/admin/users/password-setup-email`

Requiere access token valido y rol unico `Administrador`.

Cuerpo aceptado:

```json
{
  "correoUsuario": "correo.controlado@example.cl"
}
```

Responsabilidades:

- Validar que solo se envie `correoUsuario`.
- Solicitar a Auth0 el correo de establecimiento/cambio de contrasena.
- No crear usuarios.
- No asignar roles.
- No devolver tickets, enlaces ni contrasenas.

## Evidencia Tecnica

Frontend:

- `capaVista/src/app/providers/AppProviders.jsx`: configura `Auth0Provider` con dominio, client ID, audience y retorno local.
- `capaVista/src/app/providers/AuthProvider.jsx`: mantiene la fachada interna `useAuth()`, consulta `/api/auth/verify`, expone rol y permisos provenientes de Auth0 y verificados por backend.
- `capaVista/src/modules/auth/components/LoginForm.jsx`: inicia Universal Login con `loginWithRedirect`.
- `capaVista/src/modules/auth/components/LogoutButton.jsx`: ejecuta Universal Logout.
- `capaVista/src/shared/components/navigation/ProtectedRoute.jsx`: espera sesion Auth0 y verificacion backend.
- `capaVista/src/shared/components/navigation/RoleGuard.jsx`: aplica control visual por rol o permiso.
- `capaVista/src/services/api/apiClient.js`: centraliza llamadas HTTP al backend.
- `capaVista/src/modules/auth/api/authApi.js`: expone `verify()` para validar sesion contra backend.
- `capaVista/src/modules/users/components/UserCreateForm.jsx`: envia alta administrativa sin RUT, firma electronica ni contrasena.

Backend:

- `capaServidor/src/middlewares/checkJwt.js`: valida access tokens emitidos por Auth0 destinados a `AUTH0_AUDIENCE`.
- `capaServidor/src/middlewares/requireAdministrador.js`: autoriza solo tokens Auth0 con `https://itecsa.local/roles: ["Administrador"]`.
- `capaServidor/src/routes/auth.routes.js`: implementa `GET /api/auth/verify` y proyecta identidad, rol y permisos emitidos por Auth0.
- `capaServidor/src/routes/adminUsers.routes.js`: implementa alta administrativa y solicitud de correo de contrasena.
- `capaServidor/src/services/auth0Management.service.js`: encapsula llamadas a Auth0 Management API y `/dbconnections/change_password`.

## Decisiones de Seguridad

- La SPA no captura, valida, almacena ni transmite contrasenas de usuario hacia ITECSA.
- ITECSA no persiste contrasenas, hashes, tokens, tickets ni enlaces de recuperacion.
- Auth0 Management API se usa solo desde `capaServidor`; nunca desde `capaVista`.
- Las variables `VITE_*` no contienen secrets porque quedan expuestas en el navegador.
- Los guards frontend (`ProtectedRoute`, `RoleGuard`, `hasPermission(...)`) usan roles y permisos emitidos por Auth0 como controles de experiencia visual, no como autorizacion efectiva de servidor.
- La autorizacion sensible se valida en Express contra el JWT, roles y permisos emitidos por Auth0, usando `checkJwt`, `requireAdministrador` y reglas backend.
- `app_metadata.rolUsuario` no es fuente de autorizacion. Si existe en usuarios heredados, funciona solo como metadata auxiliar; la fuente vigente de roles y permisos es Auth0 RBAC mediante `https://itecsa.local/roles` y `permissions`.
- No se documentan tokens, contrasenas, correos reales ni secrets en codigo, README, ejemplos o documentos tecnicos.

## Limites y Continuidad

- Esta integracion no cubre pedidos, pagos, Kanban ni produccion real.
- Esta integracion no implementa Prisma, MySQL ni persistencia local de usuarios.
- La creacion administrativa registra identidades en Auth0, pero no crea una entidad interna `Usuario`.
- Una autorizacion definitiva futura debera vincular cada identidad Auth0 con una entidad interna mediante `Usuario.auth0_user_id` y validar estado/rol desde la base de datos.
- Mientras no exista esa persistencia, Auth0 RBAC es la fuente operativa de roles para esta integracion inicial.
