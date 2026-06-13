# Trazabilidad Tecnica Del Incremento 1

## Objetivo

Este documento registra como la aplicacion ITECSA cubre la trazabilidad tecnica del Incremento 1 para autenticacion, permisos, endpoints backend y reglas RF/UR implementadas. Incluye la integracion Auth0 para login, logout, creacion administrativa de usuarios y autorizacion por permisos, mas el cierre backend de pagos y Kanban asociado a RF32.

No es una bitacora ni un plan historico. La finalidad es dejar evidencia tecnica verificable de lo construido y de las decisiones de seguridad asociadas.

## Alcance Implementado

- Login mediante Auth0 Universal Login desde la SPA React.
- Logout mediante Auth0 Universal Logout.
- Verificacion backend de access tokens emitidos por Auth0 con `GET /api/auth/verify`.
- Uso de Auth0 RBAC para los roles `Administrador`, `Gerencia`, `Operario`, `Ventas` y `Cobranzas`.
- Uso del claim estandar `permissions` para permisos visuales en la SPA.
- Creacion y gestion administrativa de usuarios con `GET /api/admin/users`, `GET /api/admin/users/summary`, `POST /api/admin/users`, `PATCH /api/admin/users/:userId` y `PATCH /api/admin/users/:userId/status`.
- Persistencia de la entidad interna `Usuario` con `id_auth0`, `correo_usuario`, `rol_usuario` y `estado_usuario`.
- Solicitud de correo de establecimiento/cambio de contrasena con `POST /api/admin/users/password-setup-email`.
- Recuperacion publica de contrasena con `/recuperar-contrasena` y `POST /api/auth/password-reset/request`, validando existencia y estado interno antes de llamar Auth0.
- Proteccion backend de endpoints administrativos mediante JWT Auth0 y rol `Administrador` emitido por Auth0 RBAC.
- Separacion de permisos de lectura y escritura para el modulo de pagos: `view:payments-module` permite entrar a `/pagos`, mientras `update:payment-status` permite gestionar cambios de estado.
- Endpoints backend RF32 para consultar pedidos/Kanban mock, actualizar estado de pago y rechazar movimientos manuales invalidos hacia `Listo para produccion`.

Quedan fuera de este alcance pedidos persistidos, pagos persistidos, Kanban con base de datos real y produccion real. El backend de pedidos/Kanban usa datos mock/en memoria y expone el cambio de estado de pago protegido por `update:payment-status`; la vista frontend de pagos usa datos locales/mock y no consume todavia ese endpoint.

## Trazabilidad UR/RF

| Requisito | Cobertura implementada | Evidencia tecnica |
| --- | --- | --- |
| UR 1.1 - Ingresar credenciales validas | La SPA inicia sesion mediante Auth0 Universal Login. ITECSA no captura credenciales en una pantalla propia. | `capaVista/src/modules/auth/components/LoginForm.jsx`, `capaVista/src/modules/auth/pages/LoginPage.jsx`, `capaVista/src/app/providers/AppProviders.jsx`. |
| UR 1.4 - Permisos por roles minimos | Auth0 RBAC es la fuente de roles y permisos. La SPA consume permisos visuales desde el claim `permissions` emitido por Auth0. | `capaVista/src/config/permissions.js`, `capaVista/src/shared/components/navigation/RoleGuard.jsx`, `capaVista/src/app/providers/AuthProvider.jsx`. |
| UR 1.10 - Validar correo y contrasena | La validacion de credenciales ocurre en Auth0 Universal Login y en la conexion Database configurada, no en codigo propio. | `@auth0/auth0-react`, `Auth0Provider`, tenant Auth0 y conexion `Username-Password-Authentication`. |
| UR 1.11 - Ingresar solo usuarios validados y vinculados | La SPA espera sesion Auth0 y el backend valida que el access token emitido por Auth0 contenga identidad, rol y permisos con el contrato esperado. Los usuarios `Desvinculado` se sincronizan como `blocked` en Auth0 y la SPA muestra cuenta desactivada si Auth0 devuelve `unauthorized`. | `capaVista/src/modules/auth/pages/LoginPage.jsx`, `capaVista/src/shared/components/navigation/ProtectedRoute.jsx`, `capaVista/src/modules/auth/api/authApi.js`, `capaServidor/src/modules/auth/controller/auth.controller.js`, `setAuth0UserStatus(...)`. |
| UR 1.12 - Impedir correos duplicados | La creacion administrativa delega unicidad de correo en Auth0 y normaliza el duplicado como respuesta `409`. | `capaServidor/src/modules/users/controller/adminUsers.controller.js`, `capaServidor/src/modules/users/service/auth0Management.service.js`. |
| UR 1.13 - Restringir URL protegidas por rol | El frontend aplica restricciones visuales usando roles/permisos emitidos por Auth0 y el backend protege endpoints administrativos validando el rol `Administrador` del token Auth0. | `RoleGuard`, `ProtectedRoute`, `capaServidor/src/middlewares/checkJwt.js`, `capaServidor/src/middlewares/requireAdministrador.js`. |
| UR 1.14 - Mostrar acceso denegado | La SPA redirige a una vista de acceso denegado cuando el rol o permiso visual no permite continuar. | `capaVista/src/modules/auth/pages/AccessDeniedPage.jsx`, `RoleGuard`. |
| UR 1.15 - Recuperar o establecer contrasena por correo | El backend solicita a Auth0 el correo de establecimiento/cambio de contrasena sin retornar tickets, enlaces ni contrasenas. El flujo publico valida correo y estado interno antes de llamar Auth0. | `/recuperar-contrasena`, `POST /api/auth/password-reset/request`, `POST /api/admin/users/password-setup-email`, `requestPasswordSetupEmail(...)`. |
| UR 1.18 - Cerrar sesion desde cualquier interfaz | La SPA ejecuta Auth0 Universal Logout y retorna al origen local autorizado. | `capaVista/src/modules/auth/components/LogoutButton.jsx`, `AuthProvider.logout(...)`. |
| RF26 / UR 3.1 - Cobranzas clasifica estado de pago | El rol `Cobranzas` puede gestionar estados de pago; `Administrador` mantiene lectura del modulo sin permiso de edicion. El backend exige `update:payment-status` para ejecutar cambios sensibles. | `capaVista/src/config/permissions.js`, `capaVista/src/modules/payments/pages/PaymentConfirmationPage.jsx`, `capaServidor/src/modules/orders/routes/order.routes.js`, `requirePermission("update:payment-status")`. |
| RF28 / UR 3.3 - Cambio automatico a Listo para produccion | Cuando el estado de pago queda `Confirmado`, la regla backend actualiza automaticamente el estado del pedido a `Listo para produccion`. | `capaServidor/src/modules/orders/service/order.service.js`, `PATCH /api/orders/:orderId/payment-status`. |
| RF32 / UR 3.7 - Bloqueo de avance sin pago confirmado | El backend rechaza mover manualmente un pedido a `Listo para produccion` si el pago asociado no esta `Confirmado`, y responde el mensaje requerido. | `PATCH /api/orders/:orderId/move`, `order.service.js`. |
| RF - Gestion administrativa de usuarios | Solo `Administrador` puede listar, crear, editar y desvincular usuarios. La creacion conserva Auth0 RBAC, persistencia interna y firma electronica; la edicion sincroniza Auth0 y la tabla interna `Usuario`. | `GET /api/admin/users`, `GET /api/admin/users/summary`, `POST /api/admin/users`, `PATCH /api/admin/users/:userId`, `PATCH /api/admin/users/:userId/status`, `requireAdministrador`. |
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

### `POST /api/auth/password-reset/request`

Endpoint publico llamado por `/recuperar-contrasena`.

Cuerpo aceptado:

```json
{
  "email": "correo.controlado@example.cl"
}
```

Responsabilidades:

- Validar que solo se envie `email`.
- Consultar la entidad interna `Usuario` por correo normalizado.
- No llamar Auth0 si el correo no existe.
- No llamar Auth0 si el usuario existe pero no esta `Activo`.
- Solicitar a Auth0 el correo de cambio de contrasena solo para usuarios activos.
- No devolver tickets, enlaces, tokens ni contrasenas.

### `POST /api/admin/users`

Requiere access token valido y rol unico `Administrador`.

Cuerpo aceptado como `multipart/form-data`:

```txt
nombreUsuario=Ana
apellidoUsuario=Perez
rutUsuario=12.345.678-9
correoUsuario=correo.controlado@example.cl
rolUsuario=Ventas
firmaElectronica=<archivo PDF, PNG, JPG, JPEG o WebP>
```

Responsabilidades:

- Rechazar campos no permitidos.
- Validar nombre, apellido, RUT, correo, rol permitido y firma electronica.
- Crear el usuario en Auth0 Database sin `app_metadata.rolUsuario`.
- Resolver y asignar el rol Auth0 RBAC existente.
- Persistir `Usuario` con datos internos y `ruta_firma`.
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

### `GET /api/orders/kanban`

Requiere access token Auth0 valido. Devuelve columnas Kanban fijas y ordenes mock/en memoria para evidenciar `UR 5.1` y `UR 5.2` mientras no exista persistencia real.

Responsabilidades:

- Exponer estados Kanban minimos para el flujo de pago y produccion.
- Devolver pedidos de prueba con estados de pago `Pendiente`, `Confirmado` y `Rechazado`.
- Mantener el contrato listo para reemplazar el origen mock por repositorio de base de datos.

### `PATCH /api/orders/:orderId/payment-status`

Requiere access token Auth0 valido y permiso `update:payment-status` emitido por Auth0 para `ITECSA API`.

Responsabilidades:

- Aceptar `paymentStatusId` con `0` para `Pendiente`, `1` para `Confirmado` y `2` para `Rechazado`.
- Cambiar automaticamente la etapa general a `Listo para produccion` cuando `paymentStatusId` queda en `1`.
- Devolver la orden a `Confirmacion de pago` cuando `paymentStatusId` queda en `0` o `2`.
- Responder `403` si el token no contiene `update:payment-status`.

### `PATCH /api/orders/:orderId/move`

Requiere access token Auth0 valido.

Responsabilidades:

- Permitir movimientos Kanban validos sobre pedidos mock/en memoria.
- Aceptar `generalStepId` con `0` Confirmacion de pago, `1` Listo para produccion, `2` En produccion y `3` Listo para entrega.
- Rechazar el movimiento cuando el pago del pedido sea distinto de `Confirmado`.
- Responder el mensaje exacto requerido:

```json
{
  "message": "Pedido en espera de confirmacion de pago"
}
```

## Cumplimiento RF32 - Pagos Y Kanban

La trazabilidad correcta para Documento 0 usa `RF26`, `RF28` y `RF32`. No se usa `CU33/CU37` para este cierre.

| Requisito | Cumplimiento actual | Estado |
| --- | --- | --- |
| RF26 / UR 3.1 | `Cobranzas` tiene permiso operativo `update:payment-status`; `Administrador` conserva acceso de lectura a `/pagos` con `view:payments-module`, pero no puede gestionar cambios de estado. | Validado manualmente en frontend y protegido en backend. |
| RF28 / UR 3.3 | La regla backend mueve automaticamente la orden a `Listo para produccion` cuando el pago queda `Confirmado`. | Implementado y cubierto por tests backend. |
| RF32 / UR 3.7 | La regla backend impide mover manualmente a `Listo para produccion` si el pago no esta `Confirmado`. | Implementado y cubierto por tests backend. |

Estado actual: backend implementado con datos mock/en memoria para pedidos/Kanban y reglas de estado de pago. La persistencia de esos modulos queda pendiente hasta que exista el modelo persistente correspondiente. El frontend de pagos mantiene datos locales/mock; visualmente separa lectura y escritura mediante permisos Auth0, pero la transicion de estado en pantalla no llama todavia al endpoint backend.

## Cumplimiento Contra StackTecnologico.docx.md

Referencia: `C:\Users\danag\dev\Uni\Ingenieria de software\Aplicacion\StackTecnologico.docx.md`.

El cierre RF32 respeta la separacion indicada en la guia tecnica:

- El frontend controla la experiencia visual, navegacion, botones, modales y feedback al usuario.
- El backend valida reglas criticas: permisos de accion, estados permitidos, cambio automatico a produccion y bloqueo RF32.
- La integracion real con base de datos para pedidos, pagos y Kanban queda pendiente aunque la BD ya se usa para `Usuario`.
- El bloqueo visual del frontend no se considera seguridad efectiva; la autorizacion sensible vive en Express mediante `checkJwt`, `requirePermission(...)` y reglas backend.
- Los mocks quedan identificados como temporales y deben reemplazarse por repositorios/servicios persistentes cuando el equipo habilite la BD.

## Evidencia Tecnica

Frontend:

- `capaVista/src/app/providers/AppProviders.jsx`: configura `Auth0Provider` con dominio, client ID, audience y retorno local.
- `capaVista/src/app/providers/AuthProvider.jsx`: mantiene la fachada interna `useAuth()`, consulta `/api/auth/verify`, expone rol y permisos provenientes de Auth0 y verificados por backend.
- `capaVista/src/modules/auth/components/LoginForm.jsx`: inicia Universal Login con `loginWithRedirect`.
- `capaVista/src/modules/auth/pages/LoginPage.jsx`: corta el relanzamiento automatico de Auth0 cuando existe error de cuenta bloqueada y muestra el mensaje de cuenta desactivada.
- `capaVista/src/modules/auth/pages/PasswordResetPage.jsx`: pantalla publica para solicitar recuperacion de contrasena.
- `capaVista/src/modules/auth/api/passwordResetApi.js`: consume `POST /api/auth/password-reset/request`.
- `capaVista/src/modules/auth/components/LogoutButton.jsx`: ejecuta Universal Logout.
- `capaVista/src/shared/components/navigation/ProtectedRoute.jsx`: espera sesion Auth0 y verificacion backend.
- `capaVista/src/shared/components/navigation/RoleGuard.jsx`: aplica control visual por rol o permiso.
- `capaVista/src/services/api/apiClient.js`: centraliza llamadas HTTP al backend.
- `capaVista/src/modules/auth/api/authApi.js`: expone `verify()` para validar sesion contra backend.
- `capaVista/src/modules/users/components/UserCreateForm.jsx`: envia alta administrativa con datos internos y firma electronica; la contrasena queda gestionada por Auth0.
- `capaVista/src/modules/payments/pages/PaymentConfirmationPage.jsx`: separa permiso de vista y permiso de accion para confirmar pagos en la experiencia visual actual.
- `capaVista/src/modules/payments/components/PaymentRowActions.jsx`: mantiene `Gestionar` visible pero bloqueado cuando falta `update:payment-status`.
- `capaVista/src/modules/payments/mocks/`: contiene datos y transiciones simuladas hasta integrar BD/backend persistente.

Backend:

- `capaServidor/src/middlewares/checkJwt.js`: valida access tokens emitidos por Auth0 destinados a `AUTH0_AUDIENCE`.
- `capaServidor/src/middlewares/requireAdministrador.js`: autoriza solo tokens Auth0 con `https://itecsa.local/roles: ["Administrador"]`.
- `capaServidor/src/middlewares/requirePermission.js`: autoriza acciones sensibles segun el claim `permissions`.
- `capaServidor/src/modules/auth/controller/auth.controller.js`: implementa `GET /api/auth/verify`, proyecta identidad, rol y permisos emitidos por Auth0, y expone el endpoint publico de recuperacion.
- `capaServidor/src/modules/users/controller/adminUsers.controller.js`: implementa alta administrativa y solicitud de correo de contrasena.
- `capaServidor/src/modules/orders/routes/order.routes.js`: implementa rutas de pedidos, pago y movimiento Kanban.
- `capaServidor/src/modules/orders/service/order.service.js`: aplica reglas RF26/RF28/RF32 con ordenes mock/en memoria.
- `capaServidor/src/modules/users/service/auth0Management.service.js`: encapsula llamadas a Auth0 Management API y `/dbconnections/change_password`.

## Decisiones de Seguridad

- La SPA no captura, valida, almacena ni transmite contrasenas de usuario hacia ITECSA.
- ITECSA no persiste contrasenas, hashes, tokens, tickets ni enlaces de recuperacion.
- Auth0 Management API se usa solo desde `capaServidor`; nunca desde `capaVista`.
- La recuperacion publica de contrasena no devuelve tickets ni enlaces y no dispara correo para usuarios inexistentes o desactivados.
- Las variables `VITE_*` no contienen secrets porque quedan expuestas en el navegador.
- Los guards frontend (`ProtectedRoute`, `RoleGuard`, `hasPermission(...)`) usan roles y permisos emitidos por Auth0 como controles de experiencia visual, no como autorizacion efectiva de servidor.
- La autorizacion sensible se valida en Express contra el JWT, roles y permisos emitidos por Auth0, usando `checkJwt`, `requireAdministrador`, `requirePermission(...)` y reglas backend.
- Crear un permiso en Auth0 no basta: debe declararse en frontend, consumirse en controles/handlers y validarse en backend cuando la accion sea sensible.
- `app_metadata.rolUsuario` no es fuente de autorizacion. Si existe en usuarios heredados, funciona solo como metadata auxiliar; la fuente vigente de roles y permisos es Auth0 RBAC mediante `https://itecsa.local/roles` y `permissions`.
- No se documentan tokens, contrasenas, correos reales ni secrets en codigo, README, ejemplos o documentos tecnicos.

## Limites y Continuidad

- Esta integracion no cubre pedidos, pagos, Kanban ni produccion persistidos en base de datos.
- Prisma y MySQL ya estan integrados para persistir la entidad interna `Usuario` durante la creacion administrativa.
- Auth0 RBAC sigue siendo la fuente operativa de autorizacion; `Usuario.rol_usuario` es dato interno de negocio.
- Los endpoints RF32 usan ordenes mock/en memoria y el frontend de pagos conserva datos locales/mock sin consumir todavia el endpoint backend de estado de pago.
- El mock/en memoria del modulo `orders` debe reemplazarse por servicios/repositorios persistentes sin cambiar las reglas RF26/RF28/RF32 ni los permisos Auth0.
