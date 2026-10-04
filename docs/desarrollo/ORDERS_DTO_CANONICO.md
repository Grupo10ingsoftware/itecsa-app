# Contratos canónicos de pedidos por módulo

La API traduce los nombres internos de Prisma/MySQL a contratos HTTP en `camelCase`. No existe un DTO monolítico: cada pantalla recibe solo los datos que necesita, mientras la paginación y las consultas mínimas de P07 se conservan.

| Módulo | Lectura | Contrato |
| --- | --- | --- |
| Kanban | `GET /api/orders/kanban-summary` | `KanbanOrderSummaryDTO` paginado: identificación, cliente, etapa, pago, etiquetas, fechas e items resumidos |
| Detalle Kanban | `GET /api/orders/:id/kanban-detail` | `KanbanOrderDetailDTO`: resumen más vendedor, comentarios agrupados y progreso productivo |
| Calendario | `GET /api/orders/calendar-summary` | `CalendarOrderSummaryDTO` paginado: identificación, cliente, fecha, etapa, etiquetas e items |
| Detalle Calendario | `GET /api/orders/:id/calendar-detail` | `CalendarOrderDetailDTO`: resumen más responsable de origen |
| Cobranzas | `GET /api/orders/payments` | `PaymentOrderDTO` paginado, contadores y catálogo `PaymentStatusDTO` |
| Registro | `POST /api/orders` | `OrderCreatedDTO`: `id` y `salesNoteNumber` |

Las mutaciones usan respuestas explícitas: movimiento de etapa devuelve `OrderStagePatchDTO`, edición de etiquetas devuelve `OrderLabelsPatchDTO`, las acciones productivas devuelven detalle Kanban y el cambio de fecha devuelve detalle Calendario.

## Reglas

- Los repositorios y servicios conservan la forma interna basada en columnas persistidas.
- `capaServidor/src/modules/orders/dto/order.dto.js` es la única frontera que traduce esos nombres.
- Cada adaptador API del frontend valida el contrato de su módulo antes de entregar datos a la vista.
- El frontend no rescata respuestas antiguas mediante aliases silenciosos.
- Las listas mantienen `{ items, pageInfo }`; Cobranzas agrega `counts` y `paymentStatuses`.
- La fuente de Nota de Venta y el preview de pago son contratos separados.
- Las etiquetas siempre usan `{ id, name }`; no se aceptan nombres internos de base de datos en las vistas.
- Los comentarios del detalle usan `{ id, text, createdAt, subprocessName? }` y los grupos `all`, `source`, `subprocesses` y `system`. Solo se consultan en el detalle autorizado; no incluyen correo, RUT ni identidad del autor.
- `manufacturingDetails` es un contrato nullable y provisorio con `width`, `length`, `tapeTexture`, `backgroundColor`, `reverseLegend`, `frontLegend`, `endings` y `cardType`. Mientras la fuente corporativa no entregue esos datos se responde `null` y la interfaz muestra “No definido”, sin fabricar valores.
- Los estados de pago usan `{ id, name }`; los nombres internos de Prisma quedan detrás de la frontera del backend.

Esta separación evita sobreexponer campos, mantiene las consultas optimizadas de P07 y permite evolucionar un módulo sin obligar a Kanban, Calendario y Cobranzas a cargar o validar la misma estructura completa.
