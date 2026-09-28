> **Informe histórico archivado.** Contexto: 05-09-2026; contiene observaciones posteriores del 06 y 25-09-2026.
> Ubicación original: `docs/RBAC-IMPLEMENTACION-Y-PENDIENTES.md`. El contenido y sus referencias originales se conservan como evidencia de esa revisión; no acreditan el estado actual.
> Consultar la [referencia vigente](../../auth0/README.md), los [pendientes](../../PENDIENTES.md) y el [índice del archivo](../README.md).

# RBAC ITECSA: implementación y pendientes

Fecha: 5 de septiembre de 2026, Chile (verificación del tenant: 6 de septiembre UTC).
Rama: `feat/permisos-por-rol`. Sin push, merge, cambio de rama ni PR.

## Alcance aprobado

Solo autorización sobre capacidades ya implementadas: Auth0, backend, frontend, pruebas y documentación. La fuente principal es `REQ -UR -CDU -DIAGRAMAS.docx` de Downloads, SHA-256 `55c55403aadacd2a39d91f12b0dfd1470ff5e21d11926a9ae21b2c2b417c10e6`, interpretada con las decisiones explícitas del usuario. No se agregan flujos de producción, reportes ni aprobaciones de pago. Tampoco se elimina el módulo de documentos dentro de esta tarea.

**Lista para configurar los roles a mano:** [RBAC-PERMISOS-POR-ROL.md](auth0/RBAC-PERMISOS-POR-ROL.md). Contiene las listas completas, no solo ejemplos.

Modelo canónico: `shared/authorization.js`, consumido por ambas capas. El permiso efectivo requiere que el access token lo contenga **y** que esté concedido al rol por el modelo aprobado. Una asignación excesiva en Auth0 no amplía las atribuciones de un rol funcional.

## Evidencia histórica del 6 de septiembre (no acredita el tenant actual)

| Elemento | Estado |
| --- | --- |
| Roles funcionales | Administrador Produccion, Administrador Ventas, Administrador Cobranzas, Operario Produccion, Operario Ventas, Operario Cobranzas, Gerencia |
| Rol técnico | Soporte, separado del catálogo seleccionable en gestión normal |
| Catálogo funcional | 25 permisos definidos en código y creados/conservados en ITECSA API |
| Resource Server | `6a1660a4a0a31d800e5d0509`, audience `https://api.itecsa.local` |
| Tenant | `itecsa-sistema.us.auth0.com` |
| RBAC | `enforce_policies: true` |
| Permissions en access token | `token_dialect: access_token_authz`; firma RS256 |
| Action | `ITECSA Add Claims`, ID `9eac1390-488f-4f8c-a912-51a476d01a03`, versión 5 desplegada y código releído/verificado |
| Binding de Post Login | Configuración manual confirmada por el usuario; el MCP no expone la consulta del binding |
| Roles → permissions reales | Configuración manual confirmada por el usuario; lectura independiente pendiente |
| Usuarios → roles y permisos directos | Pendiente de revisar en dashboard; no se consultaron ni migraron usuarios |
| Access token real de cada rol | Pendiente de renovar sesiones y probar después de asignar permisos; no se almacenan tokens |
| Backend y frontend | Implementación local y pruebas; no desplegados por esta tarea |

La autorización MCP se renovó con `npx -y @auth0/auth0-mcp-server init --scopes '*'`. La instrucción global `~/.codex/AGENTS.md` usa ahora ese wildcard entre comillas, incluyendo futuros scopes soportados. Esta versión ofrece 15 scopes administrativos; no contiene herramientas de roles/usuarios incluso con todos ellos. Estos scopes son exclusivos de la integración administrativa, nunca se asignan a usuarios ITECSA ni a Soporte.

## Restricciones contextuales

- AP gestiona AP/OP; AV gestiona AV/OV; AC gestiona AC/OC. Aplica a listado, búsqueda, resumen, creación, edición, cambios de rol, estado y correo de establecimiento de contraseña.
- Los administradores funcionales no gestionan Gerencia. El equipo técnico realiza esas asignaciones fuera de la gestión funcional, manteniendo consistente el rol en Auth0 y en el registro interno.
- RNF02: solo administradores pueden revincular, dentro de su departamento. Los operarios y Gerencia reciben 403 aunque presenten `manage:users`. Se conserva la excepción técnica de Soporte.
- Soporte tiene todos los permisos funcionales y alcance interdepartamental centralizado en `manageableRoles`. No puede asignar el rol técnico mediante formularios/API funcional. Puede probar gestión de los roles funcionales, incluida Gerencia como excepción técnica; los administradores funcionales no pueden.
- Cada petición autenticada comprueba exactamente un rol reconocido, `permissions` válido y usuario interno vinculado/activo. Si el rol interno difiere del token, consulta los roles vigentes en Auth0 y sincroniza la base solo si coinciden. Un token anterior no vuelve a escribir el rol en la base. Una cuenta desvinculada recibe 403 antes del controlador; ausencia de autenticación válida, 401.
- Los mensajes se consultan/modifican por el usuario destinatario resuelto desde `sub`. Los IDs del payload no sustituyen al actor autenticado. Los detalles y registros pertenecen al pedido indicado en la URL; los subprocesos deben pertenecer a ese detalle.
- Movimiento manual: únicamente Listo para producción → En producción (AP/Soporte) y Listo para entrega → Entregado (AP/OP/Soporte), con PIN y reglas existentes. El endpoint no permite forzar transiciones automáticas.
- Completar/retroceder subprocesos exige pedido en producción y pago confirmado; se conservan orden de subprocesos, pertenencia al detalle y motivos requeridos. Soporte no omite estas reglas.
- Pagos pendientes: AC/OC/Soporte. Modificar una decisión previa: AC/Soporte, permiso adicional y motivo. La reversión de confirmaciones mantiene su bloqueo existente y en producción se deniega mientras falte el flujo formal de aprobación.
- Calendario: AV y OV **solo vista**, igual que su lectura de carga. AP/Soporte pueden editar fecha con PIN. Ni arrastrar en UI ni un PATCH manual permite editar a AV/OV.
- El PIN valida al actor autenticado y complementa el permiso. Un PIN correcto sin permiso produce 403; Soporte también debe proporcionar PIN.

## Trazabilidad de endpoints y controles visuales

Prefijo `/api`. Todos salvo recuperación pública/health pasan por JWT e identidad interna activa. Los permisos y RF exactos están en la matriz enlazada; el frontend usa el mismo catálogo.

| Método / endpoint | Permission | Contexto / PIN | Frontend |
| --- | --- | --- | --- |
| GET `/auth/verify` | `read:own-profile` | Un único rol y usuario activo | AuthProvider / ProtectedRoute |
| POST `/auth/pin/reveal`, `/auth/pin/acknowledge`, `/auth/pin-recovery/request`, `/auth/pin-recovery/confirm` | `manage:own-pin` | PIN propio, reglas existentes de recuperación | Perfil propio |
| POST `/auth/password-reset/request` | Público | Validación y rate limit; no revincula usuarios | Recuperar contraseña |
| GET `/admin/users`, `/admin/users/summary` | `manage:users` | Departamento en la consulta, incluido resumen | Gestión de usuarios, filtros por departamento |
| POST `/admin/users` | `manage:users` | Rol permitido para actor; Soporte no asignable | Formulario con roles del departamento |
| POST `/admin/users/password-setup-email` | `manage:users` | Usuario activo del departamento | Reenvío de correo |
| PATCH `/admin/users/:userId` | `manage:users` | PIN, rol actual y propuesto en departamento; no cambiar rol propio | Modal de edición |
| PATCH `/admin/users/:userId/status` | `manage:users` | PIN, departamento; RNF02; no desvincularse a sí mismo | Vincular/desvincular |
| GET `/orders`, `/orders/kanban`, `/orders/:orderId` | `read:orders` | Lectura compartida | Kanban |
| GET `/orders/sales-notes/:numeroNota` | `read:sales-notes` | Consulta comercial | Registro/reevaluación |
| POST `/orders` | `create:orders` | Actor desde `sub`; validaciones de registro | Registro de orden |
| PATCH `/orders/:orderId/payment-status` | `update:payment-status` y, al revisar, `revise:payment-status` | PIN; estado actual y aprobación pendiente | Pagos, Gestionar oculto sin capacidad; OC no revisa decisiones |
| PATCH `/orders/:orderId/move` | `move:orders`; inicio requiere `start:production` | PIN; solo transiciones manuales permitidas | Arrastre condicionado |
| PATCH `/orders/:orderId/review` | `review:orders` | Estado admisible y motivo | Solicitar corrección |
| PATCH `/orders/:orderId/cancel-production` | `cancel:orders` | PIN y motivo | Cancelar |
| PATCH `/orders/:orderId/reevaluate` | `reevaluate:orders` | Pedido en revisión | Reevaluar AV/OV |
| PATCH `/orders/:orderId/labels` | `manage:order-tags` | Etiquetas admitidas | Indicadores AP/Soporte |
| PATCH `/orders/:orderId/delivery-date` | `update:order-delivery-date` | PIN, reglas de fecha | Calendario editable AP/Soporte |
| PATCH `/orders/:orderId/details/:detailId/subprocesses/:subprocessId/complete` | `update:production-subprocesses` | PIN, pertenencia, producción y pago confirmado | Paso habilitado AP/OP/Soporte |
| PATCH misma ruta `/rollback` | `rollback:production-subprocesses` | PIN, último paso y motivo | Retroceso AP/Soporte |
| GET `/orders/:orderId/details[/ :detailId]`, `/orders/:orderId/payment-records[/ :paymentRecordId]` | `read:orders` | Pertenencia al pedido | Detalles / historial |
| GET `/order-status`, `/products`, `/products/name/:nombreProducto`, `/products/:productTypeId` | `read:orders` | Catálogos de lectura | Datos de pedidos |
| GET `/clients/rut/:rutCliente`, `/clients/:clientId` | `read:sales-notes` | Consulta comercial | Registro |
| GET `/payment-status[/ :id]` | `read:payments` | Lectura | Pagos |
| GET `/production-capacity` | `read:production-capacity` | Lectura compartida | Kanban / capacidad |
| PATCH `/production-capacity` | `manage:production-capacity` | AP/Soporte | Configuración de capacidad |
| POST `/production-calendar/operational-load` | `read:production-calendar` | Cálculo sin persistencia | Calendario AP/AV/OV/Soporte |
| GET `/history/orders`, `/history/orders/:orderId`, `/history/orders/:orderId/events` | `read:orders` | Listado y eventos paginados; actor/observación de pagos requieren `read:payments` | Rutas de historial |
| GET `/messages`, `/messages/notifications`, `/messages/:messageId` | `read:own-messages` | Destinatario = actor | Bandeja / detalle |
| PATCH `/messages/notifications`, `/messages/notifications/:messageId`, `/messages/:messageId/read` | `update:own-messages` | Destinatario = actor | Leer/ocultar notificación |
| `/documents/*` | No aplica | Módulo retirado en limpieza según RF01–RF75 | Sin endpoint de PDF de notas de venta |
| POST directos de clients/products/order-status/payment-status/details/payment-records | Denegados 403 | Evitan saltarse flujos y trazabilidad; se usan servicios desde operación de negocio | Sin acción funcional independiente |
| `/demo-orders/*` | Sólo `APP_ENV=development|test`; ausente en producción | PIN en mutaciones; almacenamiento demo separado | Pruebas técnicas, no flujo funcional de aprobaciones |

La notación `[/ :id]` representa las dos rutas con y sin ID, sin espacios en la URL real. La API de health conserva su uso de diagnóstico existente.

## Configuración vigente

Consultar la [matriz generada](auth0/RBAC-PERMISOS-POR-ROL.md) y la [auditoría del 25 de septiembre](auth0/AUDITORIA-2026-09-25.md). El catálogo vigente contiene 25 permisos. Métricas corresponde a Administrador Produccion, Gerencia y Soporte. manage:production-load corresponde a Administrador Produccion y Soporte.

## Registro histórico de migración del 6 de septiembre

1. Los 21 permisos nuevos ya se añadieron; se conservaron `update:payment-status` y `manage:order-tags`. Por solicitud posterior del usuario se eliminaron los ocho antiguos: el tenant contiene exactamente los 23 scopes finales, verificados mediante relectura del MCP.
2. Configurar **cada rol** con la lista exacta de [permisos por rol](auth0/RBAC-PERMISOS-POR-ROL.md). Para Soporte, seleccionar los 25 permisos de negocio de ITECSA; nunca Management API.
3. Revisar usuarios con permisos directos, sin rol o con varios roles. Resolver la asignación en Auth0. Cuando el usuario renueve su sesión, un token con el rol vigente sincronizará `rol_usuario` con Auth0 tras una consulta de confirmación; no hay migración SQL ni cambios al esquema.
4. Verificar que `ITECSA Add Claims` siga vinculada al flujo Login. La Action v5 está desplegada, pero el binding no pudo leerse con el MCP.
5. Coordinar despliegue de backend/frontend y renovar sesiones: los tokens antiguos carecen de permisos nuevos y deben recibir denegación hasta renovarse.
6. Ya eliminados del catálogo de la API por solicitud del usuario; comprobar que no queden referencias antiguas en las asignaciones de los roles: `view:main-navigation`, `view:kanban-module`, `view:payments-module`, `view:own-profile`, `view:orders-module`, `create:users-visually`, `manage:users-visually`, `move:kanban-to-production`.
7. Verificar Soporte = exactamente los 25 permisos finales y probar usuarios representativos. No se borró ningún rol ni se migró ninguna asignación en Auth0. La auditoría del 25 de septiembre confirmó la matriz de roles en el dashboard; queda pendiente probar una sesión nueva de la aplicación.

## Reproducción y verificación

Desde la raíz:

```sh
node scripts/rbac.mjs --generate
node scripts/rbac.mjs --check docs/auth0/rbac.observed.json
```

El primer comando regenera las listas, `rbac.expected.json` y el código de la Action desde el catálogo canónico; no llama Auth0. El segundo es un dry-run de comparación sin escrituras. La observación histórica no acredita el estado actual. Para esta auditoría usar `docs/auth0/rbac.observed.2026-09-25.json`. La comparación detecta diferencias contra la captura, no consulta el tenant.

Para comparar un estado real completo, usar la estructura del snapshot observado y rellenar `roles` con un objeto `nombre de rol → array de permissions` obtenido del dashboard/API autorizada, `postLoginBound` con la evidencia real y `actionCode` con el código desplegado. No incluir tokens, secretos ni datos personales. El comando no autentica ni muta Auth0; la administración sigue realizándose por MCP/dashboard.

Pruebas:

```sh
cd capaServidor
npm test
# Matriz explícita de rol / acción / esperado / real:
node test/rbac.authorization.test.js
cd ../capaVista
npm test
npm run lint
npm run build
```

Resultado histórico local: suite completa backend **527/527**, frontend **76 verificaciones**, lint y build frontend correctos. Build conserva el aviso de chunk de pagos superior a 500 kB.

La matriz TAP enumera cada rol y endpoint, respuesta esperada y comprobación real. Se cubren permisos excesivos en tokens, permiso ausente con PIN correcto, PIN incorrecto, departamentos, escalamiento por payload, RNF02, roles obsoletos/múltiples, usuario desvinculado, token de rol anterior y Soporte sin scopes administrativos. Se incluyen las 48 combinaciones rol/ruta auxiliar de escritura, todas rechazadas incluso con PIN correcto, y el rechazo de mutación de mensajes ajenos según destinatario. Las pruebas frontend renderizan guards ante rutas directas y acciones de pago, y verifican AV/OV sin edición del calendario. Son pruebas de aplicación con dobles de JWT/Auth0/Prisma, no una prueba de login real en el tenant ni una prueba de navegador de extremo a extremo.

## Pendientes fuera de esta tarea de permisos

- Flujo formal de solicitud/aprobación para retirar confirmación de pago durante producción: AC solicita; AP distinto del solicitante aprueba con PIN; la solicitud sola no bloquea producción, la aprobación sí. El demo no es evidencia de implementación productiva. Las llamadas directas que necesitarían este flujo quedan cerradas.
- Movimiento automático al terminar todos los subprocesos y demás transiciones automáticas: no agregar automatismos aquí; no permitir forzarlos con `/move`.
- RNF01: invalidación de sesión dentro de cinco segundos tras logout requiere diseño adicional. Sí se valida el estado y rol interno en cada petición; no se afirma revocación instantánea de cualquier token después de logout.
- Tema 9 aprobado como pendiente: documentar y diseñar por separado las capacidades futuras; no dar permisos anticipados de reportes, estadísticas, exportaciones, estimación o buffer si no existen operaciones implementadas.
- Actualización posterior: documentos/PDF retirados por instrucción del usuario tras aportar RF01–RF75. Se conserva la vista previa JSON de pagos y el historial de negocio.
- Confirmar el documento de requisitos de la nube con las correcciones explícitas: Cobranzas, calendario con PIN, roles, RNF02 y transiciones. La copia local no se reescribió.

## Diferencias respecto del estado anterior

Antes, los permisos visuales se confundían con autorización efectiva y varios endpoints dependían solo de JWT o de PIN. Ahora los endpoints sensibles verifican capacidades; el backend limita el rol aunque su token esté sobredotado. La gestión de usuarios aplica departamento tanto a consulta como a mutación; no se usa `app_metadata` como sustituto de Roles/Permissions. Las rutas y acciones visuales consumen el mismo modelo. Soporte se conserva como superusuario técnico con controles de negocio explícitos.

El usuario confirmó que completó la configuración manual del dashboard. El objetivo completo continúa pendiente de verificar asociaciones, revisión de usuarios y validación de sesiones reales. La creación del catálogo y el despliegue de la Action no equivalen a haber asignado permisos a los roles.

## Evidencia de sesión real de Soporte

La prueba histórica de Universal Login usó el rol Soporte y no acredita la sincronización nueva ni las asociaciones actuales. No se guardan tokens ni credenciales.
