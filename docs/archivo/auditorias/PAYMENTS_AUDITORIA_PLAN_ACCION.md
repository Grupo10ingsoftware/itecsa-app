> **Informe histórico archivado.** Contexto: 26-09-2026; commit inicial 0b3d83e.
> Ubicación original: `PAYMENTS_AUDITORIA_PLAN_ACCION.md`. El contenido y sus referencias originales se conservan como evidencia de esa revisión; no acreditan el estado actual.
> Consultar la [referencia vigente](../../modulos/PAYMENTS.md), los [pendientes](../../PENDIENTES.md) y el [índice del archivo](../README.md).

# Auditoría técnica y plan de acción — Payments / Cobranzas / Pagos

## 1. Metadatos de auditoría

- Fecha: 26-09-2026 (America/Santiago). Rama: `opt-ventas`; HEAD inicial `0b3d83e`; árbol limpio al inicio.
- Alcance: auditoría y planificación, sin implementación. La única escritura de esta fase es este informe. No se hicieron cambios en código, tests, datos o esquema.
- Entorno: frontend React/Vite; backend Express/Prisma/MySQL. Se consultó `mydb` por la configuración existente, exclusivamente con `SELECT`, `information_schema` y `EXPLAIN`. No se imprimieron credenciales ni filas de clientes. El responsable había identificado esta conexión como compartida o productiva; no se ejecutó ninguna escritura.
- Evidencia primaria: archivos del commit indicado, tests locales, `prisma validate`, `prisma migrate status` y metadatos/conteos de la base. Los Prompt 1 y 2 son marco e índice, respectivamente; sus afirmaciones sobre el proyecto **no** sustituyen evidencia actual.
- Límite: no se probó una sesión Auth0 real ni una transición de pago en la base compartida; las pruebas HTTP usan dobles de autenticación. No se inspeccionaron contratos, respaldos, políticas de retención ni la consola de infraestructura. No hay mediciones de latencia representativas.

## 2. Resumen ejecutivo

El recorrido vigente `/pagos` carga una lista liviana de pedidos y estados, obtiene una vista previa por pedido, exige permiso `update:payment-status` y PIN para cambiar el estado, y escribe `Pedidos`, `Registros` y `Registro_Pago` dentro de una transacción. El servicio distingue la revisión de un pago resuelto mediante `revise:payment-status` y motivo. Los 41 pedidos observados se distribuyen en 11 Pendiente, 27 Confirmado y 3 Rechazado; el catálogo físico tiene exactamente esos tres estados con IDs 1, 2 y 3.

El riesgo principal es de concurrencia: `OrderService.updPaymentState` lee el estado y decide la transición **antes** de iniciar la transacción; `OrderRepository.updatePaymentStatus` actualiza por `id_pedido` sin comprobar que el estado siga siendo el leído. Dos solicitudes simultáneas pueden superar las mismas precondiciones y producir auditorías/notificaciones incompatibles con la decisión final. No se ejecutó una prueba de escritura contra la base compartida; el escenario se fundamenta en la cadena de llamadas y la ausencia de compare-and-swap/bloqueo en el SQL generado por el repositorio.

Hay tres brechas adicionales confirmadas: los controladores propios de Payments devuelven `error.message` incluso para 500; los **33/33** `Registro_Pago` físicos tienen `id_estado_pago_anterior` nulo y el repositorio vigente no lo escribe; y `PaymentCredentialsModal` conserva el PIN en estado React al cerrarse porque el componente permanece montado. Además, el repositorio Prisma declara cinco columnas de snapshot que faltan en la base compartida; el preview actual recurre al fixture local y puede asociar ambiguamente líneas del mismo tipo/cantidad. La migración e integración Manager requieren un procedimiento separado. Ninguna observación autoriza cambios a la base en esta fase.

## 3. Alcance real

Se revisó `capaVista/src/modules/payments/**` y su conexión con router, `useAuth`, `apiClient` y permisos; `capaServidor/src/modules/payments/**`; las funciones de estado de pago en Orders; JWT, identidad activa, capacidades y PIN; schema/migraciones/DB para las tablas usadas; tests del flujo, rutas y roles; y el retiro del módulo documental. Kanban y Producción se siguieron solo hasta el efecto de una transición de pago. El módulo demo `demoOrders` es un camino separado de pruebas/desarrollo: sus reglas no prueban el flujo real de `/pagos`.

## 4. Archivos revisados

Inventario detallado en §36. Los 24 archivos actuales de `capaVista/src/modules/payments` y los 8 de `capaServidor/src/modules/payments` existen; la lista del archivo de encargo omite los CSS Modules y el subdirectorio `mocks/` anunciado por el README **no existe**. Se siguieron `order.routes.js`, `orders.controller.js`, `order.service.js`, `orders.repo.js`, `requirePin.js`, `pin.service.js`, `checkJwt.js`, `requireActiveIdentity.js`, `requireCapability.js`, `shared/authorization.js`, `apiClient.js`, router, `schema.prisma`, migraciones y tests relevantes. La lectura de CSS se limitó a imports y uso de clases; no se hizo QA visual en navegador.

## 5. Flujo funcional real de Payments

`/pagos` → `RoleGuard(read:payments)` → `PaymentConfirmationPage` → `usePaymentsApi` → `createApiClient` con access token Auth0 → `GET /api/orders/payments` → `checkJwt` (JWT + `requireActiveIdentity`) → `requireCapability(read:payments)` → `OrderController.getPaymentWorkspace` → `OrderService.getPaymentWorkspace` → `OrderRepository.getPaymentOrders` (`SELECT` liviano con joins) + `PaymentStatusRepo.getAll` → JSON `{orders,paymentStatuses}` → `normalizePaymentOrders`, contadores, búsqueda y filtros en cliente.

En hover/foco del botón Gestionar o Ver detalle, la página precarga `GET /api/orders/:orderId/payment-records/preview`; guarda la promesa en `paymentPreviewCache` y usa IDs de solicitud para descartar respuestas tardías. El backend verifica `read:payments`, obtiene pedido/cliente/vendedor/detalles por SQL parametrizado y, cuando falta snapshot, lee la NV del fixture `sales-notes-fixture.json` y empareja artículos por tipo/cantidad/posición. El modal muestra número NV, cliente, RUT, vendedor y productos. El nombre `DocumentPreviewModalLayout` es visual: no lee PDF ni firma.

Para confirmar/rechazar: `PaymentRowActions` propone opciones según estado/capacidad → `PaymentActionConfirmModal` muestra preview → `PaymentCredentialsModal` recoge PIN de seis dígitos y motivo cuando el pago ya estaba resuelto → `PATCH /api/orders/:orderId/payment-status` envía `pin`, `paymentStatusId` y `observacion` → JWT + capacidad `update:payment-status` + `requirePin` → `OrderController.updatePaymentStatus` → `OrderService.updPaymentState` → `$transaction` que actualiza pedido/etapa, crea `Registros` y `Registro_Pago`, y eventualmente notifica Producción → respuesta 200. La página reemplaza la fila con el DTO devuelto, o recarga si no recibe ID. El flujo de revisión usa el **mismo** endpoint y añade comprobación server-side `revise:payment-status` y motivo no vacío.

## 6. Arquitectura frontend

`PaymentConfirmationPage.jsx` concentra carga, filtros, caché de previews y orquestación de tres modales; `paymentsApi.js` conserva el contrato HTTP en un lugar; `usePaymentsApi.js` obtiene el token y crea un cliente memorizado. `paymentOrders.js` normaliza estado/detalle, `paymentDocuments.js` formatea fecha y etiqueta de acción. Tabla y tarjetas móviles reutilizan `PaymentRowActions`. El frontend oculta acciones sin permiso, pero la autoridad real está en backend. No hay renderizado de HTML arbitrario en los campos observados; React escapa texto. La capa visual no tiene prueba interactiva de foco, cierre de diálogo ni actualización concurrente; SSR y lint no sustituyen esa verificación.

## 7. Arquitectura backend

La lista y la mutación de pagos residen en Orders, mientras preview, registros y catálogo están en Payments. Esta distribución refleja que el pago modifica también la etapa del pedido, pero aumenta el acoplamiento. `OrderService.runInTransaction` crea repositorios ligados al mismo `tx` para el camino real; con dependencias inyectadas en tests ejecuta el callback sin transacción física. La transacción protege la atomicidad de escrituras y notificaciones en tablas locales, **no** evita decisiones basadas en una lectura obsoleta anterior a su inicio. `PaymentRecordRepo.create` inserta `Registros` y luego `Registro_Pago` dentro del `tx` que le entrega Orders; usado aisladamente no garantiza esa atomicidad.

## 8. Dependencias transversales

Orders aporta `getPaymentOrders`, `getPaymentOrder`, `updatePaymentStatus`, `notifyProductionAdministrators` y la transacción. `requirePin` usa `PinService.validate`, que resuelve identidad interna y puede actualizar contadores de intentos; elimina `pin` de `req.body` antes del controlador. `shared/authorization.js` intersecta el rol conocido y las capacidades del token. `SalesNoteSourceService` depende hoy de un JSON local, no de Manager. Auth0 es proveedor de token/rol; Aiven aloja MySQL. No se auditó completamente ninguno de esos proveedores.

## 9. Endpoints

La matriz completa está en §37. En producción funcional, la página usa tres rutas: `GET /api/orders/payments`, `GET /api/orders/:orderId/payment-records/preview` y `PATCH /api/orders/:orderId/payment-status`. Las lecturas de registros por pedido/ID y de catálogo están montadas pero no aparecen en `paymentsApi.js`; otros consumidores HTTP externos no son verificables desde el repositorio. `POST /api/orders/:orderId/payment-records` y `POST /api/payment-status` responden 403 deliberadamente después de JWT.

## 10. Autenticación, autorización y PIN

`/pagos` exige `read:payments` en `RoleGuard`; backend vuelve a exigirlo en workspace/preview. `PATCH` exige `update:payment-status` y PIN; la revisión de pagos resueltos requiere también `revise:payment-status` en `OrderService`. Administrador y Operario Cobranzas tienen lectura/actualización; solo Administrador Cobranzas y Soporte tienen revisión; Soporte posee todas las capacidades por excepción técnica. `checkJwt` valida issuer/audience y llama `requireActiveIdentity`, que comprueba cuenta activa y sincronía de rol. El PIN se valida contra hash con scrypt, comparación temporal segura, limitación de intentos y bloqueo en el servicio inspeccionado. No se verificó el tenant Auth0 real ni la gestión de secretos. Las rutas de registros históricos usan `read:orders`, presente en todos los roles, no `read:payments`; la necesidad de esa amplitud requiere política de negocio (§31).

## 11. Máquina de estados observada

| Origen → destino | Capacidad adicional | PIN | Efecto en pedido / auditoría | Observación |
|---|---|---|---|---|
| Pendiente → Confirmado | ninguna sobre `update` | sí | etapa Kanban 1 (`Listo para Producción`), `Registros` + `Registro_Pago`, aviso a Producción | estado nuevo 2 |
| Pendiente → Rechazado | ninguna sobre `update` | sí | etapa Kanban 0, dos registros locales | estado nuevo 3 |
| Confirmado → Rechazado | `revise:payment-status`, motivo | sí | si etapa 1, Cancelado (5); si etapa 2, conserva etapa y pide cancelación; otras etapas quedan sin cambio | política de etapas tardías no documentada |
| Rechazado → Confirmado | `revise:payment-status`, motivo | sí | fuerza etapa 1 y notifica | puede retroceder etapa 2/3; §31 |
| Confirmado/Rechazado → Pendiente | `revise` se evalúa antes | sí | 409, sin escritura | bloqueo deliberado |
| cualquier estado → sí mismo | `update` | sí | 200 sin nuevo registro | idempotencia secuencial, no garantía concurrente |

La decisión se toma usando `currentOrder` leído fuera de `$transaction`. El repositorio hace `pedidos.update({where:{id_pedido},data:{...}})` sin versión/estado esperado. Esta es la causa concreta del riesgo de carrera.

## 12. Modelo de datos

`Pedidos.id_estado_pago` es FK nullable a `Estado_Pago`; `Registro_Pago.id_registro` es PK/FK requerida a `Registros.ID_REGISTRO`. `Registros` referencia opcionalmente pedido y usuario y tiene timestamp; `Registro_Pago` guarda fecha, observación y FKs opcionales al estado anterior/nuevo. `Cliente` guarda nombre/razón social/RUT; `Usuario` guarda identidad del actor. `Detalle_pedido` guarda cantidad/tipo y, en Prisma pero aún no físicamente, cinco campos de snapshot de NV. No hay columna de monto en las estructuras ni en la respuesta Payments revisada; esta pantalla decide un **estado de pago**, no concilia importes bancarios. No se encontró mecanismo de pago externo en esta cadena.

## 13. Schema vs migraciones vs base real

`schema.prisma` y base coinciden para `Estado_Pago`, `Registros` y `Registro_Pago` en las columnas relevantes. Las PK/FK e índices de estado/pedido/actor existen físicamente. Las columnas `id_estado_pago_anterior` y `id_estado_pago_nuevo` son nullable. Faltan físicamente cinco snapshots de `Detalle_pedido` que Prisma declara; `Pedidos.numero_nota_venta` tampoco tiene el índice único declarado. `Registro_Pago` tiene 33 filas; el estado anterior es nulo en **33**, el nuevo está presente en **33**, la observación está presente en **33**. En la unión con `Registros` no hubo pedidos/actores nulos ni huérfanos en esas 33 filas; tres pedidos tienen más de un registro de pago. El último registro por pedido coincide con `Pedidos.id_estado_pago` en todos los casos observados. Hay 41 pedidos y 392 filas en `Registros`. No se encontraron triggers en `Pedidos`, `Registros` ni `Registro_Pago`.

`0_init` contiene tablas documentales históricas que ya no modela Prisma ni existen físicamente (`Documento`, `Nota_Venta`, `Firma_Documento`, `Firma_Pago`). `_prisma_migrations` registra `0_init` y tres migraciones de agosto ausentes localmente; seis migraciones locales de septiembre, incluida Orders, no figuran aplicadas. `prisma migrate status` devuelve 1 por divergencia, con `0_init` como último ancestro común. **No ejecutar `migrate deploy`, `db push` ni DDL en esta base** hasta reconciliar historial en una copia y autorizar un despliegue específico. El esquema propuesto para Payments no exige DDL para guardar el estado anterior: la columna ya existe. Un futuro índice/migración de Orders es dependencia separada; ver `docs/ORDERS_MIGRACION.md`.

## 14. Transacciones y concurrencia

Las tres escrituras del PATCH (pedido, registro, detalle de pago) y mensajes de notificación pasan por una misma transacción real cuando el servicio se construye normalmente. Si alguna escritura falla, Prisma debe revertir la unidad de trabajo; tests con dobles verifican propagación de fallos en áreas vecinas, no un rollback MySQL de Payments. No hay CAS, `SELECT ... FOR UPDATE` ni versión de pago para proteger la lectura inicial. Dos solicitudes Pendiente→Confirmado/Rechazado pueden completar ambas y registrar dos decisiones; dos revisiones simultáneas también. La comprobación de estado idéntico ocurre solo antes de la transacción. La prueba requerida debe correr en una BD desechable/copia, nunca en la compartida.

## 15. Documentos y firma

No existe `capaServidor/src/modules/documents`, `paymentSignature.service.js`, `data/NVS/` ni `data/Firmas/` en el árbol actual. `data/README.md` explica su retiro; `retiredDocuments.routes.test.js` prueba que el servidor no publica la antigua ruta PDF. Las cuatro tablas documentales históricas aparecen en `0_init`, pero no en `schema.prisma` ni en `information_schema` de `mydb`. `DocumentPreviewModalLayout` es un contenedor React para datos de pedido, sin archivo, upload, firma ni path. Por tanto, no hay un flujo activo de firma/PDF de Payments que auditar; no se concluye nada sobre firmas pasadas fuera de este snapshot ni equivalencia jurídica con Ley 19.799.

## 16. Datos personales y flujo de datos

El workspace transmite `rut_cliente`, nombres/razón social y NV junto al estado; la UI muestra y busca esos datos. La vista previa agrega correo del vendedor y líneas de productos. El historial de pagos transmite ID/nombre/apellido de actor y observación libre; su ruta acepta cualquier usuario con `read:orders`. El PIN viaja por `PATCH` bajo el canal HTTP configurado, se elimina de `req.body` tras `requirePin`, pero permanece en `useState` del modal mientras la página siga montada. Las observaciones se guardan duplicadas en `Registros.observacion` y `Registro_Pago.observacion`. No se verificó plazo de conservación, procedimiento de derechos ni base de licitud. La matriz de campos está en §38.

## 17. Readiness Ley 21.719

La Ley 21.719 tiene vigencia general diferida al **01-12-2026** según [BCN](https://www.bcn.cl/leychile/navegar?idNorma=1209272&idVersion=2026-12-01). Esta matriz evalúa preparación técnica; no declara cumplimiento legal. La Ley 19.628 vigente sigue siendo referencia de tratamiento de datos. Las clasificaciones derivan solo de evidencia del módulo.

| Área | Evidencia | Estado técnico / límite |
|---|---|---|
| Finalidad y minimización | lista liviana evita detalle productivo hasta preview, pero entrega RUT a toda sesión `read:payments` y motivo/actor a `read:orders` | preparado parcialmente; validar necesidad por rol |
| Acceso y confidencialidad | JWT, identidad activa, capacidades y PIN server-side | preparado parcialmente; Auth0/infraestructura no probados |
| Integridad y exactitud | transacción local; carrera de estado, historial sin estado anterior, fallback ambiguo de SKU | brecha técnica |
| Seguridad y errores | control de PIN; controladores Payments exponen `error.message` en 500; PIN persiste en React | brecha técnica |
| Transparencia, derechos y retención | no hay flujo/política examinada de acceso, rectificación, supresión o períodos | control organizacional requerido / no verificable |
| Terceros y nube | Auth0/Aiven presentes; Manager no integrado en este código | contratos, ubicación, roles y medidas del proveedor no verificables |

## 18. Matriz de legislación chilena

| Norma | Clasificación para Payments | Evidencia / limitación y acción |
|---|---|---|
| Ley 19.628 | APLICA | RUT, nombres, correo y actividad; verificar bases, finalidades, acceso y conservación con responsable legal. [Texto BCN](https://www.bcn.cl/leychile/Navegar?dt=open&idLey=19628). |
| Ley 21.719 | APLICA CONDICIONALMENTE por vigencia diferida | readiness §17; no declarar cumplimiento anticipado. [Texto BCN](https://www.bcn.cl/leychile/navegar?idNorma=1209272&idVersion=2026-12-01). |
| Ley 21.459 | APLICA CONDICIONALMENTE como marco de delitos informáticos | los controles de acceso ayudan a prevenir abuso; no se observó un delito. [Texto BCN](https://www.bcn.cl/leychile/navegar?idNorma=1177743). |
| Ley 21.663 | NO VERIFICABLE DESDE CÓDIGO | determinar si ITECSA/proveedor está sujeto a obligaciones de la Ley Marco de Ciberseguridad; no inferirlo por usar nube. [Texto BCN](https://www.bcn.cl/leychile/navegar?idNorma=1202434). |
| Ley 17.336 | APLICA CONDICIONALMENTE | dependencias, contenidos y licencia; no se comprobó titularidad de software/recursos. |
| Código del Trabajo | APLICA CONDICIONALMENTE | actividad identificable del personal; políticas laborales de monitoreo/acceso no disponibles. |
| Ley 19.799 | NO APLICA AL FLUJO TÉCNICO ACTUAL | no hay firma/documento activo en Payments; reevaluar al incorporar firma. |
| Ley 19.496 y Decreto 6/2021 | APLICA CONDICIONALMENTE | solo si este sistema soporta relaciones/ventas al consumidor y comercio electrónico; el repositorio interno no acredita esa relación. |
| Ley 20.422 | APLICA CONDICIONALMENTE | revisar accesibilidad del modal/foco con personas usuarias; no se hizo prueba interactiva. |
| Ley 21.180, Ley 19.880 y Ley 20.285 | NO APLICA AL ALCANCE TÉCNICO ACTUAL | no se observó procedimiento administrativo/organismo público; verificar si el cliente opera bajo tal régimen. |
| Ley 20.584 | NO APLICA AL ALCANCE TÉCNICO ACTUAL | no hay atención sanitaria ni ficha clínica en este flujo. |

La aplicabilidad final, contratos y excepciones requieren asesoría del responsable legal; esta matriz no es dictamen jurídico.

## 19. Matriz ISO

Las normas son criterios de evaluación, no certificaciones ni leyes. Versiones proporcionadas por el encargo que no se contrastaron con catálogo oficial en esta fase llevan `REFERENCIA REQUIERE VERIFICACIÓN ADICIONAL` antes de usarlas contractualmente.

| Norma | Aplicabilidad Payments y evidencia | Resultado / limitación |
|---|---|---|
| ISO/IEC 27001:2022 | gestión del riesgo de cambios de pago y PII; §31 | no se auditó SGSI organizacional |
| ISO/IEC 27002:2022 | control de acceso, logging, desarrollo seguro; JWT/PIN/error 500 | controles parciales; SEC-PAY-001 |
| ISO/IEC 27005:2022 | priorización por impacto/probabilidad; carrera y exposición | matriz de riesgos en §31, sin análisis organizacional completo |
| ISO/IEC 27034-1 | seguridad de aplicación; rutas/estado/payload | servidor valida, pero hay carrera y errores filtrados |
| ISO/IEC 27035-1:2023 | respuesta a incidentes; no se encontró runbook | no verificable organizacionalmente |
| ISO/IEC 27033-1:2015 | canal/red; token y MySQL TLS en configuración | despliegue y terminación TLS no auditados |
| ISO/IEC 27036-1:2021 | relación con Auth0/Aiven y futuro Manager | contratos y controles de proveedores no disponibles |
| ISO/IEC 27701:2025 | tratamiento de RUT, correo y trazas | preparación parcial; retención/derechos no verificables |
| ISO/IEC 29100:2024 | minimización y finalidad; workspace/preview | necesidad de campos por rol pendiente |
| ISO/IEC 27017:2026 | nube Aiven/Auth0 | pertinencia condicional; edición: REFERENCIA REQUIERE VERIFICACIÓN ADICIONAL |
| ISO/IEC 27018:2025 | PII en nube | pertinencia condicional; tratamiento contractual no verificado |
| ISO/IEC 25010:2023 | corrección, seguridad, rendimiento, mantenibilidad | fallos de concurrencia y datos; no se midió performance temporal |
| ISO/IEC 25012:2008 | calidad de datos; estado anterior y SKU | 33/33 anteriores nulos; fallback ambiguo |
| ISO/IEC 25023:2016 | medidas de calidad; baseline §25 | métrica futura, sin umbral acordado; edición: REFERENCIA REQUIERE VERIFICACIÓN ADICIONAL |
| ISO/IEC 25030:2019 | requisitos de calidad; reglas de etapa | política de reconfirmación pendiente |
| ISO/IEC 25040:2024 | evaluación trazable; evidencia/limitaciones | aplicada como metodología de este informe |
| ISO/IEC 5055:2021 | calidad estructural; lectura antes de transacción | defecto estructural confirmado; no hay puntuación de certificación |
| ISO/IEC/IEEE 12207:2026 | ciclo de vida/cambios por fases | plan de implementación; edición: REFERENCIA REQUIERE VERIFICACIÓN ADICIONAL |
| ISO/IEC/IEEE 29119 | pruebas por riesgo | faltan pruebas concurrentes/MySQL/UX real |
| ISO/IEC 20000-1:2018 | operación/servicio | condicional; no se auditó mesa de servicio |
| ISO 22301:2019 | continuidad/recuperación | condicional; backups y RTO/RPO no verificados |
| ISO 31000:2018 | evaluación de riesgos | severidad/confianza separadas en §31 |
| ISO 9001:2026 | proceso/calidad organizacional | condicional y edición: REFERENCIA REQUIERE VERIFICACIÓN ADICIONAL |

## 20. OWASP / ASVS / NIST / CWE

| Hallazgo | Criterio pertinente | Evidencia / límite |
|---|---|---|
| SEC-PAY-001 | OWASP ASVS manejo de errores; CWE-209; NIST SSDF verificación | controladores devuelven `error.message` en 500; no se atribuye un número ASVS sin verificar versión |
| DATA-PAY-001 | OWASP ASVS lógica de negocio; CWE-362 | lectura/validación previa a transacción y update sin CAS |
| PRIV-PAY-001 | OWASP ASVS manejo de secretos | estado React conserva PIN tras cierre; no se observó persistencia en disco |
| PRIV-PAY-002 | OWASP API autorización de objeto/función, a validar | ruta de historial permite `read:orders`; no se demostró una política que lo prohíba |
| Controles correctos | OWASP ASVS autenticación/autorización; NIST SSDF diseño/verificación | JWT, identidad activa, `can(role,permissions,permission)`, PIN, SQL parametrizado |

## 21. Calidad ISO 25010 / ISO 5055

Correctitud: transacción local y reglas de estado existentes; carreras y regresión de etapa pendientes. Seguridad: PIN/roles fuertes en rutas, pero 500 y ciclo de vida del PIN deficientes. Fiabilidad: tests locales pasan, pero no hay prueba de concurrencia/MySQL para pagos. Mantenibilidad: la separación API/controller/service/repo es reconocible; `OrderService.updPaymentState` reúne política de pago y notificaciones y merece pruebas por escenarios antes de dividirse. Eficiencia: lista liviana y preview diferido son favorables; no se afirma mejora de latencia sin medición.

## 22. Auditoría de rendimiento backend

`getPaymentWorkspace` obtiene lista y catálogo en `Promise.all`. `getPaymentOrders` evita hidratar detalles/subprocesos; `getPaymentOrder` usa `LIMIT 1`. `PaymentStatusRepo` cachea catálogo por instancia durante cinco minutos. La página precarga preview en hover/foco y deduplica promesas por ID, lo que reduce repetición dentro de una sesión, pero no invalida una respuesta exitosa tras cambio de fuente. No se hizo benchmark HTTP ni profiling. La consulta de `information_schema` para snapshots se cachea por cliente Prisma, y en transacciones nuevas puede añadir una ronda de metadatos al preview; cuantificar antes de optimizar.

## 23. Auditoría de rendimiento BD

Con 41 pedidos, `EXPLAIN` de la forma de listado indicó recorrido descendente del índice primario (`rows≈43`) y joins por PK `eq_ref`; el preview por ID usa PK de `Pedidos`, índice `Detalle_pedido.id_pedido_idx` y PK de `Tipo_Producto`. La forma reducida de `EXPLAIN` no incluye todas las columnas/proyecciones de la consulta real, por lo que no prueba el costo exacto. No se midió latencia ni tráfico. `getPaymentOrders` no pagina y devuelve todos los pedidos; el riesgo crece con la cardinalidad. `Registro_Pago` usa PK para ID e índices de FKs de estado; `Registros` indexa pedido y usuario. Un índice nuevo no se justifica por las 41 filas actuales sin una medida y contrato de paginación. La falta del índice de NV es deuda transversal de Orders, no un hallazgo de rendimiento medido de Payments.

## 24. Auditoría de rendimiento frontend

La página filtra/busca en memoria y memoiza contadores/resultado; tabla y lista móvil renderizan ambas estructuras, ocultando una por CSS. No se midió costo de render con tamaños grandes. `paymentPreviewCache` conserva una promesa por pedido visitado durante toda la vida de la página; tiene fallo invalidable al rechazar, pero no TTL ni invalidación positiva. El preview se solicita también por foco/hover, lo que puede anticipar datos personales no usados. Evaluar número de solicitudes, memoria y tasa de apertura antes de cambiar este comportamiento.

## 25. Baseline y métricas disponibles

| Comando/consulta | Resultado | Límite |
|---|---|---|
| `capaServidor: npm test` | 651/651 | dobles locales; sin BD Auth0 reales |
| `capaVista: npm test` | exit 0; runner SSR de casos de UI + 14/14 Node | no navegador interactivo |
| `capaVista: npx eslint 'src/modules/payments/**/*.{js,jsx}'` | exit 0 | no valida comportamiento |
| `capaServidor: npm run prisma:validate` | schema válido | no compara estado físico |
| `capaServidor: npm run prisma:migrate:status` | exit 1: seis migraciones locales pendientes, tres remotas sin archivo | solo lectura; no aplicar en esta fase |
| agregados MySQL read-only | 41 pedidos, 33 registros de pago, 392 registros generales; 33 estados anteriores nulos | snapshot puntual, puede cambiar |

Métricas futuras: p50/p95/p99 de workspace/preview/PATCH en entorno representativo, bytes por respuesta, consultas/solicitud, tasa de conflictos, filas por vista, número de precargas por apertura, ratio de estados/auditoría inconsistentes y tiempo de render con cardinalidad creciente. No hay porcentajes de optimización demostrados.

## 26. Código muerto

**CONFIRMADO en el árbol actual:** el antiguo módulo documental, rutas PDF y archivos `data/NVS`/`data/Firmas` no existen; no se propone borrarlos de nuevo. Los dos POST auxiliares de Payments están bloqueados explícitamente y son controles activos, no código muerto. **PROBABLE, sin autorización de eliminación:** `PaymentRecordRepo.getById` no tiene llamadas localizadas en `src`/tests salvo su definición; el endpoint por ID usa `getByOrderIdAndRecordId`, más seguro por contexto. Confirmar consumidores dinámicos/inyección antes de eliminar. **DESCARTADO:** clases de credenciales de `PaymentActionConfirmModal.module.css` son usadas por `PaymentCredentialsModal.jsx`; una comparación CSS con solo el componente homónimo daba falso positivo. `DocumentPreviewModalLayout` está activo como layout. No se encontró un símbolo cuya eliminación esté lista para implementar.

## 27. Arquitectura y mantenibilidad

La coexistencia de Payments y Orders es funcionalmente razonable porque la decisión de pago mueve el pedido. El defecto no se corrige moviendo archivos: requiere una precondición de estado bajo transacción. `PaymentStatusService` es pequeño, pero tiene consumidores HTTP; no se justifica borrarlo por tamaño. `PaymentConfirmationPage` tiene varios estados de modal y caché, aunque mantiene una sola orquestación de pantalla; cualquier extracción futura necesita tests de apertura/cierre/reintentos. El repositorio de pago mezcla el registro de auditoría y la proyección de preview; solo dividirlo si un cambio aporta aislamiento/testabilidad medible. No se propone rename/move/delete automático.

## 28. Tests existentes

`paymentRecord.repo.test.js` comprueba creación de `Registros`/`Registro_Pago` con mock y SQL de preview; **no** verifica `id_estado_pago_anterior`, transacción real ni autorización. `paymentStatus.repo.test.js` comprueba caché y lookup. `paymentConfirmationDetails.service.test.js` prueba fallback de un solo producto, no dos líneas ambiguas ni fuente modificada. `ordersMock.service.test.js` cubre transiciones secuenciales, permisos de revisión, bloqueo de Pendiente, notificaciones y no duplicar auditoría si ya coincide; usa un adaptador en memoria y no induce dos solicitudes paralelas. `orderTransitions.repo.test.js` prueba algunas escrituras de Orders y lectura liviana; su prueba concurrente es de movimiento Kanban, no de pago. `orders.routes.test.js` comprueba montaje JWT/capacidad/PIN mediante stubs; no prueba un JWT/PIN real. `authorization.cases.jsx` verifica visibilidad según rol por SSR. `payment.cases.jsx` contiene cinco aserciones de fechas; no hay test de ciclo de vida del PIN ni de todo el flujo React. `retiredDocuments.routes.test.js` valida la ruta PDF retirada. `orderErrorResponse.test.js` cubre errores de Orders, **no** los controladores Payments. `demoOrders.routes.test.js` prueba el módulo demo separado.

## 29. Resultado de tests ejecutados

Los comandos y resultados están en §25. Ninguna prueba ejecutada escribió en `mydb`. La base se consultó solo con lecturas agregadas/metadatos. El paso `prisma migrate status` terminó no cero por divergencia conocida; no es un fallo de test ni autorización para aplicar migraciones. El código no se modificó para hacer pasar pruebas.

## 30. Gaps de testing

Faltan pruebas negativas de 500 en ambos controladores Payments; dos PATCH simultáneos con mismo estado inicial en DB aislada; rollback MySQL si falla la segunda escritura/notificación; llenado de estado anterior; revisión desde producción/entrega/cancelado; estado de catálogo inesperado/nulo; preview con dos SKU del mismo tipo/cantidad y fixture reordenado; permisos efectivos de historial; reset de PIN y foco del modal en navegador; mediciones con cardinalidad representativa. Ninguna debe ejecutarse sobre la conexión compartida.

## 31. Hallazgos detallados

**SEC-PAY-001 — 500 expone mensaje interno.** Categoría seguridad; severidad **ALTA**; confianza **CONFIRMADO**. Archivos: `capaServidor/src/modules/payments/controller/paymentRecord.controller.js` (`getPaymentRecord`, `getPaymentRecordsByOrderId`, `getConfirmationDetails`) y `paymentStatus.controller.js` (`getPaymentStatus`, `getPaymentStatuses`). Cadena: endpoint autenticado → controlador → service/repo → error Prisma/infraestructura → `res.status(...).json({message:error.message})`. Consumidores: UI del preview y posibles clientes HTTP de historial/catálogo. Datos: errores de consulta/estructura podrían incluir nombres internos y detalles de dependencia; no se observó un mensaje real exfiltrado ni se probó el error en vivo. Problema/causa: el catch no separa errores esperados 4xx de fallos 5xx. Escenario: fallo DB durante preview y respuesta 500 con detalle técnico. Referencia: confidencialidad/seguridad de Ley 19.628 y readiness 21.719; ISO 27002/27034; CWE-209, OWASP manejo de errores. Solución: responder 5xx genérico con referencia segura y preservar 400/403/404 definidos; logging sin PII/SQL. Riesgo: cambiar contrato de error de clientes; revisar `apiClient` y UI. Pruebas: errores simulados de repo/servicio y HTTP. Estado: **LISTO PARA PLANIFICAR**, acción PAY-ACT-001.

**DATA-PAY-001 — decisión de pago con lectura obsoleta.** Categoría integridad; severidad **ALTA**; confianza **CONFIRMADO** para ausencia de control, escenario concurrente **ALTAMENTE PROBABLE**. Archivos: `order.service.js` (`updPaymentState`, `runInTransaction`) y `orders.repo.js` (`getPaymentOrder`, `updatePaymentStatus`). Cadena: PATCH → lectura de pedido fuera de tx → reglas/etapa → tx → `pedidos.update` por ID → `PaymentRecordService.createPaymentRecord` → `Registros`/`Registro_Pago` y mensajes. Consumidores: Cobranzas, Kanban/Producción, historial. Problema: no hay estado esperado en `where`, bloqueo ni revalidación dentro de tx. Escenario: confirmar y rechazar a la vez desde Pendiente; ambas respuestas pueden parecer válidas, se registran dos acciones y gana la última. Datos: estado, etapa, actor y notificaciones. Causa: optimización de lectura previa sin guardia de concurrencia. ISO 25012/25010/27005; OWASP lógica de negocio, CWE-362. Solución: serializar/revalidar bajo tx o CAS por estado/pedido con conflicto 409 e historial coherente. Riesgo: deadlocks/reintentos y nuevos 409; probar en copia. Estado: **LISTO PARA IMPLEMENTAR EN BD AISLADA**, PAY-ACT-002.

**DATA-PAY-002 — estado anterior no conservado.** Categoría integridad/trazabilidad; severidad **MEDIA**; confianza **CONFIRMADO**. Archivos: `paymentRecord.repo.js` (`create`), `paymentRecord.service.js` (`createPaymentRecord`), `order.service.js` (`updPaymentState`), `schema.prisma` (`Registro_Pago`). El modelo y la tabla tienen `id_estado_pago_anterior`, pero `create` solo escribe `id_estado_pago_nuevo`; en `mydb` los 33 registros existentes tienen anterior NULL. Consumidores: historial (`orderHistory.service.js`) y endpoints de registros que devuelven `estado_anterior`. Impacto: reconstrucción incompleta de decisiones; no puede backfillearse sin fuente histórica fiable. Solución: pasar el estado **revalidado dentro de tx** a `createPaymentRecord`, guardar ambas FKs; dejar históricos NULL o plan de reconstrucción documentado. Riesgo: inventar historia incorrecta; nunca inferir masivamente de estado actual. ISO 25012/27701; readiness 21.719. Estado: **LISTO PARA IMPLEMENTAR PROSPECTIVAMENTE**, PAY-ACT-003.

**FUNC-PAY-001 — reconfirmación fuerza etapa 1.** Categoría flujo funcional; severidad **ALTA** si hay producción iniciada; confianza **CONFIRMADO** para la rama de código, regla de negocio **NO VERIFICADA**. `OrderService.updPaymentState` asigna `KANBAN_LISTO_PRODUCCION` a todo destino Confirmado. Una secuencia posible es Confirmado→Rechazado en etapa 2 (conserva producción) y luego Rechazado→Confirmado (baja a etapa 1), sin política explícita de progreso. Consumidores: Kanban/Producción/calendario. Datos: etapa, avances y notificaciones. Solución conceptual: tabla de transiciones pago×etapa aprobada por negocio, con revalidación transaccional; en estados ambiguos devolver 409 antes de mutar. Riesgo: elegir una regla incorrecta para órdenes en curso o entregadas. Tests de toda la matriz. Estado: **BLOQUEADA POR POLÍTICA DE NEGOCIO**, PAY-ACT-004.

**PRIV-PAY-001 — PIN persiste al cerrar el modal.** Categoría seguridad/privacidad; severidad **MEDIA**; confianza **CONFIRMADO**. `PaymentCredentialsModal.jsx` almacena `pin` y `comment` en `useState`; `PaymentConfirmationPage.jsx` mantiene el componente montado y solo cambia `order` a null. Al reabrir para otro pedido, el estado previo puede reaparecer. Consumidores: usuario de Cobranzas en el mismo navegador. No se observó almacenamiento persistente ni log del PIN; el riesgo es retención innecesaria en memoria/UI y envío accidental a otro pedido. Solución: vaciar datos al cerrar, al completar y al cambiar de pedido, manteniendo una recuperación controlada si falla el POST; probar con interacción de navegador. ISO 27002/29100, readiness 21.719. Estado: **LISTO PARA IMPLEMENTAR**, PAY-ACT-005.

**DATA-PAY-003 — preview depende de fuente histórica ambigua.** Categoría calidad de datos/integración; severidad **MEDIA**; confianza **CONFIRMADO** para ausencia de snapshots y algoritmo, efecto en un pedido concreto **NO VERIFICADO**. `paymentRecord.service.js` usa fallback por tipo/cantidad/posición cuando falta `linea_origen`; la base carece de las cinco columnas y la fuente actual es fixture local. Dos productos del mismo tipo/cantidad reordenados pueden presentarse bajo un ID de detalle equivocado. UI dice “registrados desde Manager”, pero no hay cliente Manager en el código. Solución: desplegar snapshot/identidad de línea mediante plan Orders en entorno autorizado, definir política para históricos sin fuente fiable, integrar fuente real con contrato; hasta entonces señalar incertidumbre en preview. Riesgo: migración divergente, backfill inventado. ISO 25012/29100; readiness 21.719. Estado: **BLOQUEADA para DDL/integración**, PAY-ACT-006.

**PRIV-PAY-002 — alcance de lectura de historial de pagos.** Categoría privacidad/autorización; severidad **MEDIA**; confianza **CONFIRMADO** para exposición, necesidad **NO VERIFICABLE**. `paymentRecord.routes.js` usa `read:orders` para historial/registro individual; ese permiso pertenece a todos los roles en `shared/authorization.js`. El DTO incluye motivo libre, identidad del actor y estados. Las consultas sí filtran por `orderId`, por lo que no se identificó una BOLA técnica a otro pedido para un usuario con permiso; la pregunta es si **todos** los lectores de pedidos deben ver motivos de pago. Solución conceptual: política de clasificación/roles y minimización del DTO, luego ajuste de capacidad si procede. Riesgo: retirar una lectura legítima de historial. No declarar incumplimiento legal sin política. Estado: **BLOQUEADA POR DECISIÓN DE ACCESO**, PAY-ACT-007.

**PERF-PAY-001 — lista completa y precarga sin baseline.** Categoría rendimiento; severidad **BAJA hoy**; confianza **CONFIRMADO** para ausencia de paginación, costo futuro **NO VERIFICADO**. `getPaymentOrders` devuelve todos los pedidos; la página filtra en memoria y precarga preview en foco/hover. Con 41 filas, `EXPLAIN` usa PK; no se midió problema real. Plan: instrumentar tamaño/latencia/render y solo después negociar paginación servidor-cliente e invalidación de caché, conservando conteos/filtros. Estado: **OBSERVACIÓN, NO CAMBIO OBLIGATORIO**; PAY-ACT-008 condicionada a baseline.

**DOC-PAY-001 — documentación/descripciones desactualizadas.** Categoría documentación; severidad **BAJA**; confianza **CONFIRMADO**. `payments/README.md` dice que el actor de registro se resuelve de `auth0.sub` durante el PATCH, pero la ruta usa `req.pinActor` como primera fuente; el README muestra `mocks/` inexistente; el modal atribuye datos a Manager aunque el servicio lee fixture. Consumidores: operadores y siguiente equipo. Solución: corregir texto con límites reales después de acordar fuente y flujo; no cambiar lógica solo para igualar README. Estado: **LISTO**, PAY-ACT-009.

**TEST-PAY-001 — cobertura faltante de riesgos críticos.** Categoría pruebas; severidad **MEDIA**; confianza **CONFIRMADO**. La suite pasa, pero no cubre carrera de pagos, reset de PIN, `estado_anterior`, 5xx de Payments ni MySQL aislado. Relación con ISO/IEC/IEEE 29119 y NIST SSDF. Estado: acciones de pruebas integradas en PAY-ACT-001 a 008; no requiere refactor autónomo.

## 32. Hallazgos descartados

- “La firma de pago activa está rota”: descartado en este snapshot; no existe el servicio/las tablas/rutas físicas y el modal no maneja archivos.
- “Payments no tiene transacción”: falso para el camino real construido sin inyección; sí existe `$transaction`, aunque no protege la decisión leída antes.
- “La ruta POST auxiliar permite saltar la transición”: falso; está bloqueada con 403 tras JWT.
- “Las clases CSS del PIN están muertas”: falso; se comparten entre `PaymentActionConfirmModal` y `PaymentCredentialsModal`.
- “El listado ya es lento”: no demostrado; 41 filas y `EXPLAIN` favorable no permiten inferir p95.

## 33. Observaciones no confirmadas

Se requiere validar con negocio si un pago puede revisarse después de producción/entrega y si lectores de Orders pueden consultar motivos de cobro. No se comprobó si un servidor de producción aloja una versión distinta del código, si Auth0 real entrega las capacidades esperadas ni si TLS termina correctamente en todo el recorrido. No se comprobó el contrato Manager ni sus credenciales. No se infiere retención de documentos históricos de la ausencia de archivos en el checkout. No se obtuvo una matriz de riesgos legal/organizacional completa.

## 34. Riesgos transversales y fuera de alcance

La divergencia de migraciones y la ausencia de índice único de NV son responsabilidad del plan de Orders, pero afectan la fidelidad del preview de pagos. Un cambio de pago provoca notificaciones y cambios de Kanban: probar consumidores de Producción/Calendario al implementar CAS/política de etapas. El módulo demo expone flujos históricos de “desconfirmación” distintos y debe permanecer separado; no usar sus tests como especificación del flujo real. Auth0, backups, gestión de secretos e integración Manager requieren auditorías/decisiones fuera de este informe.

## 35. Matriz de símbolos y consumidores

| Símbolo | Definición | Llamadas/imports observados | Endpoint/UI y datos | Impacto de cambio |
|---|---|---|---|---|
| `PaymentConfirmationPage` | `capaVista/.../pages/PaymentConfirmationPage.jsx` | lazy import en `app/router.jsx`; componentes hijo/hook/API | `/pagos`, workspace/preview/PATCH | conservar estados/modales y navegación |
| `createPaymentsApi` / `usePaymentsApi` | `api/paymentsApi.js`, `hooks/usePaymentsApi.js` | página vía hook; hook vía API client | tres URLs vigentes | cambio de contrato exige coordinar router/backend y tests |
| `normalizePaymentOrders` / `mergePaymentPreview` | `utils/paymentOrders.js` | página; tests/consumidores localizados | campos de lista/preview | cambios pueden alterar filtros y modal |
| `PaymentCredentialsModal` | `components/PaymentCredentialsModal.jsx` | página lo mantiene montado | PIN/motivo | reset exige prueba de reabrir/cambiar pedido |
| `OrderController.updatePaymentStatus` | `orders.controller.js` | `order.routes.js` | PATCH | preservar contrato 200/4xx y sanitizar 5xx |
| `OrderService.updPaymentState` | `order.service.js` | controlador; tests `ordersMock.service.test.js` | regla, actor, etapa, transacción | CAS/locking y política de estados afectan Kanban, auditoría, notificaciones |
| `OrderRepository.getPaymentOrders/getPaymentOrder/updatePaymentStatus` | `orders.repo.js` | `OrderService`; tests | `Pedidos`, `Cliente`, estados | contrato DTO y validación concurrente |
| `PaymentRecordService.createPaymentRecord` | `paymentRecord.service.js` | `OrderService`; tests | `Registros`, `Registro_Pago` | añadir estado anterior sin romper inyección |
| `PaymentRecordRepo.create/getConfirmationSource/getByOrderId/getByOrderIdAndRecordId` | `paymentRecord.repo.js` | service; tests | auditoría/preview | DB, snapshots y registros visibles |
| `PaymentStatusRepo.get/getAll` | `paymentStatus.repo.js` | `OrderService` y `PaymentStatusService`; tests | catálogo cacheado | invalidación y nombres de estado |
| `PaymentRecordController` / `PaymentStatusController` | controladores Payments | routers Payments; tests parciales | respuestas 200/4xx/5xx | sanitizar 5xx sin filtrar detalles |
| `requirePin` / `PinService.validate` | middleware/Auth | ruta PATCH y otros módulos | PIN y actor | no relajar verificación ni registrar PIN |

No se propone rename, move, cambio de firma pública ni eliminación en esta fase. Para el único candidato `PaymentRecordRepo.getById`, la búsqueda estática no demuestra todos los consumidores dinámicos; queda `PROBABLEMENTE MUERTO`, fuera de acciones automáticas.

## 36. Matriz de archivos

| Archivo(s) actual(es) | Rol / función / consumidor | Dependencia BD/API / estado y hallazgo |
|---|---|---|
| `capaVista/src/modules/payments/README.md` | contrato narrativo para equipo | DOC-PAY-001 |
| `api/paymentsApi.js` | tres llamadas HTTP; `usePaymentsApi` | Orders/Payments API; activo |
| `hooks/usePaymentsApi.js` | Auth0 token + cliente; página | Auth0/API; activo |
| `pages/PaymentConfirmationPage.jsx` y `.module.css` | orquestación, filtros, caché y layout | API; PERF-PAY-001, PRIV-PAY-001 |
| `components/DocumentPreviewModalLayout.jsx` y `.module.css` | contenedor de diálogos | sin documentos físicos; activo |
| `components/PaymentActionConfirmModal.jsx` y `.module.css` | preview, confirmación, estilos compartidos con PIN | API preview indirecta; activo |
| `components/PaymentCredentialsModal.jsx` | PIN y motivo | PATCH; PRIV-PAY-001 |
| `components/PaymentFilters.jsx` y `.module.css` | filtros fecha/texto/estado | datos en memoria; activo |
| `components/PaymentOrderMobileList.jsx` y `.module.css` | tarjetas móviles | `PaymentRowActions`; activo |
| `components/PaymentOrdersTable.jsx` y `.module.css` | tabla escritorio | `PaymentRowActions`; activo |
| `components/PaymentRowActions.jsx` y `.module.css` | opciones según estado/capacidad | permisos UI; activo |
| `components/PaymentStatusBadge.jsx` y `.module.css` | indicador de estado | activo |
| `components/PaymentSummaryCards.jsx` y `.module.css` | contadores | activo |
| `utils/paymentDocuments.js` | fecha/rango/textos | sin PDF; activo |
| `utils/paymentOrders.js` | normalización de lista y preview | DATA-PAY-003, observación de estado desconocido |
| `capaServidor/src/modules/payments/routes/paymentRecord.routes.js` | preview/historial/POST bloqueado | JWT/capacidad; PRIV-PAY-002 |
| `routes/paymentStatus.routes.js` | catálogo/POST bloqueado | JWT/capacidad; activo |
| `controller/paymentRecord.controller.js` | respuestas de preview/historial | SEC-PAY-001 |
| `controller/paymentStatus.controller.js` | respuestas de catálogo | SEC-PAY-001 |
| `service/paymentRecord.service.js` | DTO/historial/fallback fuente | DATA-PAY-003 |
| `service/paymentStatus.service.js` | lookup/lista | activo |
| `repo/paymentRecord.repo.js` | auditoría SQL/Prisma, preview | DATA-PAY-002/003; `getById` probable sin uso |
| `repo/paymentStatus.repo.js` | catálogo y TTL cinco minutos | activo |
| `capaServidor/src/modules/orders/{routes/order.routes.js,controller/orders.controller.js,service/order.service.js,repo/orders.repo.js}` | frontera de cambio de pago | DATA-PAY-001, FUNC-PAY-001 |
| `capaServidor/src/middlewares/{checkJwt.js,requireActiveIdentity.js,requireCapability.js,requirePin.js}` y `modules/auth/service/pin.service.js` | identidad/capacidad/PIN | activos; verificar tenant real |
| `shared/authorization.js`, `capaVista/src/config/permissions.js`, `capaVista/src/app/router.jsx` | roles, capacidades, guard de UI | PRIV-PAY-002 |
| `capaServidor/prisma/{schema.prisma,migrations/**}`, `prisma.config.ts`, `src/database/prisma.js` | modelo/historial/conexión | migraciones divergentes; §13 |
| `capaVista/src/services/api/apiClient.js` | bearer y errores HTTP | activo; payload 500 visible en UI |
| tests Payments/Orders/authorization citados en §28 | baseline y contratos | TEST-PAY-001 |
| `data/README.md`, `retiredDocuments.routes.test.js` | retiro documental | hipótesis de firma descartada |

Las rutas relativas abreviadas de `capaVista/src/modules/payments` y `capaServidor/src/modules/payments` en filas consecutivas se resuelven contra esos directorios, respectivamente. CSS Modules se inspeccionaron para uso de clases, no para contraste visual en navegador.

## 37. Matriz de endpoints

Todos los endpoints siguientes pasan primero por JWT + identidad activa (`checkJwt`). `—` significa que no se encontró consumidor SPA interno, no que sea inutilizable por clientes externos.

| Método, ruta | Consumidor | Capacidad / PIN | Controlador → servicio → repo / tablas | Estado, respuesta y errores |
|---|---|---|---|---|
| GET `/api/orders/payments` | `/pagos` | `read:payments` / no | Orders → `getPaymentWorkspace` → `getPaymentOrders` + `PaymentStatusRepo`; Pedidos/Cliente/Estado | activo, `{orders,paymentStatuses}`; 500 genérico Orders |
| GET `/api/orders/:orderId/payment-records/preview` | `/pagos` | `read:payments` / no | PaymentRecord → `getConfirmationDetails` → `getConfirmationSource`; pedido/detalle/fixture | activo; 400/404 y 500 actualmente con mensaje interno |
| GET `/api/orders/:orderId/payment-records` | — | `read:orders` / no | PaymentRecord → `getPaymentRecordsByOrderId` → `getByOrderId`; registros/usuario/estados | activo; historial; 500 con mensaje interno |
| GET `/api/orders/:orderId/payment-records/:paymentRecordId` | — | `read:orders` / no | PaymentRecord → `getPaymentRecord` → `getByOrderIdAndRecordId` | activo; 404 si no existe; 500 con mensaje interno |
| POST `/api/orders/:orderId/payment-records` | — | JWT / no | handler fijo 403, sin repositorio | bloqueado deliberadamente |
| PATCH `/api/orders/:orderId/payment-status` | `/pagos` | `update:payment-status`; `revise` si resuelto / sí | Orders → `updPaymentState` → OrdersRepo + PaymentRecordService/Repo; Pedidos/Registros/Registro_Pago/Mensaje | activo; 200, 400/403/404/409/500 según caso |
| GET `/api/payment-status` | —; workspace usa catálogo dentro de su respuesta | `read:payments` / no | PaymentStatus → `getPaymentStatuses` → `getAll` | activo; catálogo; 500 con mensaje interno |
| GET `/api/payment-status/:id` | — | `read:payments` / no | PaymentStatus → `getPaymentStatus` → `get` | activo; 400/404; 500 con mensaje interno |
| POST `/api/payment-status` | — | JWT / no | handler fijo 403 | bloqueado deliberadamente |

## 38. Matriz frontend ↔ backend ↔ BD y privacidad

| Acción/dato | Origen → API/UI | Persistencia / PII / necesidad observada | Autoridad y riesgo |
|---|---|---|---|
| cargar workspace | OrdersRepo → `/orders/payments` → tabla/tarjetas | NV, cliente, RUT, fecha, etapa/pago; RUT/nombre pueden ser PII, mostrados/buscados | servidor decide lectura; minimizar por rol si negocio lo permite |
| filtrar/buscar | lista recibida → memoria del navegador | RUT, NV y nombre en memoria | UI, no cambia BD; exposición equivale al payload completo |
| abrir preview | PaymentRecordRepo + fixture → `/preview` → modal | RUT/nombre, email vendedor, códigos/productos/cantidad; PII y datos comerciales | backend arma datos; fallback ambiguo sin snapshot |
| confirmar/rechazar | PIN/motivo → PATCH | `Pedidos.id_estado_pago`, `Registros` actor/tiempo/observación, `Registro_Pago` estado nuevo y motivo | backend + PIN; carrera y estado anterior nulo |
| revisar pago resuelto | mismo PATCH, capacidad adicional | observación libre duplicada; actor identificable | política de motivo server-side; etapa futura ambigua |
| consultar historial | registros → GET por pedido/ID | estados, motivo, actor, fechas; PII | `read:orders` para todos los roles; necesidad por rol no verificada |
| visualizar documento/firmar | no existe en flujo actual | no hay tabla/ruta/archivo activo | no aplica en este snapshot |

## 39. Matriz de BD

| Operación | Service → repositorio | Prisma/tabla física | Query/índice/transacción | Hallazgo |
|---|---|---|---|---|
| workspace | `OrderService.getPaymentWorkspace` → `getPaymentOrders`, `PaymentStatusRepo.getAll` | `Pedidos`, `Cliente`, `Estado_Pedido`, `Estado_Pago` | raw `SELECT` todos; PK/FK; `Promise.all`, sin tx | PERF-PAY-001, privacidad |
| detalle preview | `PaymentRecordService.getConfirmationDetails` → `getConfirmationSource` | `Pedidos`, `Detalle_pedido`, `Tipo_Producto`, `Cliente`, `Usuario` | raw parametrizado por ID; PK + `id_pedido_idx`; solo lectura | DATA-PAY-003 |
| estado previo | `OrderService.updPaymentState` → `getPaymentOrder` | `Pedidos` + catálogos | `SELECT ... LIMIT 1` fuera de tx | DATA-PAY-001 |
| update | `OrderService` → `OrderRepository.updatePaymentStatus` | `Pedidos` | `update` por PK dentro de tx, sin estado esperado | DATA-PAY-001/FUNC-PAY-001 |
| auditoría | `PaymentRecordService.createPaymentRecord` → `PaymentRecordRepo.create` | `Registros`, `Registro_Pago` | dos inserts dentro de tx de Orders; PK/FK | DATA-PAY-002 |
| historial | `PaymentRecordService` → `getByOrderId/AndRecordId` | `Registro_Pago`, `Registros`, `Usuario`, `Estado_Pago` | filtros por pedido e ID, índices de FK | PRIV-PAY-002 |
| catálogo | `PaymentStatusService` / `OrderService` → `PaymentStatusRepo` | `Estado_Pago` | `findMany/findUnique`, TTL cinco minutos | activo |

## 40. Matriz de estados

La tabla normativa del comportamiento implementado es §11. Para la implementación futura, validar como mínimo estas combinaciones antes de editar: origen `Pendiente/Confirmado/Rechazado` × destino igual o distinto × etapa de pedido `0/1/2/3/5/6` × rol con/sin `revise` × PIN válido/inválido × solicitud concurrente. No inventar la transición correcta para pago revisado durante producción/entrega; marcar 409 provisional si negocio aprueba esa restricción. Los IDs de catálogo se resuelven por BD; no hardcodear nuevos IDs en UI.

## 41. Matriz de optimización

| ID | Área / estado actual | Evidencia / costo observado | Cambio futuro y métrica | Riesgo |
|---|---|---|---|---|
| PERF-PAY-001 | lista completa y filtros cliente | 41 filas; `EXPLAIN` usa PK; sin latencia | medir p95/bytes/render con N representativo; paginar solo si umbral acordado | romper conteos/filtros/API |
| PERF-PAY-002 | precarga y caché de preview por sesión | una promesa por ID, sin TTL; no hay medición de hits | medir requests/aperturas y memoria; invalidar al cambiar datos | más consultas o preview obsoleto |
| PERF-PAY-003 | catálogo TTL 5 min | una consulta si no cache; test de reutilización | medir tasa/hit antes de ajustar TTL | estados viejos si administración futura |
| PERF-PAY-004 | consulta snapshot `information_schema` por cliente/tx | mecanismo observado en código; no medido | contar consultas y p95 tras migración reconciliada | no cachear entre esquemas distintos |

No se marca ninguna optimización como lista para implementar solo por estilo. PAY-ACT-008 define el baseline primero.

## 42. Matriz de trazabilidad

| Hallazgo | Evidencia principal | Acción | Tests de aceptación |
|---|---|---|---|
| SEC-PAY-001 | controladores Payments devuelven `error.message` en catch | PAY-ACT-001 | 500 sin detalle, 4xx preservados |
| DATA-PAY-001 | lectura fuera de tx, update por ID | PAY-ACT-002 | dos PATCH simultáneos: uno válido/otro 409, auditoría única |
| DATA-PAY-002 | repo no escribe anterior; 33/33 NULL | PAY-ACT-003 | nuevo registro tiene par anterior/nuevo correcto |
| FUNC-PAY-001 | todo destino Confirmado fuerza etapa 1 | PAY-ACT-004 | matriz pago×etapa aprobada |
| PRIV-PAY-001 | PIN en `useState` persistente | PAY-ACT-005 | cerrar/reabrir/cambiar pedido deja PIN vacío |
| DATA-PAY-003 | base sin snapshot; fallback fixture | PAY-ACT-006 | SKU estable y límites históricos visibles |
| PRIV-PAY-002 | `read:orders` en historial | PAY-ACT-007 | matriz de roles aprobada + 403/200 correspondientes |
| PERF-PAY-001 | lista completa, 41 filas, sin p95 | PAY-ACT-008 | baseline y umbral; cambio solo si se justifica |
| DOC-PAY-001 | README/modal vs runtime | PAY-ACT-009 | documentación coincide con fuente/actor reales |

## 43. Plan de acción detallado

**PAY-ACT-001 — Sanitizar errores de Payments.** Prioridad **P0**; resuelve SEC-PAY-001. Objetivo: que ningún 5xx de preview, historial o catálogo revele mensajes de Prisma/SQL/infraestructura, conservando los errores de dominio 4xx. Archivos/símbolos: ambos controladores de `capaServidor/src/modules/payments/controller/`, helper `salesOrder.errors.js` solo como referencia de patrón, tests nuevos de controladores y `apiClient`/página como consumidores. Precondiciones: revisar contrato `message` y referencias de UI. Pasos: (1) capturar baseline; (2) crear caso rojo con error de repo que incluya cadena sensible; (3) normalizar 5xx a mensaje/referencia inocua y logging seguro, sin cuerpo ni SQL; (4) conservar 400/403/404 legítimos; (5) probar endpoints con inyección de servicio. No modificar: JWT, PIN, rutas o schema. Frontend: ninguno salvo si contrato de referencia se muestra. BD: ninguna. Riesgo: ocultar errores esperados; aceptación: mismo status, 5xx sin cadena interna, 4xx estables. Rollback: revertir solo helper/controladores si rompe contrato, sin volver a exponer 5xx; mantener test negativo.

**PAY-ACT-002 — Hacer atómica la decisión de estado.** Prioridad **P0**; resuelve DATA-PAY-001. Archivos/símbolos: `OrderService.updPaymentState/runInTransaction`, `OrderRepository.getPaymentOrder/updatePaymentStatus`, `PaymentRecordService.createPaymentRecord`, tests `ordersMock.service.test.js`, `orderTransitions.repo.test.js` y prueba MySQL aislada. Consumidores: PATCH, Kanban, Cobranzas, historial, notificaciones. Precondiciones: copia desechable con catálogo real y decisión sobre 409/reintento; no usar base compartida. Pasos: (1) reproducir dos solicitudes concurrentes con barrera en DB aislada; (2) mover lectura de pedido y validaciones dependientes del estado al callback transaccional; (3) bloquear fila `Pedidos` por ID con `SELECT ... FOR UPDATE` parametrizado **o** usar actualización condicional por estado esperado y comprobar `count===1`, según plan de ejecución/deadlocks observado; (4) crear auditoría y avisos solo tras una transición ganadora; (5) devolver 409 estable a la perdedora y 200 idempotente solo después de releer estado actual; (6) comprobar rollback de fallo a mitad. No modificar: permisos/PIN ni etapas ajenas. BD: no requiere DDL para CAS/lock; cualquier índice propuesto exige preflight separado. Rendimiento: medir p95 de PATCH y lock wait antes/después, sin porcentajes supuestos. Riesgo: contención/deadlocks; aceptar solo un resultado y un registro por transición efectiva, sin regresión de etapas. Rollback: revertir código en despliegue coordinado, conservando datos auditados; nunca borrar registros legítimos.

**PAY-ACT-003 — Registrar estado anterior prospectivamente.** Prioridad **P1**; DATA-PAY-002; depende de PAY-ACT-002. Archivos: `order.service.js`, `paymentRecord.service.js`, `paymentRecord.repo.js`, DTO de historial y tests correspondientes. Pasos: (1) obtener anterior bajo la misma protección transaccional; (2) pasar `id_estado_pago_anterior` a `createPaymentRecord`; (3) validar que nuevo/anterior son IDs existentes y distintos para una transición efectiva; (4) incluir en insert; (5) probar 1→2, 2→3, conflicto y rollback; (6) confirmar en copia que el historial muestra ambos nombres. No modificar históricos 33/33 automáticamente. Schema/BD: columna/FK existentes; no migración para esta acción. Riesgo: romper mocks/firma de método; mapa de consumidores en §35 y búsqueda postcambio obligatoria. Aceptación: nuevos eventos completos, históricos explícitamente `desconocido` si NULL. Rollback: revertir código, sin alterar eventos ya emitidos.

**PAY-ACT-004 — Definir política de pago revisado según etapa.** Prioridad **P1**, **BLOQUEADA** por decisión de negocio; FUNC-PAY-001. Archivos futuros: `order.service.js`, `orders.repo.js`, `status.js`, tests de estados, consumidores Kanban/Producción/Calendario. Obtener de responsables de Cobranzas y Producción la matriz para etapa 0/1/2/3/5/6 al pasar 2→3 y 3→2; decidir si entrega/producción permite revisión y si exige aprobación adicional. Luego: (1) test de cada caso; (2) validar etapa bajo la misma tx de PAY-ACT-002; (3) aplicar transición/notificación exacta; (4) exponer 409 para combinación prohibida; (5) probar reintentos. No tocar avances productivos ni cancelar automáticamente sin regla aprobada. BD: sin DDL previsto. Riesgo: mover pedidos activos a etapa incorrecta. Aceptación: ninguna revisión degrada progreso contra la política firmada. Rollback: revertir código; reconciliación manual de pedidos afectados, nunca borrar historia.

**PAY-ACT-005 — Limpiar credenciales del modal.** Prioridad **P1**; PRIV-PAY-001. Archivos: `PaymentCredentialsModal.jsx`, `PaymentConfirmationPage.jsx`, tests UI de Payments. Consumidores: flujo de PIN de `/pagos`. Pasos: (1) test rojo de cerrar/reabrir mismo y otro pedido, éxito y error; (2) limpiar `pin`, motivo/error cuando `order` pasa a null o cambia ID, con efecto/clave de componente que no cierre durante envío; (3) considerar limpiar inmediatamente tras confirmación exitosa y tras fallo de PIN, sin romper reintento consciente; (4) comprobar que DOM/estado no muestra PIN anterior y foco accesible. No modificar backend/secretos. Rendimiento: irrelevante. Riesgo: borrar motivo al reintentar; aceptación: PIN vacío en cada nueva apertura, sin doble POST. Rollback: revertir solo UI si el modal se bloquea, conservando tests de retención.

**PAY-ACT-006 — Fuente y snapshot confiables para preview.** Prioridad **P1**, **BLOQUEADA** para DDL por historial divergente y para Manager por contrato no incorporado; DATA-PAY-003. Archivos: `docs/ORDERS_MIGRACION.md`, `schema.prisma`, migraciones, `salesNoteSource.service.js`, `salesOrderCreation.service.js`, `paymentRecord.service.js`, `paymentRecord.repo.js`, UI de preview y tests. Preflight: recuperar tres migraciones remotas faltantes, comparar schema físico, respaldo recuperable, duplicados/índices, prueba en copia. Pasos futuros: (1) definir contrato de Manager y credenciales por canal protegido; (2) definir identidad inmutable de cada línea y política de históricos; (3) validar DDL aditivo en copia, ejecutar solo por despliegue autorizado; (4) escribir snapshots prospectivos; (5) preview usar snapshot y marcar histórico incierto, sin inventar SKU; (6) pruebas con dos SKU idénticos en tipo/cantidad y fuente reordenada. No hacer backfill por posición ni `migrate deploy` a ciegas. Riesgo: asociación errónea de producto/progreso, migración parcial. Métrica: porcentaje de previews con snapshot y casos ambiguos, no latencia supuesta. Rollback: versión compatible, conservar columnas/snapshots; procedimiento DB separado, sin drop automático.

**PAY-ACT-007 — Aprobar visibilidad del historial.** Prioridad **P2**, **BLOQUEADA** por política de acceso; PRIV-PAY-002. Archivos: `paymentRecord.routes.js`, `paymentRecord.service.js`, `shared/authorization.js`, tests de roles, consumidores de historial si aparecen. Pasos: (1) inventariar quién necesita actor/motivo y por qué; (2) aprobar matriz por rol y posible ownership por cartera; (3) crear tests HTTP 200/403/404 para cada rol/pedido; (4) ajustar `read:payments` o una capacidad específica y minimizar DTO; (5) revalidar UI/historial. No restringir `read:orders` global ni eliminar campos sin rastrear consumidores. BD: ninguna. Riesgo: bloquear investigación legítima. Aceptación: solo roles aprobados obtienen motivos/actor; contrato documentado. Rollback: revertir política de ruta/DTO de forma controlada, sin relajar más de lo aprobado.

**PAY-ACT-008 — Medir antes de optimizar.** Prioridad **P3** condicionada a crecimiento; PERF-PAY-001. Archivos: `OrderRepository.getPaymentOrders`, `PaymentConfirmationPage.jsx`, `paymentPreviewCache`, API client/tests. Pasos: (1) fijar N representativo sin PII; (2) medir p50/p95/p99, bytes, número de queries, render, requests por preview; (3) acordar presupuesto/umbral; (4) solo si se incumple, diseñar paginación y filtros servidor con conteos compatibles y/o TTL/invalidez de caché; (5) comparar mismas cargas y verificar permisos. No crear índices por intuición. Riesgo: cambio de contrato y conteos. Aceptación: mejora medida sin pérdida funcional. Rollback: bandera/versionado de API si se pagina, sin DDL destructivo.

**PAY-ACT-009 — Corregir documentación y mensajes de origen.** Prioridad **P2**; DOC-PAY-001. Archivos: `payments/README.md`, `PaymentActionConfirmModal.jsx`, tests de texto si procede. Pasos: (1) ajustar README a `req.pinActor`, lista actual de archivos y límites del fixture; (2) eliminar afirmación de Manager hasta que PAY-ACT-006 esté implementada; (3) revisar que el mensaje final distinga información de pedido y fuente de NV; (4) repetir tests frontend. No cambiar contrato de datos ni lógica de pago. Riesgo bajo. Aceptación: ningún texto atribuye al proveedor equivocado datos no integrados. Rollback: restaurar texto si el despliegue de Manager cambia la fuente, con evidencia del contrato.

## 44. Orden futuro de implementación

Fase 0: checkpoint/branch limpia, baseline, copia DB y escenario concurrente aislado. Fase 1: PAY-ACT-001 y PAY-ACT-005 (seguridad inmediata). Fase 2: PAY-ACT-002 → PAY-ACT-003 (integridad transaccional y trazabilidad). Fase 3: obtener política y, si se aprueba, PAY-ACT-004; después resolver PAY-ACT-007. Fase 4: reconciliar migraciones/contrato Manager y ejecutar PAY-ACT-006 mediante despliegue propio. Fase 5: PAY-ACT-009 y PAY-ACT-008 solo tras medición. Fase 6: regresión completa, comparación BD/estado y reauditoría legal/organizacional. El orden preserva dependencia: el estado anterior no es fiable si todavía se lee antes de proteger la transacción.

## 45. Pruebas de la fase de implementación

Ejecutar primero los baselines de §25. Luego tests unitarios/HTTP para errores 5xx y 4xx; pruebas MySQL en copia desechable para dos PATCH en paralelo, rollback de `Registro_Pago` y notificación, mismo estado/reintento, revisión durante etapa 2/3/5 y auditoría anterior/nuevo; tests UI interactivos para PIN, foco, cierre, retry y preview; pruebas de datos ambiguos y fuente cambiada; matriz RBAC de historial; `prisma validate`/status, introspección post-DDL solo en ambiente autorizado; y mediciones comparables de workspace/preview/PATCH. Nunca simular una transición real sobre la base compartida para “probar” el plan.

## 46. Estrategia futura de rollback

Cambios solo de código (errores, PIN, CAS, reglas) se despliegan con versión anterior preparada y observabilidad de 409/5xx; no borrar auditorías ni notificaciones legítimas. Si el cambio de política de estado alteró una orden, revertir mediante procedimiento de negocio con actor y registro, no SQL silencioso. La migración de snapshot/index es aditiva: ante rollback de aplicación, conservar columnas y datos; cualquier reversión de BD requiere procedimiento separado probado en copia. La integración Manager necesita conmutación controlada y preservación de fuente/versiones, no volver silenciosamente a fixture para una NV real.

## 47. Elementos bloqueados

- PAY-ACT-004: matriz de etapas al revisar pagos confirmados/rechazados.
- PAY-ACT-006: historial Prisma divergente, respaldo/procedimiento de base compartida, contrato/acceso Manager y política histórica de líneas.
- PAY-ACT-007: autorización por rol/cartera del historial y necesidad de motivo/actor.
- Conformidad Ley 21.719: base de licitud, política de datos, contratos, retención, derechos, infraestructura y gestión de incidentes no se determinan desde este repositorio.
- Certificación ISO o benchmark de rendimiento: no hay evidencia organizacional ni baseline temporal.

## 48. Handoff para nueva sesión Codex

Leer Prompt 1 como marco de criterios, Prompt 2 solo como mapa y **este archivo como hallazgos basados en el commit `0b3d83e`**. No repetir toda la auditoría; antes de cada ACTION-ID, reabrir archivos, buscar consumidores y revalidar schema/base porque el sistema puede haber cambiado. Seguir §44 y tests por fase. No implementar acciones `BLOQUEADAS` sin sus precondiciones. No aplicar migraciones a la base compartida ni hacer push sin instrucción explícita. Medir antes de optimizar; no renombrar/eliminar sin mapa de símbolos. Al final comparar comportamiento, auditoría, seguridad, privacidad y rendimiento con este baseline y actualizar la matriz de riesgos.

## 49. Estado final

**AUDITORÍA Y PLAN TERMINADOS; IMPLEMENTACIÓN NO INICIADA.** Los hallazgos de máxima prioridad son la exposición de mensajes 5xx y la carrera del estado de pago. La base real confirma el vacío histórico del estado anterior, pero no se alteró ningún dato. Las decisiones de negocio, el despliegue de BD y la evaluación legal integral quedan explícitamente separados para la siguiente fase.
