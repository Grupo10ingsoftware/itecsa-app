# Modulo `payments` / Cobranzas

La vista `/pagos` carga pedidos desde backend y permite gestionar su estado de pago. Cuando faltan los campos de snapshot en un detalle histórico, el preview consulta la fuente de Notas de Venta. El fixture local requiere `SALES_NOTE_SOURCE=fixture` en desarrollo/tests; sin fuente responde 503. La integración directa con Manager aún no está implementada. Buscar una nota en Cobranzas no muestra un pedido hasta que Ventas lo registre.

## Contratos backend usados

- `GET /api/orders/payments`: devuelve una página de pedidos y el catálogo de estados de pago. Acepta `limit` (1–100), `cursor`, `status`, `search`, `from` y `to`; el servidor aplica búsqueda y filtros antes de paginar. La respuesta incluye `{ items, pageInfo, counts, paymentStatuses }`, con contadores por estado calculados para la búsqueda y fechas completas, sin aplicar el cursor.
- `GET /api/orders/:orderId/payment-records/preview`: obtiene vendedor y detalle completo de productos para los modales de pago.
- `PATCH /api/orders/:orderId/payment-status`: actualiza el estado de pago del pedido con PIN y registra auditoria en `Registro_Pago`.
- `GET /api/orders/:orderId/payment-records`: consulta registros de auditoria del pedido cuando se requiera.

## Estados de pago

El catálogo observado el 26-09-2026 usa estos IDs; el cliente resuelve los valores desde la API:

- `1`: `Pendiente`
- `2`: `Confirmado`
- `3`: `Rechazado`

El frontend no debe hardcodear IDs antiguos. La vista recibe el catálogo junto con cada página de pedidos desde `GET /api/orders/payments`, ofrece «Cargar más pedidos» y resuelve el ID antes de llamar al PATCH. Operario Cobranzas solo gestiona pagos pendientes. Administrador Cobranzas y Soporte pueden cambiar una decisión entre `Confirmado` y `Rechazado`, indicando un motivo, pero ningún pago resuelto puede volver a `Pendiente`.

Confirmar un pago valida el PIN, registra auditoria y mueve la orden a `Listo para produccion`. Si un pago confirmado se rechaza mientras esta `Listo para produccion`, el pedido pasa a `Cancelado` y se notifica a Administracion de Produccion. Si la produccion ya comenzo, conserva su etapa y se notifica que debe cancelarse desde Produccion.

## Estructura relevante

```txt
payments/
├── api/
│   └── paymentsApi.js
├── components/
├── hooks/
│   └── usePaymentsApi.js
├── pages/
│   └── PaymentConfirmationPage.jsx
└── utils/
    ├── paymentDocuments.js
    └── paymentOrders.js
```

## Reglas de UI

- `read:payments` protege el acceso a la ruta.
- `update:payment-status` habilita acciones de cambio de estado.
- La vista cubre loading, error con reintento y estado vacio.
- La fecha de creación se filtra en el backend mediante un rango inclusivo `Desde` / `Hasta`; la búsqueda textual cubre RUT, Nota de Venta y cliente. Los contadores de las tarjetas corresponden a toda la búsqueda y rango de fechas, incluso cuando la lista visible tiene más páginas.
- Los modales de confirmacion y detalle usan informacion del pedido y, para detalles sin snapshot, el fixture local de NV; no dependen de PDFs.
- El backend vuelve a validar permisos y transiciones aunque la opcion no sea visible en la interfaz.

## Auditoria

El actor del PIN se toma de `req.pinActor` y se registra en `Registros.id_usuario`, vinculado al evento de `Registro_Pago`. El frontend no envia ni controla `id_usuario`. El evento guarda los IDs de estado anterior y nuevo para cambios futuros; los registros historicos pueden carecer del anterior.

## Concurrencia y errores

La decisión se toma tras bloquear `Pedidos` con `SELECT ... FOR UPDATE` y releer el estado dentro de la transacción. Un destino ya alcanzado devuelve el pedido sin nueva auditoría; una decisión concurrente distinta genera 409. Estado, registro y avisos se escriben en la misma unidad transaccional real. Las pruebas con dobles no acreditan locks o rollback físico: seguir la [validación MySQL aislada](../operacion/PAYMENTS_SOLICITUD_BD.md).

Los controladores propios de Payments conservan errores 4xx y devuelven 500 genéricos con referencia. El diálogo limpia el PIN tras el intento y se desmonta al cerrar o cambiar de pedido; consultar las [suites vigentes](../desarrollo/PRUEBAS.md). Las pruebas de escritura requieren una base MySQL desechable y aislada.

## Límites y pendientes

- La revisión requiere `revise:payment-status` y motivo; un estado resuelto no vuelve a Pendiente. Rechazado → Confirmado todavía puede forzar Listo para producción: la matriz pago × etapa requiere decisión de negocio (PAY-ACT-004).
- La lectura de auditoría de pagos y el historial general siguen usando `read:orders`; la política de visibilidad de actor y motivo está pendiente (PAY-ACT-007).
- No se inventa el estado anterior de registros históricos NULL. La escritura prospectiva necesita validación real (PAY-ACT-003).
- La fuente histórica, identidad de líneas e integración Manager siguen bloqueadas por contrato y esquema (PAY-ACT-006).

El seguimiento completo PAY-ACT-001 a PAY-ACT-009 está en [PENDIENTES.md](../PENDIENTES.md). La [auditoría inicial](../archivo/auditorias/PAYMENTS_AUDITORIA_PLAN_ACCION.md) y el [informe de implementación](../archivo/implementaciones/PAYMENTS_IMPLEMENTACION_ESTADO.md) son evidencia histórica.
