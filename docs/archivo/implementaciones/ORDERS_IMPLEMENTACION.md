> **Informe histórico archivado.** Contexto: rama opt-ventas; fase previa a la reauditoría del 26-09-2026.
> Ubicación original: `docs/ORDERS_IMPLEMENTACION.md`. El contenido y sus referencias originales se conservan como evidencia de esa revisión; no acreditan el estado actual.
> Consultar la [referencia vigente](../../modulos/ORDERS.md), los [pendientes](../../PENDIENTES.md) y el [índice del archivo](../README.md).

# Implementación Orders / Ventas — rama `opt-ventas`

El proyecto comenzó con el árbol Git limpio en `opt-ventas`. Este documento
registra los cambios de la fase autorizada y sus límites. No se cambió de rama,
no se hizo push y no se aplicó SQL a una base de datos.

## A. Cambios implementados

| Acción | Archivos principales | Resultado |
|---|---|---|
| A00 | Tests backend/frontend de Orders | Baseline y casos negativos reproducibles; ejecución integrada HTTP con autorización simulada y doble de base transaccional. |
| A01 | `salesOrderCreation.service.js`, `salesOrder.validator.js`, `order.service.js`, `useOrderCreateFlow.js` | POST mínimo; servidor recupera y valida la fuente; cuerpo no controla cliente, productos, observaciones de origen, estados ni actor. Se mantiene ignorancia temporal de campos comerciales heredados para compatibilidad, y se rechaza el alta sin NV. |
| A02 | `salesNoteSource.service.js` (normalizador existente), validador, servicio de creación, schema y migración preparada | Alias `NV-AAAA-numero` se almacenan con identidad canónica. Restricción única global preparada con autorización explícita del responsable del producto. Los P2002 de la NV se convierten en 409; los de otras claves no se confunden. |
| A03 | `salesOrder.errors.js`, controlador | Errores de dominio controlados; 500 inesperados genéricos con referencia. El registro interno contiene solo evento y referencia. |
| A04 | `salesOrder.snapshot.js`, servicio, repositorios, schema y adaptador de lectura de Cobranzas | Dos SKU del mismo tipo conservan identidad, código y descripción. Cobranzas usa snapshot cuando existe; conserva fallback histórico. Reevaluación refresca metadata de los ítems que ya modifica. |
| A05 | `orders.repo.js`, servicio de creación | Evento inicial y apertura de etapa se escriben con el mismo cliente de transacción que el pedido. |
| A06 | `useOrderCreateFlow.js`, página y modal | Respuestas tardías se ignoran al editar, cancelar o desmontar; confirmación captura un cuerpo inmutable y evita envío doble/cierre durante POST. |
| A07 | `salesOrder.transaction.js`, servicio de creación y fachada `OrderService` | La creación de Ventas usa una unidad transaccional explícita aunque se inyecte la fuente. Los otros métodos compartidos conservan su coordinación anterior. |
| A08 | `OrderDetail.jsx`, su CSS y `orderCreate.mock.js` | Se retiraron los tres residuos confirmados que aún existían. El borrador activo pasó al hook. Los 20 archivos antiguos de PDF/asistente y `pdfjs-dist` ya habían sido retirados antes de esta fase. |
| A09 | Controlador y servicio de creación | Se reutiliza `req.currentUser.idUsuario`, verificado por el middleware. Un test muestra 1 consulta adicional del actor antes y 0 después en el POST HTTP normal. No se redujo la respuesta para preservar consumidores desconocidos. |
| A10 | Modal, página, `SalesNoteStep` | Foco inicial, restauración, Tab/Shift+Tab, Escape y `inert`; campo de observación con etiqueta programática. |
| A11 | README raíz, arquitectura, README de Orders, mapa de requisitos, procedimiento de migración | Se documentaron contrato actual, fixture, límites y orden de despliegue. |
| A12 | Tests y comprobaciones finales | 643 tests backend, 14 tests Node frontend más 106 verificaciones SSR, build y lint acotado aprobados. |

Se conservó el comportamiento incorporado al repositorio entre auditoría e
implementación: fecha productiva inicialmente sin asignar y avisos a Cobranzas
y Producción. La edición necesaria en Payments está limitada a transportar y
leer snapshots comerciales de Orders; no cambia la lógica de pagos.

## B. Cambios no implementados

- Aplicación de migración, backfill y consulta de datos reales: requieren el
  [procedimiento](ORDERS_MIGRACION.md), inventario de colisiones y autorización
  propia del entorno. El código nuevo depende del DDL; no desplegar antes.
- Rechazo estricto de campos comerciales heredados del POST: primero debe
  completarse la transición de clientes; hoy se ignoran de forma segura.
- Reducción de la respuesta hidratada del POST: faltan inventario de clientes
  externos y medición de consultas/bytes para preservar compatibilidad.
- Integración real con Manager, pruebas en MySQL y Auth0 desplegados y prueba
  manual de navegador/tecnologías de asistencia: entornos no disponibles en
  esta sesión. Los dobles no prueban semántica física de locks y rollback.
- Corrección del emparejamiento productivo por posición de la reevaluación:
  **HALLAZGO TRANSVERSAL PENDIENTE** para Kanban/Producción, OBS-ORD-002.

## C. Archivos modificados; D. creados; E. eliminados

El inventario exhaustivo, generado desde `git status --porcelain`, figura al
final. Los archivos eliminados carecían de entrada en el grafo actual, se
reconfirmaron imports/rutas/tests/referencias y no incluyen tablas ni archivos
de otro módulo. `DEFAULT_ORDER_DRAFT` se trasladó antes de retirar el mock.

## F. Base de datos

- **Schema:** `Pedidos.numero_nota_venta` declara unicidad; `Detalle_pedido`
  incorpora cinco campos nullable de snapshot.
- **Migración local preparada:**
  `capaServidor/prisma/migrations/202609260001_orders_integrity/migration.sql`,
  DDL aditivo para columnas e índice. No contiene DROP/DELETE/TRUNCATE.
- **Migración ejecutada:** ninguna. No hubo conexión a BD. `prisma validate`
  pasó y `prisma generate` actualizó solo el cliente local ignorado por Git.
- **Precondición de despliegue:** inspeccionar esquema físico, triggers,
  catálogos y colisiones por identidad canónica; resolver cada conflicto de
  datos y ejecutar en BD desechable antes de un entorno compartido.

## G. Tests y comprobaciones

| Momento / comando | Resultado |
|---|---|
| Baseline `node --test --test-reporter=spec test/salesOrderCreation.service.test.js test/orders.routes.test.js test/rbac.authorization.test.js` | 362 aprobadas, 0 fallos. |
| Baseline `npm.cmd test` en `capaVista` | 99 verificaciones SSR y 8 tests Node aprobados. |
| Baseline `npm.cmd run build` en `capaVista` | Aprobado: 493 módulos transformados. |
| Baseline `npm.cmd run lint` en `capaVista` | Ya fallaba con 6 errores y 1 aviso en Kanban/Métricas, fuera del alcance. |
| Final `node --test --test-reporter=spec` en `capaServidor` | 643 aprobadas, 0 fallos, 0 omitidas. Incluye 40 casos nuevos en dos archivos de Orders. |
| Final `npm.cmd test` en `capaVista` | 106 verificaciones SSR y 14 tests Node aprobados. |
| Final `eslint` acotado a Orders, hook, mapa y caso SSR | Aprobado, 0 errores/avisos. |
| Final `npm.cmd run build` | Aprobado: 492 módulos transformados. |
| `prisma.cmd validate`; `prisma.cmd generate`; `git diff --check` | Aprobados. |

El test HTTP usa un autenticador simulado; los tests transaccionales emplean un
adaptador en memoria y comprueban propagación y rollback del doble. Ninguno
representa una conexión real a MySQL ni a Auth0.

## H. Optimizaciones

La única reducción comprobada dentro del POST es la búsqueda repetida del actor:
antes 1 lookup adicional en el servicio, después 0 cuando el middleware ya
entregó `req.currentUser`. El test conserva el fallback de resolución por token
para invocaciones internas. No se midió latencia representativa. El chunk de
`OrderCreatePage` pasó de 20,75 a 22,06 kB sin comprimir tras añadir el control
funcional; no se presenta la limpieza de archivos inalcanzables como reducción
del bundle. La caché existente por tipo sigue cubierta por pruebas.

## I. Nuevos hallazgos durante implementación

- **Bloqueante resuelto:** la auditoría reflejaba componentes PDF y dependencia
  `pdfjs-dist` que ya estaban retirados en el commit inicial de esta sesión.
  Se revisó el grafo actual y solo se retiraron tres residuos aún presentes.
- **Bloqueante resuelto:** el nuevo snapshot podía quedar obsoleto durante la
  reevaluación compartida. Se refrescan sus campos para los ítems que esa
  operación actualiza o agrega; el algoritmo posicional continúa pendiente.
- **Pendiente:** la fuente puede cambiar entre vista previa y creación. El POST
  siempre utiliza la versión vigente; una integración futura con Manager deberá
  definir si la confirmación exige versión o aviso de diferencias.
- **Fuera de alcance:** los 6 errores y 1 aviso previos del lint global en
  Kanban/Métricas, y la correspondencia productiva de reevaluación.

## J. Riesgos residuales

1. El backend con nuevos campos no debe desplegarse antes del DDL. El índice
   único no protege una BD hasta que se aplique la migración tras el preflight.
2. Duplicados o alias históricos podrían impedir el índice. No hubo backfill.
3. No se verificaron catálogo inicial, triggers, concurrencia ni rollback contra
   MySQL real. El evento inicial podría duplicarse si existen triggers externos.
4. La retirada de la creación manual sin NV puede afectar clientes externos no
   inventariados. El frontend propio ya envía el contrato nuevo.
5. El diálogo tiene implementación y tests de markup/handlers; falta prueba
   manual de teclado y lector de pantalla en navegador real.
6. El método compartido antiguo `OrderService.runInTransaction` mantiene su
   política de inyección para flujos ajenos a esta creación; no se extendió el
   refactor a pagos, Kanban o producción.

## K. Estado Git

Rama `opt-ventas`. Este informe forma parte del commit local de la implementación.
No se cambió de rama ni se hizo merge, rebase o push. El árbol estaba limpio
antes de esta fase. El inventario abajo representa sus archivos.

## L. Trazabilidad

| Hallazgo | Acción / cambio | Prueba / resultado |
|---|---|---|
| SEC-ORD-001 | A01, fuente autoritativa y POST mínimo | Manipulación de cuerpo y HTTP integrado: aprobado |
| SEC-ORD-002 | A03, errores controlados | Error interno oculto y dominio preservado: aprobado |
| PRIV-ORD-001 | A01, preview mínimo | Dirección excluida; fuente interna intacta: aprobado |
| FUNC-ORD-001 | A06, vigencia de solicitudes y snapshot de confirmación | Carreras/cancelación/doble envío: aprobado |
| FUNC-ORD-002 | A01, validación estricta | Casos límite y 60 notas actuales: aprobado |
| DATA-ORD-001 | A02, canonización e índice preparado | Alias y P2002 simulado: aprobado; garantía física pendiente de migración |
| DATA-ORD-002 | A04, snapshot y lectura | Dos SKU de mismo tipo, releída, Cobranzas y reevaluación: aprobado; BD real pendiente |
| DATA-ORD-003 | A05, evento/etapa inicial | Persistencia simulada y fallo intermedio: aprobado; triggers reales pendientes |
| ARCH-ORD-001 | A07, unidad transaccional de creación | Inyección no evita `$transaction`: aprobado |
| PERF-ORD-001 | A09, actor del middleware | Lookup adicional 1 → 0; latencia no medida |
| QUAL-ORD-001 | A10, foco y etiqueta | SSR y lógica de handlers: aprobado; prueba manual pendiente |
| DEAD-ORD-001 | A08, tres archivos restantes | Build y búsqueda de referencias: aprobado |
| TEST-ORD-001 | A00/A12, nuevos casos | Suites descritas en G: aprobadas |
| DOC-ORD-001 | A11, documentación y requisitos | Contraste con código y rutas: revisado |
| OBS-ORD-001 | A11, fuente fixture declarada | 60 notas actuales validadas |
| OBS-ORD-002 | A04/A12, metadata sincronizada | Test aprobado; auditoría productiva transversal pendiente |

## Inventario exhaustivo de archivos

### Modificados (20)

- [README.md](../README.md)
- [capaServidor/prisma/schema.prisma](../capaServidor/prisma/schema.prisma)
- [capaServidor/src/modules/orders/controller/orders.controller.js](../capaServidor/src/modules/orders/controller/orders.controller.js)
- [capaServidor/src/modules/orders/repo/orderDetail.repo.js](../capaServidor/src/modules/orders/repo/orderDetail.repo.js)
- [capaServidor/src/modules/orders/repo/orders.repo.js](../capaServidor/src/modules/orders/repo/orders.repo.js)
- [capaServidor/src/modules/orders/service/order.service.js](../capaServidor/src/modules/orders/service/order.service.js)
- [capaServidor/src/modules/orders/service/orderDetail.service.js](../capaServidor/src/modules/orders/service/orderDetail.service.js)
- [capaServidor/src/modules/payments/repo/paymentRecord.repo.js](../capaServidor/src/modules/payments/repo/paymentRecord.repo.js)
- [capaServidor/src/modules/payments/service/paymentRecord.service.js](../capaServidor/src/modules/payments/service/paymentRecord.service.js)
- [capaServidor/test/salesOrderCreation.service.test.js](../capaServidor/test/salesOrderCreation.service.test.js)
- [capaVista/package.json](../capaVista/package.json)
- [capaVista/src/config/requirementsMap.js](../capaVista/src/config/requirementsMap.js)
- [capaVista/src/hooks/useOrderCreateFlow.js](../capaVista/src/hooks/useOrderCreateFlow.js)
- [capaVista/src/modules/orders/README.md](../capaVista/src/modules/orders/README.md)
- [capaVista/src/modules/orders/components/OrderCreateConfirmModal.jsx](../capaVista/src/modules/orders/components/OrderCreateConfirmModal.jsx)
- [capaVista/src/modules/orders/components/SalesNoteStep.jsx](../capaVista/src/modules/orders/components/SalesNoteStep.jsx)
- [capaVista/src/modules/orders/pages/OrderCreatePage.jsx](../capaVista/src/modules/orders/pages/OrderCreatePage.jsx)
- [capaVista/src/modules/orders/utils/orderCreateValidation.js](../capaVista/src/modules/orders/utils/orderCreateValidation.js)
- [capaVista/test/run.mjs](../capaVista/test/run.mjs)
- [docs/ARQUITECTURA.md](../docs/ARQUITECTURA.md)

### Creados (12)

- [capaServidor/prisma/migrations/202609260001_orders_integrity/migration.sql](../capaServidor/prisma/migrations/202609260001_orders_integrity/migration.sql)
- [capaServidor/src/modules/orders/service/salesOrder.errors.js](../capaServidor/src/modules/orders/service/salesOrder.errors.js)
- [capaServidor/src/modules/orders/service/salesOrder.snapshot.js](../capaServidor/src/modules/orders/service/salesOrder.snapshot.js)
- [capaServidor/src/modules/orders/service/salesOrder.transaction.js](../capaServidor/src/modules/orders/service/salesOrder.transaction.js)
- [capaServidor/src/modules/orders/service/salesOrder.validator.js](../capaServidor/src/modules/orders/service/salesOrder.validator.js)
- [capaServidor/src/modules/orders/service/salesOrderCreation.service.js](../capaServidor/src/modules/orders/service/salesOrderCreation.service.js)
- [capaServidor/test/salesOrderIntegrity.test.js](../capaServidor/test/salesOrderIntegrity.test.js)
- [capaServidor/test/salesOrderPersistence.test.js](../capaServidor/test/salesOrderPersistence.test.js)
- [capaVista/test/orderCreateFlow.test.mjs](../capaVista/test/orderCreateFlow.test.mjs)
- [capaVista/test/orders.cases.jsx](../capaVista/test/orders.cases.jsx)
- [docs/ORDERS_IMPLEMENTACION.md](../docs/ORDERS_IMPLEMENTACION.md)
- [docs/ORDERS_MIGRACION.md](../docs/ORDERS_MIGRACION.md)

### Eliminados (3)

- `capaVista/src/modules/orders/OrderDetail.jsx`
- `capaVista/src/modules/orders/mocks/orderCreate.mock.js`
- `capaVista/src/modules/orders/styles/OrderDetail.module.css`
