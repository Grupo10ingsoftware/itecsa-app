> **Informe histórico archivado.** Contexto: 26-09-2026; revisión descrita en el informe.
> Ubicación original: `docs/ORDERS_REAUDITORIA_2026-09-26.md`. El contenido y sus referencias originales se conservan como evidencia de esa revisión; no acreditan el estado actual.
> Consultar la [referencia vigente](../../modulos/ORDERS.md), los [pendientes](../../PENDIENTES.md) y el [índice del archivo](../README.md).

# Reauditoría técnica de Orders/Ventas — 26-09-2026

## 1. Resumen ejecutivo y alcance

Se reconstruyó el flujo de registro desde `OrderCreatePage` hasta Prisma y se consultó **en solo lectura** la base configurada `mydb`. La base tiene 40 pedidos y 61 detalles, pero carece de las cinco columnas `*_origen`/`linea_origen` de `Detalle_pedido` y del índice único de `Pedidos.numero_nota_venta`. El código de la rama sí los utiliza. **No está verificada la ejecución correcta de este código contra esa base; no se debe desplegar antes de conciliar migraciones.** La consulta no confirma si `mydb` es ambiente compartido o productivo.

Se corrigieron dos fallos confirmados de respuesta: `GET /api/order-status` ocultaba un error de repositorio y podía devolver 200 vacío; otros controladores de Orders/Detalles exponían mensajes internos al responder 500. No se ejecutó SQL de escritura, migración, `db push`, ni se modificó un pedido real. No se probó Auth0 ni la página desplegada. La fuente de notas actual es un fixture local, no Manager.

Se inspeccionaron `capaVista/src/modules/orders/**`, `useOrderCreateFlow.js`, `ordersApi.js`, router y consumidores inmediatos de Kanban/Calendario/Cobranzas, rutas/controladores/servicios/repositorios de Orders, middlewares de identidad y permisos, `schema.prisma`, migraciones, configuración Prisma, tests y documentación de requisitos. Los módulos externos se siguieron solo hasta el contrato que consumen.

La reproducción posterior del incidente ejecutó `OrderRepository.getAllOrders` contra `mydb`: Prisma devolvió `P2022`. El health vigente separa `/api/health/live`, que no consulta la base, de `/internal/ready`, deshabilitado salvo configuración interna; `/api/orders` exige autenticación. El fixture tiene 60 notas, de las que 40 ya estaban registradas en esa observación puntual y 20 no. `Nota_Venta` no existe físicamente como otra fuente. Estos hechos explican dos síntomas distintos: Kanban falla por el esquema, y Ventas tampoco puede buscar una NV real que no esté en el fixture. La comparación read-only de modelos Prisma de Orders con columnas físicas encontró sólo las cinco columnas de detalle ya mencionadas como faltantes entre los modelos relevantes. Los errores actuales se correlacionan mediante `requestId` y conservan únicamente códigos seguros, sin mensaje SQL ni datos de cliente.

El comando read-only `npm run orders:preflight`, añadido tras la reproducción, deja estas condiciones verificables antes y después de la reparación. La base contiene 34 pedidos en etapas que Kanban muestra y 6 cancelados; la lista no está vacía. `prisma migrate status` informó seis migraciones locales sin aplicar y tres aplicadas cuyos archivos no están en el repositorio, con `0_init` como último ancestro común. Por ello no se ejecutó `migrate deploy`: el historial requiere reconciliación y una migración anterior intentaría añadir una columna ya presente.

## 2. Flujo real reconstruido

`/ordenes/nuevo` monta `OrderCreatePage` → `useOrderCreateFlow` normaliza código, consulta y mantiene el borrador → `ordersApi.getSalesNote` llama `GET /api/orders/sales-notes/:numeroNota` → JWT, identidad activa y `read:sales-notes` → `OrderController.getSalesNote` → `OrderService.getSalesNoteByNumber` → fixture `sales-notes-fixture.json` y consulta de duplicado en `Pedidos` → vista previa con RUT/nombre, líneas y observaciones. Tras confirmación, el frontend envía `numeroNota`, `observacionInterna`, `priority` a `POST /api/orders` → JWT, identidad activa y `create:orders` → controlador toma `currentUser.idUsuario` → `SalesOrderCreationService` valida, vuelve a leer la fuente, inicia `$transaction`, consulta duplicado, crea/recupera `Cliente`, crea `Pedidos`, etiquetas, registro/etapa inicial, `Detalle_pedido`, ítems sin seguimiento y mensajes; devuelve pedido hidratado. Los datos comerciales enviados por clientes antiguos se ignoran.

La relectura de fuente hace autoritativo al servidor, pero la vista previa puede diferir del contenido persistido si la fuente cambia antes del POST. No se demostró que ocurra con el fixture actual; se deja como observación de integración futura. El flujo de reevaluación desde Kanban vuelve a leer la nota y actualiza detalles existentes **por posición**, lo que sí puede reasignar contenido comercial a otra línea productiva si se reordena la fuente.

## 3. Matriz de endpoints

Todos los endpoints siguientes pasan por `checkJwt` (JWT y `requireActiveIdentity`) y por la capacidad indicada. `PIN` se verifica antes del controlador donde figura. `GET /api/order-status` es consumido por Kanban; `GET /api/orders` también por Calendario; los endpoints de pago se enumeran solo hasta la frontera necesaria.

| Método y endpoint | Permiso/condición | Controlador → servicio → repositorio | Modelo/dato | Consumidor |
|---|---|---|---|---|
| GET `/api/orders`, `/kanban` | `read:orders` | `getOrders` → `getAllOrders` → `getAllOrders` | Pedidos y relaciones | Kanban/Calendario |
| GET `/api/orders/payments` | `read:payments` | `getPaymentWorkspace` → homónimo → `getPaymentOrders` + `PaymentStatusRepo` | Pedidos/Cliente/estados | Cobranzas |
| GET `/api/orders/sales-notes/:numeroNota` | `read:sales-notes` | `getSalesNote` → `getSalesNoteByNumber` → fuente + `existsBySalesNoteNumber` | Fixture/Pedidos | Ventas |
| GET `/api/orders/:orderId` | `read:orders` | `getOrder` → `getOrderById` → `get` | Pedidos y relaciones | Clientes de pedidos |
| POST `/api/orders` | `create:orders` | `createOrder` → `SalesOrderCreationService.create` → repositorios transaccionales | Cliente/Pedidos/Detalle/Registros/mensajes | Ventas |
| PATCH `/api/orders/:id/payment-status` | permiso de pago + PIN | `updatePaymentStatus` → `updPaymentState` → Orders/Payments repos | Pedidos/Registro_Pago | Cobranzas |
| PATCH `/api/orders/:id/move` | `move:orders` + PIN; paso 2 exige `start:production` | `updateGeneralStep` → `updGeneralStep` → transición | Pedidos/Registros | Kanban |
| PATCH `/api/orders/:id/review` | `review:orders` | `sendToReview` → homónimo → transición | Pedidos/Registros/Mensaje | Kanban |
| PATCH `/api/orders/:id/cancel-production` | rol Administrador Producción + PIN | `cancelProduction` → homónimo → transición | Pedidos/Registros | Kanban |
| PATCH `/api/orders/:id/reevaluate` | rol Ventas | `reevaluate` → `reevaluateOrder` → `reevaluateFromSalesNote` | Pedidos/Cliente/Detalle | Kanban |
| PATCH `/api/orders/:id/labels` | `manage:tags` | `setLabel` → `setOrderLabel` → homónimo | Pedido_Etiqueta | Kanban |
| PATCH `/api/orders/:id/delivery-date` | `update:delivery-date` + PIN | `updateDeliveryDate` → homónimo → homónimo | Pedidos/Detalle/Registros | Calendario |
| PATCH `/api/orders/:id/details/:detailId/subprocesses/:subprocessId/complete` | `update:subprocesses` + PIN | `completeSubprocess` → homónimo → homónimo | Detalle/avance/registros | Kanban |
| PATCH `/api/orders/:id/details/:detailId/subprocesses/:subprocessId/rollback` | `rollback:subprocesses` + PIN | `rollbackSubprocess` → homónimo → homónimo | Detalle/registros | Kanban |
| GET `/api/orders/:id/details`, `/:detailId` | `read:orders` | `OrderDetailController` → `OrderDetailService` → `OrderDetailRepo` | Detalle_pedido | Lectura auxiliar |
| GET `/api/order-status` | `read:orders` | `getOrderStatuses` → `getAll` → `OrderStatusRepository.getAll` | Estado_Pedido | Kanban |
| POST `/api/order-status`, `/api/orders/:id/details` | JWT, luego 403 fijo | Sin invocar controlador de escritura | Ninguno | Ninguno permitido |

Las rutas de `/api/orders/:id/payment-records` son del módulo Payments y se revisaron únicamente como consumidor/vecino de Orders.

## 4. Modelo de datos y base real

`schema.prisma` declara FK opcionales de `Pedidos` hacia Cliente, Usuario, Estado_Pedido, Estado_Pago y etiqueta; índice único global nullable para `numero_nota_venta`; detalles con FK opcionales y cinco campos nullable de snapshot; `Pedido_Item_Sin_Seguimiento` con FK requerida a pedido. Registros y Registro_Etapas conservan el evento de alta. No hay un enum Prisma para los estados generales; los IDs/filas de catálogo operan como datos. La migración local `202609260001_orders_integrity` añade cinco columnas e índice único, sin backfill. El DDL de `0_init` no representa por sí solo el estado físico actual; se comparó con la introspección.

Consultas `information_schema` y agregados a `mydb`: 40 pedidos, 61 detalles, 391 registros; 0 grupos duplicados exactos y 0 tras quitar alias `NV-AAAA-`; 0 notas nulas y 0 alias con ese patrón. `Pedidos.numero_nota_venta` existe físicamente **sin índice**. Faltan físicamente `Detalle_pedido.linea_origen`, `codigo_origen`, `producto_origen`, `familia_origen`, `subfamilia_origen`. No hay triggers en Pedidos/Detalle/Registros/Registro_Etapas según `information_schema.TRIGGERS`. `_prisma_migrations` existe: entre las entradas recientes terminadas figuran `0_init` y tres de agosto; la migración de integridad de Orders no figura aplicada. No se leyeron nombres, RUT ni contenido de pedidos. La ausencia de duplicados no sustituye una evaluación de colación ni una prueba de migración en copia desechable.

| Operación | Servicio → repositorio | Modelo/tabla | Consultas/round trips observables en código | Transacción | Hallazgo |
|---|---|---|---|---|---|
| Vista previa | `getSalesNoteByNumber` → fuente + `existsBySalesNoteNumber` | Fixture + Pedidos | `fs.stat` y lectura si cambió; 1 `findFirst` | No | Fuente fixture; falta índice físico para lookup |
| Alta | `SalesOrderCreationService` → Orders/Client/Detail/Product | Cliente, Pedidos, Detalle, etiquetas, Registros, mensajes | 1 chequeo duplicado; por tipo consulta tipo/subprocesos; por línea escritura; lectura final hidratada | Sí, `$transaction` | DDL de snapshot/índice no aplicado |
| Lista/detalle | `getAllOrders`/`getOrderById` → OrdersRepo | Pedidos y relaciones | `findMany` sin paginación / `findUnique` con `select` anidado | No | Lista puede crecer; snapshot seleccionado falta físicamente |
| Cobranzas | `getPaymentWorkspace` → OrdersRepo/PaymentStatusRepo | Pedidos/Cliente/estados | Raw SELECT con joins + catálogo | No | Contrato compartido, consulta liviana respecto de lista |
| Reevaluación | `reevaluateOrder` → `reevaluateFromSalesNote` | Cliente/Pedidos/Detalle/estados/mensajes | Tipo consultado dentro de loop; detalles actualizados por índice | Sí en flujo normal | Emparejamiento posicional inseguro ante reordenamiento |
| Estados | `OrderStatusService` → `OrderStatusRepository` | Estado_Pedido | 1 `findMany` ordenado | No | Error ahora se propaga a 500 |
| Detalles | `OrderDetailService` → `OrderDetailRepo` | Detalle_pedido | `findMany`/`findFirst` por pedido/ID | No | FK `id_pedido` indexada físicamente |

No se ejecutó `EXPLAIN` ni se midió latencia de red: con 40 filas, una afirmación de mejora temporal sería injustificada. La ausencia del índice y el filtro `numero_nota_venta = ...` sustentan solo un riesgo de búsqueda creciente. `findMany` de toda la lista y respuesta hidratada requieren cardinalidad y presupuesto de API antes de cambiar contrato.

## 5. Hallazgos, gate de plan y revalidación

| ID, tipo, severidad, confianza | Evidencia y cadena | Datos/impacto | Plan revalidado, riesgo y resultado |
|---|---|---|---|
| DB-01 integridad/disponibilidad, alta, alta | `orderReadSelect` y creación de detalles usan columnas ausentes; Prisma/migración local vs `information_schema` y `_prisma_migrations` | Lectura/alta de pedidos pueden fallar contra `mydb`; unicidad no protegida físicamente | Mantener migración preparada y procedimiento, no ejecutarla aquí; requiere copia de prueba, preflight y autorización específica. **NO RESUELTO en BD** |
| SEC-01 exposición, media, alta | Catch de `OrderController` y `OrderDetailController` devolvía `error.message` para 500 | Mensajes internos de dependencias podían llegar a cliente autenticado | Respuesta genérica con referencia para 5xx; conservar 4xx de negocio. Tests de no exposición. **RESUELTO en código** |
| FUNC-01 disponibilidad, media, alta | `OrderStatusService.getAll` capturaba error y retornaba `undefined`; controlador enviaba 200 | Kanban podía recibir éxito vacío ante fallo de catálogo | Propagar al controlador y responder 500. Test primero rojo, luego verde. **RESUELTO en código** |
| DATA-02 integridad, alta, alta | `reevaluateFromSalesNote` usa `order.Detalle_pedido[index]` y actualiza tipo/cantidad sin reconciliar identidad; consumidores productivos conservan IDs | Reordenar líneas puede atribuir progreso a otro SKU; quitar líneas deja detalle obsoleto | Diseñar reconciliación por identidad estable y política de progreso con Producto/Kanban antes de mutar. **NO RESUELTO**; cambiar solo el índice sería riesgoso |
| PERF-01 rendimiento potencial, baja, alta | `findMany` de pedidos sin paginación y `findFirst` por NV sin índice físico | Riesgo de crecimiento; hoy 40 pedidos | Medir plan/tamaño con datos representativos y revisar consumidores antes de paginar; índice ya propuesto en migración. **PENDIENTE**, sin mejora temporal afirmada |
| INT-01 integración, media, alta | `SalesNoteSourceService` lee JSON local y no hay cliente Manager en esta cadena | No hay evidencia de sincronización con Manager | Integrar solo con contrato y credenciales protegidas, pruebas de fallo/versión. **NO IMPLEMENTADO** |

Antes de editar se reabrieron servicio de estados, controladores y helper; el fallo de cada catch seguía presente. No se tocaron tablas, contratos de payload ni componentes no necesarios. Se descartó añadir una versión obligatoria de vista previa: no hay contrato de Manager ni evidencia de cambios concurrentes en el fixture. Se descartó reducir el POST y paginar la lista sin inventario de consumidores. Se descartó borrar servicios/repositorios de escritura auxiliar: rutas públicas 403 no prueban ausencia de usos internos.

## 6. Seguridad, privacidad y readiness Ley 21.719

Autenticación y permisos se imponen server-side en rutas; `requireActiveIdentity` comprueba usuario activo y rol antes del controlador. POST no acepta como autoridad cliente, actor, estados ni líneas del cuerpo; el servidor relee la fuente. `requirePin` protege las transiciones que lo requieren. No se observó ownership por pedido: los permisos son por capacidad/rol, por lo que la necesidad de segregación por cartera es **NO VERIFICABLE** sin regla de negocio. Las consultas Prisma usan filtros estructurados; el SQL raw observado interpola parámetros vía tag de Prisma. No se auditó todo Auth0, despliegue, secret management ni retención organizacional. El helper nuevo evita mostrar mensajes internos 5xx y registra solo evento y referencia.

**READINESS LEY 21.719** (evaluación técnica, no dictamen legal; régimen futuro indicado en el marco previo):

| Área | Evidencia | Estado técnico | Acción |
|---|---|---|---|
| Minimización/API | Vista previa expone RUT/nombre, productos y observaciones; excluye dirección/comuna/ciudad | Preparado parcialmente | Revisar necesidad de RUT y observaciones por rol/consumidor |
| Acceso/confidencialidad | JWT, identidad activa y capacidades; algunas operaciones exigentes usan PIN | Preparado técnicamente en rutas inspeccionadas | Probar Auth0 real y eventual segregación por cartera |
| Seguridad de errores/logs | 5xx de Orders/Detalles podían exponer dependencia; helper corregido | Resuelto en código, despliegue pendiente | Verificar trazas y monitoreo en entorno |
| Privacidad por diseño/default | Fuente interna completa; DTO preview excluye parte de PII | Preparado parcialmente | Inventario de campos de respuesta hidratada y retención |
| Documentos | El alta actual no carga archivos; tablas documentales no prueban flujo activo | No verificable desde esta cadena | Revisar proceso documental si se incorpora |
| Persistencia e integridad | Snapshots y unicidad preparados, no aplicados en `mydb` | Brecha técnica de readiness | Migración controlada después de preflight |
| Derechos del titular/eliminación | FK y registros históricos; no se reconstruyó flujo de acceso/rectificación/supresión | Requiere control organizacional y diseño técnico | Definir políticas, excepciones y flujo de atención |
| Transferencia a terceros/roles | Fuente actual fixture; Auth0 participa en identidad; integración Manager aún no existe en código | No verificable desde código para responsable/encargado | Inventario organizacional y contratos antes de integrar |

La Ley 21.719 no se declara cumplida ni se atribuyen obligaciones concretas a partir de esta inspección. La aplicación del régimen legal vigente, bases de licitud, contratos, plazos de retención y respuesta a titulares son **NO VERIFICABLE TÉCNICAMENTE** aquí.

## 7. Matriz de aplicación ISO y otras referencias

| Norma | Cómo se aplicó / área | Evidencia | Hallazgo/cambio | Estado |
|---|---|---|---|---|
| ISO/IEC 27001:2022 | Riesgo de seguridad de información | DDL ausente y exposición 5xx | DB-01, SEC-01 | Evaluación técnica; no certifica SGSI |
| ISO/IEC 27002:2022 | Acceso, protección de información, logging | Rutas/middlewares y respuesta de error | SEC-01 corregido; Auth0 real pendiente | Parcial |
| ISO/IEC 27005:2022 | Riesgo: probabilidad/impacto/confianza | Matriz de hallazgos | Priorizar DB-01 y DATA-02 | Aplicada como criterio |
| ISO/IEC 27034-1 | Seguridad de aplicación | POST autoritativo, control de errores | SEC-01 | Parcial |
| ISO/IEC 27701:2025 | PII en Cliente/Usuario | RUT, nombres, respuestas, persistencia | Readiness y brechas de retención | Parcial; control organizacional pendiente |
| ISO/IEC 29100:2024 | Minimización de PII | DTO preview y respuesta hidratada | Revisar RUT/respuesta por consumidor | Parcial |
| ISO/IEC 25010:2023 | Corrección, seguridad, eficiencia, mantenibilidad | Flujo, tests, queries y código | FUNC-01, DB-01, PERF-01 | Aplicada |
| ISO/IEC 25040:2024 | Evaluación trazable y límites | Baseline, evidencia BD, regresión | Este informe y estados explícitos | Aplicada |
| ISO/IEC 5055:2021 | Calidad observable del código | Catch silencioso, loop posicional | FUNC-01, DATA-02 | Parcial |
| ISO/IEC/IEEE 12207:2026 | Evolución controlada | Plan, revalidación y migración separada | Cambios acotados | Aplicada como criterio |
| ISO/IEC/IEEE 29119 | Pruebas por riesgo | Tests negativos, baseline/regresión | Dos fallos cubiertos; BD/UI real pendiente | Parcial |

OWASP ASVS/Secure Code Review y NIST SSDF sirvieron para seguir autorización, entrada, errores y pruebas; CWE-209 describe la exposición de errores 5xx y CWE-703 el manejo incorrecto del error de catálogo. Esto es clasificación técnica, no certificación ni auditoría organizacional.

## 8. Código muerto, arquitectura y optimización

| Clasificación | Elemento | Evidencia/acción |
|---|---|
| Confirmado | Ningún nuevo candidato eliminado | En esta reauditoría no se demostró ausencia de referencias internas/dinámicas suficiente para borrar más código |
| Sospechoso | `postOrderStatus`, `postOrderDetail`, métodos auxiliares de escritura de repositorio | POST público responde 403, pero los servicios pueden usarse internamente; no borrar por la ruta sola |

La separación UI → API → controller → service → repo funciona en el alta; `OrderService` sigue siendo fachada de varias transiciones. No se refactorizó por estética. La creación tiene transacción explícita y caché de tipo de producto; la reevaluación mantiene búsquedas dentro del loop. `Promise.all` se usa para lecturas independientes; las escrituras de creación deben permanecer en transacción. La capa frontend usa versión de solicitud para ignorar respuestas tardías. La paginación/overfetching requieren medición y contrato de consumidores.

| ID | Antes | Problema | Cambio | Después | Evidencia |
|---|---|---|---|---|---|
| FUNC-01 | Error BD → 200 con cuerpo indefinido | Correctitud, no performance | Propagar error | Error → 500 | Test rojo/verde |
| SEC-01 | 500 con mensaje interno | Confidencialidad, no performance | Helper común | 500 genérico con referencia | Test negativo |
| PERF-01 | NV sin índice físico, 40 pedidos | Búsqueda potencialmente creciente | Ninguno en BD | Igual hasta migración | `information_schema`; latencia no medida |
| PERF-02 | `getAllOrders` sin paginación | Payload potencial | Ninguno | Igual | `findMany`; tamaño real no medido |

**Performance real medida en esta reauditoría: ninguna.** No se afirma optimización de rendimiento. Los dos cambios son de corrección y seguridad. La reducción previa de 1 a 0 consulta del actor en POST consta en `ORDERS_IMPLEMENTACION.md` y sus tests, pero no se revalidó como medición de latencia en MySQL.

## 9. Pruebas, cambios y reauditoría

Baseline antes de editar: pruebas relevantes backend aprobadas; frontend `npm test` aprobó 14 tests Node y 106 verificaciones SSR; build Vite aprobó 492 módulos. Lint global ya fallaba con 6 errores y 1 aviso en Kanban/Métricas. Se agregó `orderStatus.service.test.js`: inicialmente falló como se esperaba, mostrando que `getAll()` no rechazaba el error; tras corregirlo pasó. Se agregaron pruebas de no exposición de error 500 de Orders/Detalles, preservación de 409 de negocio y respuesta 500 del controlador de estados. La suite dirigida de 359 pruebas de routes/RBAC/status pasó. La suite backend completa pasó con 647 pruebas antes de añadir el último caso del controlador; ese caso y los otros cuatro tests nuevos pasaron en ejecución dirigida. Frontend repitió 14 tests Node y 106 verificaciones SSR, build y lint acotado de Orders aprobaron, y `prisma validate` aprobó. Los tests HTTP usan autenticación simulada; no sustituyen Auth0 real. No se ejecutaron pruebas contra MySQL que escriban datos.

Archivos modificados en esta reauditoría: `orderStatus.service.js`, `orders.controller.js`, `orderDetail.controller.js`, `salesOrder.errors.js`; creados: `orderStatus.service.test.js`, `orderErrorResponse.test.js` y este informe. El script temporal de lectura de BD se retiró. No hay cambios de schema ni nueva migración: **schema modificado: no; migración generada: ya existía; migración ejecutada: no.**

| Hallazgo | Evidencia | Cambio | Test | Resultado |
|---|---|---|---|---|
| FUNC-01 | Catch que devolvía `undefined` | Propagación al controller | `orderStatus.service.test.js` | Resuelto en código |
| SEC-01 | Catchs que devolvían `error.message` en 500 | `sendOrderOperationError` | `orderErrorResponse.test.js` | Resuelto en código |
| DB-01 | Columnas/índice faltantes físicamente | Ninguno contra BD | SELECT metadatos | No resuelto |
| DATA-02 | Emparejamiento de detalles por índice | Ninguno | Inspección de cadena | No resuelto |
| PERF-01 | NV sin índice físico | Migración ya preparada | SELECT metadatos | Pendiente |
| INT-01 | Fuente JSON local | Ninguno | Inspección de servicio | Pendiente |

Riesgos residuales: despliegue antes de DDL, diferencias entre base y migraciones, colación de unicidad no comprobada, progreso de líneas ante reevaluación, ausencia de Manager real, Auth0 y pruebas manuales de UI no realizadas, política de datos personales no deducible del código. La rama sigue siendo `opt-ventas`; no se hizo cambio de rama, merge, rebase ni push.
