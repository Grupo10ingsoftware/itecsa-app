# DTO canonico de pedidos

Este documento fija el contrato HTTP de los pedidos operacionales. Los nombres de columnas Prisma/MySQL siguen siendo internos y pueden estar en `snake_case`; no forman parte de la API. Los contratos de nota de venta (`/orders/sales-notes/:numeroNota`) y cobranzas (`/orders/payments`) son distintos y no se mezclan con `OrderDTO`.

## Matriz de consumidores

| Consumidor | Metodo y endpoint | Campos enviados | Campos leidos / respuesta | Adaptacion | Pruebas |
| --- | --- | --- | --- | --- | --- |
| Kanban | `GET /api/orders` | Ninguno | `OrderDTO[]`: identificacion, cliente, productos, etapa, pago, etiquetas, fechas, comentarios y subprocesos | Valida `OrderDTO`; deriva solamente indicadores visuales y dias habiles | `orderDto.test.mjs`, build y lint frontend |
| Movimiento Kanban | `PATCH /api/orders/:id/move` | `generalStepId`, `pin`, `comment` | `OrderStagePatchDTO` | Aplica `id`, `orderStatusId`, `generalStepId`, `orderStatus` | `orderStagePatch.test.mjs`, `kanban.routes.test.js` |
| Acciones Kanban | `PATCH` de review, cancelacion, reevaluacion, completar y revertir subproceso | Comentario y/o PIN segun operacion | `OrderDTO` | Reemplaza la orden usando el mismo adaptador canonico | `orderDto.test.mjs` y suites de transiciones |
| Etiquetas Kanban | `PATCH /api/orders/:id/labels` | `label`, `active` | `OrderLabelsPatchDTO` | Usa exclusivamente `labels: { id, name }[]` | `orderDto.test.js`, `orderDto.test.mjs` |
| Calendario | `GET /api/orders` | Ninguno | `OrderDTO[]` | Usa `salesNoteNumber`, `items`, `labels`, `generalStepId` y `dueDate`; deriva estado visual | `orderDto.test.mjs`, build y lint frontend |
| Cambio de fecha | `PATCH /api/orders/:id/delivery-date` | `dueDate`, `pin` | `OrderDTO` | Reemplaza la orden calendarizada con la respuesta canonica | Suites de creacion/transiciones y build frontend |
| Registro de orden | `POST /api/orders` | `numeroNota`, `priority`, `observacionInterna` | `OrderDTO` | Valida la respuesta; la pantalla solo usa su existencia para mostrar exito | `orderCreateFlow.test.mjs`, `salesOrderCreation.service.test.js`, `salesOrderIntegrity.test.js` |
| Detalle | `GET /api/orders/:id` | Ninguno | `OrderDTO`, incluyendo observaciones cuando corresponda | Sin alias HTTP | `orderDto.test.js` |
| Cobranzas | `GET /api/orders/payments`, `PATCH /api/orders/:id/payment-status` | `paymentStatusId`, `observacion`, `pin` en el PATCH | `PaymentOrderDTO` liviano y catalogo de estados | Consume solo nombres canonicos; el preview mantiene su contrato separado | `orderDto.test.js`, `paymentOrderDto.test.mjs`, suites de pagos |

## Respuestas compartidas

`GET /api/orders`, `GET /api/orders/:id`, `POST /api/orders` y las mutaciones que devuelven la orden completa pasan por `toOrderDTO`. El movimiento de etapa y la edicion de etiquetas usan DTO parciales explicitos. El workspace y la actualizacion de pago pasan por `toPaymentOrderDTO`, porque Cobranzas necesita una proyeccion liviana y no una orden productiva completa.

## Contrato `OrderDTO`

| Campo | Significado |
| --- | --- |
| `id` | Identificador interno del pedido |
| `salesNoteNumber` | Numero de Nota de Venta que origino el pedido |
| `createdAt`, `dueDate` | Creacion y fecha comprometida de termino |
| `clientId`, `clientName`, `clientRut`, `clientBusinessName` | Identidad del cliente |
| `responsibleUserId` | Usuario interno responsable del pedido |
| `sourceManagerUser` | Usuario Manager informado por la fuente; no se renombra como vendedor porque ese significado no esta garantizado |
| `product`, `productDescription`, `quantity` | Resumen agregado de los detalles |
| `items` | Detalles productivos canonicos |
| `generalStepId`, `orderStatusId`, `orderStatus` | Posicion Kanban, identificador persistido y nombre del estado |
| `paymentStatusId`, `paymentStatus` | Identificador y nombre del estado de pago |
| `labels` | Etiquetas como objetos `{ id, name }` |
| `untrackedItems` | Articulos comerciales que no generan seguimiento productivo |
| `comments`, `commentGroups` | Comentarios normalizados y agrupados |
| `sourceObservation`, `internalObservation` | Campos opcionales del detalle individual |

Cada elemento de `items` usa `id`, `productTypeId`, `product`, `productDescription`, `quantity`, `dueDate`, `completedAt`, `subprocessStateId`, `subprocessStatus`, `source`, `manufacturingDetails`, `lanyardProgress` y `subProcesses`.

## Contrato `PaymentOrderDTO`

Cobranzas recibe `id`, `salesNoteNumber`, `createdAt`, `clientName`, `clientBusinessName`, `clientRut`, `generalStepId`, `orderStatusId`, `orderStatus`, `paymentStatusId` y `paymentStatus`. Los productos y el correo del vendedor se obtienen desde el preview de pago solamente cuando la interfaz los necesita.

## Regla de compatibilidad

La traduccion desde columnas Prisma/MySQL ocurre una sola vez en `capaServidor/src/modules/orders/dto/order.dto.js`. El repositorio y los servicios usan una unica forma interna basada en los nombres persistidos; no fabrican copias `camelCase`. El mapper acepta solamente esa forma interna y la API publica solamente nombres canonicos. El frontend valida los contratos y rechaza respuestas legacy en vez de ocultarlas mediante fallbacks silenciosos.

El alta acepta `observacionInterna` y rechaza expresamente el alias historico `observacion_interna`. Las traducciones de `salesNoteSource.service.js` no son aliases del DTO de Orders: forman el adaptador del proveedor temporal y siguen siendo necesarias porque el JSON vigente entrega campos como `RUT`, `CLIENTE`, `dir`, `usuarioOrigenManager` y `tipoNotaVentaOrigen`.

Este cambio no requiere migracion de datos ni cambio de esquema: estandariza el limite HTTP, no las columnas persistidas.
