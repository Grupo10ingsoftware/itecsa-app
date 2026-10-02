# P07: contratos de lectura de pedidos

La finalidad de cada respuesta determina sus campos. Las listas de Kanban, Calendario, Historial y Pago tienen un máximo de 100 registros por página y cursor firmado. Los filtros se aplican en la consulta antes del límite. Los permisos funcionales de Auth0 no cambian.

| Vista y tarea | Campos enviados | Campos bajo demanda |
| --- | --- | --- |
| Kanban, lista y tarjeta | ID, NV, nombre mostrado del cliente, fechas de creación y entrega, etapa, estado de pago, etiquetas, ID/nombre/cantidad/fecha de productos | En `/:id/kanban-detail`, subprocesos y avance de lanyard para panel y validación de transición |
| Calendario, mes | ID, NV, nombre mostrado del cliente, entrega, etapa, etiquetas de prioridad, ID/nombre/cantidad/fecha de productos | `/:id/calendar-detail` agrega el vendedor mostrado en el modal; no entrega pago, RUT ni observaciones |
| Historial, lista | ID, NV, nombre mostrado del cliente, etapa y creación | Detalle de pedido y eventos paginados; se muestran el nombre del vendedor, el nombre del responsable y la observación del evento cuando el permiso lo permite. Sus IDs internos no se envían |
| Pago, lista | ID, NV, creación, nombre/razón social, RUT y estado de pago | Vista previa por ID con productos y vendedor para confirmar la operación |

`GET /orders`, `/orders/kanban` y `/orders/kanban-summary` comparten la proyección mínima de Kanban. `GET /orders/:id` y `/orders/:id/kanban-detail` comparten el detalle operativo reducido. Las rutas del Calendario requieren `read:production-calendar` en backend. Pago requiere `read:payments`; Historial y Kanban conservan `read:orders`. La revisión transversal del rol Soporte corresponde a P11.

No se envían RUT, correos, observaciones, actores ni snapshots comerciales en las listas de Kanban y Calendario. En Historial, los eventos de pago sólo incluyen responsable y observación con `read:payments`; los demás lectores reciben fecha, título y transición de estado. El RUT sigue en la lista de Pago porque esa interfaz lo muestra y permite buscarlo. La paginación de Pago devuelve contadores por estado calculados con los filtros de búsqueda y fecha, sin aplicar el cursor a esos contadores. Registro de Orden y Métricas mantienen sus contratos independientes.
