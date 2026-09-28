# Registro de pedidos

## Alcance vigente

RF42–RF48: acceso de Ventas, consulta por número de Nota de Venta, información de fabricación, fecha estimada, observaciones, prioridad, confirmación del resumen y registro. La exportación de reportes de RF75 pertenece al módulo de métricas; no requiere un repositorio de PDFs de notas de venta.

`OrderCreatePage` utiliza `useOrderCreateFlow`, `SalesNoteStep`, `OrderCreateConfirmModal` y `OrderCreateSuccess`. El borrador se mantiene en estado React.

- `GET /api/orders/sales-notes/:numeroNota`: consulta datos estructurados. Actualmente usa un fixture del backend; no una conexión externa.
- `POST /api/orders`: recibe `numeroNota`, `priority` (`null`, `urgent` o `contract`) y `observacionInterna` (hasta 300 caracteres). El servidor recupera nuevamente la nota y valida sus datos antes de escribir. Los campos comerciales heredados del cuerpo se ignoran durante la compatibilidad; no son autoridad. El alta manual sin NV responde 400.
- El resumen previo al registro se conserva en `OrderCreateConfirmModal` (RF48).
- La fecha que se muestra proviene de la nota. La fecha productiva persistida queda sin asignar hasta su programación autorizada en Calendario; este cambio conserva ese comportamiento. El cumplimiento completo de RF44 requiere revisión separada.

## Autoridad, persistencia y privacidad

JWT, identidad interna activa y capabilities siguen siendo obligatorios. El actor
se obtiene de `req.currentUser`, nunca del cuerpo. Las rutas requieren
`read:sales-notes` y `create:orders`, respectivamente.

`OrderService` delega en `SalesOrderCreationService`. La creación utiliza una unidad
transaccional explícita; inyectar una fuente no elimina `$transaction`. Cliente,
pedido, etiquetas, detalles, artículos sin seguimiento, evento inicial, apertura
de etapa y notificaciones se escriben mediante el mismo cliente transaccional.
Los estados iniciales siguen siendo pedido 1 y pago 1.

Las cantidades productivas y de artículos sin seguimiento deben ser enteros
positivos, sin convertir booleanos, cadenas o nulos. Las notas del fixture actual
se verifican contra ese contrato. También se validan longitudes del schema, fecha
de origen y tipos productivos soportados.

La NV es globalmente única según confirmación del responsable del producto. Los
alias `NV-AAAA-numero` se resuelven al número canónico de la fuente. La garantía
concurrente requiere el índice único preparado; el chequeo previo no basta.

Con el esquema completo, cada detalle nuevo conserva código, descripción, familia y subfamilia comerciales,
con hash de snapshot y ordinal. No se presume que un ordinal identifica la misma
línea entre versiones. La lectura conserva el tipo productivo existente y expone
los datos comerciales por separado. Cobranzas prefiere el snapshot y conserva su
fallback para históricos. Reevaluación actualiza esos campos al cambiar ítems;
su algoritmo productivo por posición sigue pendiente de auditoría transversal.

La consulta de Ventas expone solo RUT y nombre del cliente. Dirección, comuna,
ciudad y tipo de cliente no viajan a esta pantalla. Los errores inesperados se
devuelven genéricamente, con referencia de correlación; no se registran cuerpos,
SQL, tokens ni mensajes internos de dependencias.

## Interfaz y pruebas

Cancelar, editar o desmontar invalida respuestas de búsqueda antiguas. Confirmar
captura un payload mínimo y evita reentradas; cerrar o reiniciar durante el POST
está bloqueado. El diálogo administra foco y teclado, y la observación tiene una
etiqueta programática. Las pruebas de hooks usan scheduler controlado y las de
markup usan SSR; no equivalen a una certificación de accesibilidad en navegador.

- Backend: `node --test` desde `capaServidor`.
- Frontend: `npm test`, `npm run build` desde `capaVista`.
- Lint acotado: `npx --no-install eslint src/modules/orders src/hooks/useOrderCreateFlow.js src/config/requirementsMap.js test/orders.cases.jsx`.
- Procedimiento obligatorio antes del despliegue: [migración](../operacion/ORDERS_MIGRACION.md).

El código comprueba las cinco columnas de snapshot y omite sus campos cuando faltan, según [orderSnapshotSchema.js](../../capaServidor/src/modules/orders/repo/orderSnapshotSchema.js). El modo compatible permite operar con el esquema antiguo, pero no guarda nuevos snapshots ni sustituye el índice único de NV. Tras aplicar el DDL revisado, reiniciar el backend para volver a detectar el esquema completo. No considerar lista para producción la integridad de Orders sin reconciliar y validar la migración. Manager, concurrencia/rollback MySQL y Auth0 desplegado requieren su entorno.

## Limpieza del módulo documental

Se retiraron componentes sin conexión al flujo vigente: carga de PDF, archivos de diseño, visor PDF, modal documental y antiguo asistente de tres pasos. También se eliminaron utilidades exclusivas de esos componentes y la dependencia `pdfjs-dist`.

Esta limpieza no modifica las reglas de pedidos, los permisos de ventas ni los datos de fabricación recibidos como información estructurada. Las funcionalidades pendientes de RF no se consideran innecesarias por no estar completas.

## Referencias y pendientes

Consultar [API](../desarrollo/API.md), [pruebas](../desarrollo/PRUEBAS.md) y [pendientes](../PENDIENTES.md) para DB-01, DATA-02 / OBS-ORD-002, INT-01, rendimiento y RF44. La [implementación](../archivo/implementaciones/ORDERS_IMPLEMENTACION.md) y la [reauditoría](../archivo/auditorias/ORDERS_REAUDITORIA_2026-09-26.md) conservan la evidencia histórica.
