# Auth0: autenticación y autorización

Esta guía describe la integración y configuración **esperada por el código**. El [informe del 25-09-2026](../archivo/auditorias/AUDITORIA-2026-09-25.md) y el [historial RBAC](../archivo/implementaciones/RBAC-IMPLEMENTACION-Y-PENDIENTES.md) son evidencia fechada, no una verificación del tenant actual.

## Catálogo y recursos esperados

El catálogo canónico es [shared/authorization.js](../../shared/authorization.js). La [matriz generada](RBAC-PERMISOS-POR-ROL.md) contiene las listas completas de los 25 permisos para los ocho roles reconocidos: siete funcionales y Soporte. Los nombres técnicos usan `Produccion` sin tilde; las etiquetas de UI pueden mostrar `Producción`.

| Recurso | Configuración esperada |
| --- | --- |
| SPA `ITECSA Frontend Local` | Universal Login/Logout y callbacks/origins del ambiente |
| API `ITECSA API` | Audience `https://api.itecsa.local`, firma RS256, RBAC activo y permisos en access token |
| M2M `ITECSA Backend Management` | Solo servidor, scopes `create:users`, `read:roles`, `read:users`, `update:users` |
| Action `ITECSA Add Claims` | Código generado y vinculada a Post Login |
| Database connection | `Username-Password-Authentication` |

No confundir permisos funcionales con scopes administrativos de Management API o de herramientas MCP. Estos últimos no se asignan a usuarios ITECSA ni a Soporte.

## Flujo de sesión

1. El SDK React dirige al usuario a Universal Login; la SPA no captura contraseñas.
2. La Action agrega `https://itecsa.local/roles` y `https://itecsa.local/email` al access token para ITECSA API. Auth0 RBAC agrega `permissions`.
3. La SPA consulta `GET /api/auth/verify`; el backend valida JWT, identidad activa, rol reconocido único y capacidades.
4. `rolUsuario` proyecta el rol validado; `isAdministrador` identifica exclusivamente a `Administrador Produccion`. Las capacidades, no ese booleano, gobiernan la administración departamental.
5. Los guards y `hasPermission(...)` controlan la experiencia visual; la API impone la autorización efectiva.

La API exige capacidad en el token y en el catálogo del rol. Un permiso directo excesivo no amplía por sí solo las atribuciones del rol funcional. `app_metadata.rolUsuario` heredado no sustituye Auth0 RBAC. Ante un rol interno distinto del token, la identidad se reconfirma contra Auth0 antes de sincronizar; un token antiguo no debe restaurar un rol anterior.

Si el login es rechazado por cuenta bloqueada, la SPA muestra un mensaje controlado y evita relanzar automáticamente el login. Tras cambios de roles/permisos, renovar sesiones para obtener tokens nuevos.

## Administración y PIN

Los tres administradores funcionales gestionan solo su departamento: Producción, Ventas o Cobranzas. No gestionan Gerencia ni asignan Soporte. Soporte es un rol técnico de desarrollo/testing, con alcance interdepartamental y todos los permisos funcionales; conserva PIN y reglas de estado. No aparece como rol seleccionable en formularios funcionales.

El alta administrativa acepta JSON con nombre, apellido, RUT, correo y rol. El servidor crea la identidad Auth0, asigna RBAC, registra `Usuario` como `Pendiente`, genera el PIN y solicita el correo para establecer contraseña. El primer acceso con JWT válido y rol coincidente promueve atómicamente la cuenta a `Activo`; esto demuestra el acceso, no que la aplicación haya recibido un evento de cambio de contraseña. `Pendiente rol` es un estado distinto para transiciones de rol. Las cuentas existentes conservan su estado. La contraseña temporal solo existe en memoria durante la creación Database. No se reciben firmas, contraseñas ni tickets desde la SPA.

Edición de correo/rol/estado se sincroniza con Auth0; nombre, apellido y RUT son datos internos. Edición y cambio de estado exigen PIN y alcance departamental. Una creación con `recoverable: true` indica que hubo creación externa parcial: no repetir ciegamente el alta. Consultar [contratos API](../desarrollo/API.md).

El PIN personal es independiente de la contraseña Auth0. Su entrega, aceptación y recuperación operan sobre el actor autenticado. `PIN_SECRET` es exclusivo del servidor y debe conservarse para la misma base. La recuperación dispone de un adaptador Resend que requiere credenciales y remitente verificado. Sin selección explícita queda deshabilitada; `console` solo se admite expresamente en desarrollo. Consultar los [pendientes de seguridad](../PENDIENTES.md) antes de usar ese flujo fuera de desarrollo.

El reset debug requiere `APP_ENV=NODE_ENV=development`, `ENABLE_DEMO_ROUTES=true` (y `VITE_ENABLE_DEMO_ROUTES=true` en la SPA), Soporte coincidente con la base y `manage:own-pin`. Opera solo sobre el usuario autenticado. La SPA compilada para producción no muestra el botón.

## Recuperación de contraseña y plantillas

[universal-login.html](universal-login.html) es la referencia de Classic Universal Login. Deshabilita signup y dirige la recuperación a la ruta propia `/recuperar-contrasena`; ajustar el dominio HTTPS al ambiente antes de configurar el template.

La SPA envía el correo a `POST /api/auth/password-reset/request`. Una solicitud válida recibe siempre HTTP `202`, `status: "accepted"` y el mismo mensaje condicional; un usuario interno activo o `Pendiente` puede provocar la solicitud de correo Auth0. Fallos de consulta y entrega conservan esa respuesta. No devuelve tickets, enlaces, tokens ni contraseñas. El resultado real queda en telemetría con correlación HMAC cuando se configura su clave, sin correo ni mensajes de excepción. La espera mínima de 600 ms más jitter de 0–199 ms reduce diferencias temporales; una consulta/envío más lento puede excederla. Las cuotas son por IP (10/15 min) y correo normalizado (3/15 min), persistentes en producción y en memoria en desarrollo/test.

[change-password-email-es.html](change-password-email-es.html) es el respaldo del template **Change Password**. Para aplicar personalizaciones, configurar un proveedor de correo propio, guardar la plantilla y probar un envío controlado. El proveedor incorporado de desarrollo puede seguir usando el correo predeterminado. Referencia: [personalización de correos Auth0](https://auth0.com/docs/customize/email/email-templates).

## Generación y evidencia

Desde la raíz:

```bash
node scripts/rbac.mjs --generate
node scripts/rbac.mjs --check docs/auth0/rbac.observed.json
```

El generador actualiza la matriz, [rbac.expected.json](rbac.expected.json) y [itecsa-post-login.cjs](itecsa-post-login.cjs). No llama a Auth0 ni verifica que esa Action esté desplegada. Los cambios documentales no alteran sus listas o código funcional.

[rbac.observed.json](rbac.observed.json) es una captura del 06-09-2026: tiene 23 permisos, asociaciones de roles y binding sin evidencia completa, y datos parciales de sesión. El `--check` contra ella devuelve diferencias frente al catálogo actual de 25; ese fallo no prueba una regresión del tenant. El informe del 25-09 registra evidencia posterior; no existe un snapshot JSON de esa fecha en este árbol.

Para una verificación actual se necesita una captura autorizada con `resourceServer`, `roles`, `actionCode` y `postLoginBound`, fecha y revisión del código. No almacenar access tokens, credenciales ni datos personales. Quedan pendientes las sesiones representativas por rol y la revisión de permisos directos, recogidas en [PENDIENTES.md](../PENDIENTES.md).
