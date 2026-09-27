# Referencia API

Prefijo local: `http://localhost:3000/api`. Fuente: [montaje del servidor](../../capaServidor/src/server.js), routers de cada módulo y [catálogo compartido](../../shared/authorization.js). Las guías de [Orders](../modulos/ORDERS.md) y [Payments](../modulos/PAYMENTS.md) desarrollan sus reglas.

## Controles comunes

Salvo recuperación pública de contraseña y health, las rutas requieren bearer JWT válido, usuario interno activo y un rol reconocido único. Una capacidad debe figurar en el token y estar concedida al rol por el catálogo. Los endpoints aplican además pertenencia, departamento, estado y PIN donde corresponde.

Ausencia/token inválido: 401; capacidad o contexto denegado: 403; recurso inexistente: 404; conflictos de negocio/concurrencia: 409. Los helpers de Orders y Payments conservan 4xx y devuelven 5xx genéricos con referencia. No asumir un formato uniforme para todas las rutas de la API.

## Autenticación y administración

| Método y ruta | Capacidad / condición |
| --- | --- |
| GET `/auth/verify`, `/auth/profile` | `read:own-profile`, identidad propia |
| POST `/auth/password-reset/request` | Público, límite en memoria por IP+correo |
| POST `/auth/pin/reveal`, `/auth/pin/acknowledge` | `manage:own-pin`, usuario propio |
| POST `/auth/pin-recovery/request`, `/auth/pin-recovery/confirm` | `manage:own-pin`, reglas de recuperación |
| POST `/auth/pin/debug-reset` | `manage:own-pin`, Soporte, `NODE_ENV=development` |
| GET `/admin/users`, `/admin/users/summary`, `/admin/users/:userId/movements` | `manage:users`, administrador/Soporte y alcance departamental |
| POST `/admin/users`, `/admin/users/password-setup-email` | Mismo alcance administrativo |
| PATCH `/admin/users/:userId`, `/admin/users/:userId/status` | Mismo alcance, PIN; restricciones de autoedición/desvinculación |

`userId` en las rutas administrativas es el identificador Auth0 del usuario; codificarlo al construir la URL. El listado acepta `page`, `perPage`, `search`, `estadoUsuario` y `rolUsuario`. Movimientos acepta paginación. Los filtros no amplían el alcance departamental.

`POST /auth/password-reset/request` acepta `{ "email": "usuario@example.test" }` y devuelve `status` (`not_registered`, `disabled` o `sent`) y `message`. El detalle del flujo y sus límites está en [Auth0](../auth0/README.md).

`POST /admin/users` acepta JSON, sin `FormData` ni archivos:

```json
{
  "nombreUsuario": "Ana",
  "apellidoUsuario": "Pérez",
  "rutUsuario": "12.345.678-5",
  "correoUsuario": "usuario@example.test",
  "rolUsuario": "Operario Ventas"
}
```

El alta responde 201 con identificación y datos internos, rol técnico oficial y `passwordSetupEmailRequested`. Puede incluir `recoverable: true` si la cuenta externa fue creada pero quedó una etapa posterior incompleta; no reintentar la creación sin revisar ese resultado. Edición recibe nombre, apellido, correo, rol y `pin`; cambio de estado recibe `estadoUsuario` y `pin`. El reenvío recibe solo `correoUsuario` y se limita a usuarios gestionables.

## Pedidos y producción

| Método y ruta | Capacidad / condición |
| --- | --- |
| GET `/orders`, `/orders/kanban`, `/orders/:orderId` | `read:orders`; `/kanban` es alias de lista |
| GET `/orders/sales-notes/:numeroNota` | `read:sales-notes` |
| POST `/orders` | `create:orders`; fuente recuperada en servidor |
| PATCH `/orders/:orderId/move` | `move:orders`, PIN; inicio añade `start:production` |
| PATCH `/orders/:orderId/review` | `review:orders`, estado y motivo |
| PATCH `/orders/:orderId/cancel-production` | `cancel:orders`, PIN y motivo |
| PATCH `/orders/:orderId/reevaluate` | `reevaluate:orders`, estado En revisión |
| PATCH `/orders/:orderId/labels` | `manage:order-tags` |
| PATCH `/orders/:orderId/delivery-date` | `update:order-delivery-date`, PIN y reglas de fecha |
| PATCH `/orders/:orderId/details/:detailId/subprocesses/:subprocessId/complete` | `update:production-subprocesses`, PIN, pertenencia, producción y pago confirmado |
| PATCH misma ruta terminada en `/rollback` | `rollback:production-subprocesses`, PIN, último paso y motivo |
| GET `/orders/:orderId/details`, `/orders/:orderId/details/:detailId` | `read:orders`, pertenencia al pedido |
| GET `/order-status` | `read:orders` |

Cuerpo de alta utilizado por la SPA:

```json
{
  "numeroNota": "NV-2026-3001",
  "observacionInterna": "Observación del equipo",
  "priority": null
}
```

La prioridad admite `null`, `urgent` o `contract`; la observación interna admite hasta 300 caracteres. El servidor valida y vuelve a recuperar la NV. Cliente, productos, estados y actor del cuerpo heredado no son autoridad. No se permite alta sin NV. Responde 201 con el pedido hidratado; una NV duplicada genera 409. Los alias se normalizan y la garantía concurrente requiere el índice único físico.

Movimiento recibe `generalStepId` y `pin`. Los movimientos manuales permitidos son Listo para producción → En producción y Listo para entrega → Entregado; no se fuerzan transiciones automáticas. Devuelve campos reducidos de etapa, que el frontend combina con la tarjeta existente.

## Payments

| Método y ruta | Capacidad / condición |
| --- | --- |
| GET `/orders/payments` | `read:payments`; devuelve `{ orders, paymentStatuses }` |
| GET `/orders/:orderId/payment-records/preview` | `read:payments`; preview JSON, sin PDF |
| PATCH `/orders/:orderId/payment-status` | `update:payment-status`, PIN; revisión añade `revise:payment-status` y motivo |
| GET `/orders/:orderId/payment-records`, `/orders/:orderId/payment-records/:paymentRecordId` | `read:orders`, pertenencia al pedido |
| GET `/payment-status`, `/payment-status/:id` | `read:payments` |

El PATCH recibe `paymentStatusId`, `observacion` y `pin`. El frontend resuelve el ID desde el catálogo del workspace; no envía el actor. El catálogo observado en septiembre de 2026 tiene Pendiente (1), Confirmado (2) y Rechazado (3). Consultar [Payments](../modulos/PAYMENTS.md) para revisiones, idempotencia, historial y efectos productivos.

## Otros módulos

| Método y ruta | Capacidad / condición |
| --- | --- |
| GET `/clients/rut/:rutCliente`, `/clients/:clientId` | `read:sales-notes` |
| GET `/products`, `/products/name/:nombreProducto`, `/products/:productTypeId` | `read:orders` |
| GET `/production-capacity` | `read:production-capacity` |
| PATCH `/production-capacity` | `manage:production-capacity` |
| GET `/production-load/today` | `read:production-capacity` |
| PATCH `/production-load/today` | `manage:production-load` o `manage:production-capacity` |
| POST `/production-calendar/operational-load` | `read:production-calendar`; cálculo sobre cuerpo recibido, sin persistencia |
| GET `/history/orders`, `/history/orders/:orderId` | `read:orders`; también puede incluir eventos de pago |
| GET `/messages`, `/messages/notifications`, `/messages/:messageId` | `read:own-messages`; destinatario autenticado |
| PATCH `/messages/notifications`, `/messages/notifications/:messageId`, `/messages/:messageId/read` | `update:own-messages`; destinatario autenticado |
| GET `/metrics/summary` | `view:metrics` |
| GET `/health/live`, `/health/db` | Públicos; estado de proceso/versión y consulta de conexión respectivamente |

Los POST directos de clientes, productos, estados, detalles y registros de pago se deniegan con 403 tras autenticación; usar las operaciones de negocio. El alias raíz `/order-details` está montado, pero no aporta `orderId`: no sustituye las rutas anidadas documentadas.

`/demo-orders/*` es una herramienta separada para Soporte con almacenamiento demo y controles de capacidad/PIN; no representa aprobaciones del flujo real. El módulo `/documents/*` ya no se monta. Los endpoints antiguos de firmas o evidencia PDF no forman parte de la integración vigente.
