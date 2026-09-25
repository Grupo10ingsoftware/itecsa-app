# Registro de pedidos

## Alcance vigente

RF42–RF48: acceso de Ventas, consulta por número de Nota de Venta, información de fabricación, fecha estimada, observaciones, prioridad, confirmación del resumen y registro. La exportación de reportes de RF75 pertenece al módulo de métricas; no requiere un repositorio de PDFs de notas de venta.

`OrderCreatePage` utiliza `useOrderCreateFlow`, `SalesNoteStep`, `OrderCreateConfirmModal` y `OrderCreateSuccess`. El borrador se mantiene en estado React.

- `GET /api/orders/sales-notes/:numeroNota`: consulta datos estructurados. Actualmente usa un fixture del backend; no una conexión externa.
- `POST /api/orders`: registra el pedido en la persistencia propia.
- El resumen previo al registro se conserva en `OrderCreateConfirmModal` (RF48).
- La fecha que hoy se muestra proviene de los datos de la nota; verificar por separado el cálculo automático exigido por RF44.

## Limpieza del módulo documental

Se retiraron componentes sin conexión al flujo vigente: carga de PDF, archivos de diseño, visor PDF, modal documental y antiguo asistente de tres pasos. También se eliminaron utilidades exclusivas de esos componentes y la dependencia `pdfjs-dist`.

Esta limpieza no modifica las reglas de pedidos, los permisos de ventas ni los datos de fabricación recibidos como información estructurada. Las funcionalidades pendientes de RF no se consideran innecesarias por no estar completas.
