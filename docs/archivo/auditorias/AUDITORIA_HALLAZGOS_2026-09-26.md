# Auditoría de hallazgos — ITECSA (26-09-2026)

> Archivo histórico. Contexto: 26-09-2026; commit bd6c71c2. Ubicación original: `docs/AUDITORIA_HALLAZGOS_VIGENTE.md`. El cuerpo conserva los hechos y referencias de esa revisión; no describe necesariamente el código actual ni autoriza acciones. Consultar [pendientes vigentes](../../PENDIENTES.md), [Auth0](../../auth0/README.md) y [seguridad](../../security/README.md) antes de usar sus propuestas.

Fecha: 26 de septiembre de 2026. Revisión sobre `bd6c71c2` (`fix/21709`), con árbol limpio al inicio de la revisión. Este documento actualiza el estado de los hallazgos de [la auditoría previa](AUDITORIA_PREVIA_PROTECCION_DATOS_21719.md); no la reemplaza.

**Actualización posterior, 2 de octubre de 2026:** este informe conserva la evidencia y las clasificaciones de su fecha de corte. P07 sustituyó las lecturas amplias de Kanban y Calendario por contratos por tarea, paginó Pago y redujo IDs internos en Historial. Para los contratos vigentes de esas rutas, consultar [la matriz P07](../../security/P07_ORDER_READ_CONTRACTS.md) y [la referencia API](../../desarrollo/API.md). Esta actualización no reclasifica otros hallazgos ni acredita las condiciones operativas que el informe dejó sin verificar.

## Alcance y límites

Se contrastaron la implementación actual y la documentación funcional/técnica versionada, se revisaron los cambios posteriores a la revisión anterior y se ejecutaron las suites disponibles, lint, build, auditoría npm y la comparación local de RBAC.

**No se encontró `REQ -UR -CDU -DIAGRAMAS.docx` en el repositorio ni en `Downloads`.** Los archivos locales contienen referencias parciales a RF01–RF75 y UR, pero no permiten demostrar cobertura completa requisito por requisito. Por eso, este informe prioriza incumplimientos técnicos reproducibles y contradicciones documentales; la matriz de conformidad funcional completa requiere el documento fuente vigente.

No se inspeccionaron valores de archivos `.env`. No se accedió a Auth0, MySQL/Aiven ni a infraestructura desplegada; los hallazgos operativos se clasifican como no verificables, no como vulnerabilidades productivas demostradas. El resultado de `npm audit` es una fotografía de esta fecha y debe repetirse antes de desplegar.

## Estado ejecutivo

- El estado no está listo para considerarse conforme ni habilitarse con datos reales: permanecen riesgos de credenciales, PIN/recuperación, manejo de errores, integridad del alta de pedidos, autorización contextual y límites de lectura.
- La rama actual sí mitigó partes de la auditoría anterior: eliminó el módulo documental y sus PDF del árbol actual, eliminó scripts auxiliares de copias y acotó varias respuestas ORM mediante proyecciones/DTO.
- Verificación: backend tests **pasan**; frontend tests **pasan**; frontend build **pasa**; frontend lint **falla con 6 errores y 1 warning**.
- `npm audit`: backend **8 avisos** (6 altos, 2 moderados); frontend **2** (1 alto, 1 moderado); ninguno crítico. Hay dependencias de aplicación y de tooling, y el aviso no demuestra por sí solo explotabilidad.
- La comprobación `node scripts/rbac.mjs --check docs/auth0/rbac.observed.json` no coincide con el modelo actual: faltan cuatro permisos en el snapshot y no se verifican las listas actuales de roles ni el binding Post Login.

## Hallazgos

Los IDs H01–H19 conservan la trazabilidad de la auditoría previa. “Abierto” indica que no se encontró evidencia de cierre en esta revisión; “parcial” indica que hubo una mitigación pero queda riesgo o evidencia pendiente.

| ID | Estado actual | Prioridad | Hallazgo y evidencia vigente |
| --- | --- | --- | --- |
| H01 | Parcial | P0 | Las proyecciones y DTO reducen relaciones ORM crudas; sin embargo, los pedidos generales siguen incluyendo RUT/nombre del cliente, comentarios y otros datos para lectores con `read:orders`, sin DTO diferenciado por rol/uso. Revisar minimización en `capaServidor/src/modules/orders/repo/orders.repo.js` y `shared/authorization.js`. |
| H02 | Parcial | P1 | Las rutas de documentos/PDF fueron retiradas y el historial de pago ya usa DTO explícito. Los endpoints de registros de pago aún aceptan `read:orders`, mientras que la vista previa usa `read:payments`; validar contra RF qué roles pueden consultar observaciones y autoría de cambios de pago. `capaServidor/src/modules/payments/routes/paymentRecord.routes.js`. |
| H03 | Mitigado en código; despliegue por verificar | P0 | `/api/demo-orders/**` fue retirado y responde 404 en todo ambiente. `/api/auth/pin/debug-reset` y la fixture de Notas de Venta requieren opt-in en desarrollo/test; producción rechaza el opt-in. Soporte conserva intacta su matriz para rutas reales. El despliegue debe acreditar `NODE_ENV=production` y flags deshabilitados. Ver [inventario demo por ambiente](../../DEMO-ENVIRONMENTS.md). |
| H04 / P08 | Mitigado en código; tiempos reales y despliegue por verificar | P1 | Solicitudes válidas devuelven HTTP 202 y el mismo cuerpo para cuentas activas, inexistentes, deshabilitadas y fallos de consulta/Auth0. Solo las activas solicitan correo. Espera mínima de 600 ms más jitter; no oculta latencias superiores. Cuotas por IP (10/15 min) y correo (3/15 min), persistentes en producción. |
| H05 | Mitigado en código; prueba MySQL de despliegue pendiente | P0 | Las verificaciones del PIN y la creación de retos bloquean la fila del usuario (`SELECT ... FOR UPDATE`) dentro de transacciones Prisma. El quinto fallo conserva el bloqueo de 15 minutos. La confirmación consume el reto con `updateMany` condicional y actualiza la credencial en la misma transacción; el quinto código incorrecto invalida el reto y una nueva solicitud invalida retos previos. Se agregaron pruebas concurrentes sobre persistencia de prueba; falta verificar el comportamiento contra MySQL/Aiven de testing antes del despliegue. `capaServidor/src/modules/auth/service/pin.service.js`, `capaServidor/test/pinConcurrency.test.js`. |
| H06 | Abierto | P1 | PIN pendiente recuperable sin TTL propio; parámetros de scrypt y ciclo de claves requieren endurecimiento/decisión. `capaServidor/src/modules/auth/service/pin.service.js`, `capaServidor/prisma/schema.prisma`. |
| H07 | Abierto | P0 | El proveedor no productivo imprime correo/código de recuperación y se selecciona cuando `NODE_ENV` no es `production`; falta el proveedor seguro de entrega productiva. `capaServidor/src/modules/auth/service/pinDelivery.service.js`, `capaServidor/src/app/app.js`. |
| H08 | Abierto | P0 | Varios controladores devuelven `error.message` en respuestas 500 y no hay normalización global que evite filtrar detalles internos. `capaServidor/src/server.js` y controladores de pedidos/pagos, entre otros. |
| H09 | Abierto | P0 | `POST /orders` continúa confiando en cliente, vendedor, observaciones e ítems reenviados por el navegador; la API no vuelve a resolver la nota canónica al crear. La fuente actual es un fixture, no una integración con el sistema externo. `capaServidor/src/modules/orders/service/order.service.js`, `capaServidor/src/modules/orders/service/salesNoteSource.service.js`, `capaVista/src/hooks/useOrderCreateFlow.js`. |
| H10 | Abierto | P0 | El estado actual de `npm audit` registra 8 avisos backend y 2 frontend. Triage por paquete/alcanzabilidad y actualización compatible pendientes; eliminar `pdfjs-dist` ya retiró el aviso anterior de PDF.js, pero no resuelve los demás. |
| H11 | Abierto | P0 | Los archivos locales `capaServidor/.env` y `capaVista/.env` tienen modo `0644`; la auditoría previa confirmó valores sensibles configurados en el `.env` backend. No se leyeron ni reproducen valores. Restringir permisos y revisar rotación/exposición conforme a la política del equipo. |
| H12 | Parcial | P1 | No quedan PDF en el árbol de trabajo actual, pero su eliminación en un commit no borra automáticamente los blobs de la historia alcanzable. La procedencia de los archivos eliminados y la necesidad de limpieza histórica requieren decisión del propietario; no se debe reescribir historia sin aprobación. |
| H13 | Abierto | P0 | No hay ciclo técnico acreditado para retención, eliminación/anonimización y atención de derechos. Plazos, finalidades y excepciones requieren definición organizacional antes de implementar borrados. |
| H14 | Abierto | P1 | La auditoría de negocio cubre transiciones, pero no hay evidencia de catálogo uniforme para administración, recuperación, denegaciones/lecturas sensibles ni protección contra alteración. |
| H15 | No verificable | P0 | No hay evidencia versionada suficiente para acreditar TLS de la aplicación, cifrado/gestión de claves en reposo, controles de red, separación real de ambientes, monitoreo o respuesta a incidentes. Solicitar evidencia del despliegue; no asumir que producción está insegura. |
| H16 | Parcial | P1 | Los scripts locales de backup/restauración detectados antes fueron retirados. Backups productivos, retención, RPO/RTO y restauración siguen sin ser verificables. |
| H17 | Parcial | P1 | Sigue habiendo documentación contradictoria: `capaVista/README.md` describe el alta de pedido como mocks/sessionStorage, mientras `README.md` y `docs/ARQUITECTURA.md` documentan consulta API y `POST /api/orders`. La guía RBAC también quedó atrás del modelo actual. |
| H18 | Parcial; despliegue por verificar | P2 | `/api/health/db` ya no está montado; `/api/health/live` no consulta BD y `/internal/ready` está deshabilitado por defecto y requiere token. Falta verificar consumidores, aislamiento de red interna y límites del perímetro. `capaServidor/src/modules/health/routes/health.routes.js`. |
| H19 | Abierto | P1 | No se acreditan límites uniformes para lecturas de pedidos y métricas; el intervalo consultable por métricas no tiene máximo funcional y las consultas pueden crecer con los datos. `capaServidor/src/modules/orders/repo/orders.repo.js`, `capaServidor/src/modules/metrics/service/metrics.service.js`. |
| H20 | Abierto | P1 | El lint frontend no pasa: `KanbanOffCanvas.jsx` declara `onUpdateOrder` sin uso; `MetricsPage.jsx` tiene declaraciones sin uso y errores de reglas React sobre `setState` en efecto y mutación de variable durante render. `npm run build` sí pasa, lo que no sustituye lint ni cobertura funcional. |
| H21 | Por corregir/endurecer | P1 | La exportación PDF de métricas compone HTML con `document.write` e interpola nombres de vendedor sin escape. Las altas administrativas restringen nombres, así que no se confirmó una ruta explotable; aun así, el render debe escapar o construir nodos seguros antes de exponer la exportación a datos heredados/importados. `capaVista/src/modules/metrics/pages/MetricsPage.jsx`. |
| H22 | Abierto | P0 | Deriva de autorización: el modelo actual define 27 permisos; `scripts/rbac.mjs` solo describe 23 y el snapshot observado no incluye `manage:production-load`, `view:metrics`, `view:kanban-module` y `view:payments-module`. El código de roles ya concede algunos permisos nuevos, pero documentación/tenant no tienen evidencia actual coincidente. Completar descripciones, regenerar documentación y verificar cada rol y token en Auth0. `shared/authorization.js`, `scripts/rbac.mjs`, `docs/auth0/RBAC-PERMISOS-POR-ROL.md`. |
| H23 | Abierto | P1 | La matriz de requisitos en [el mapa parcial anterior](https://github.com/Grupo10ingsoftware/itecsa-app/blob/458e9ad/capaVista/src/config/requirementsMap.js) solo cubre una selección de archivos y referencias UR; no es trazabilidad RF01–RF75. No puede usarse para demostrar cobertura funcional. |

## Contradicciones de alcance y documentación

1. El frontend README afirma que `/ordenes/nuevo` conserva mocks y `sessionStorage`; la implementación actual llama a la API. Actualizar la guía para evitar despliegues/pruebas basados en un flujo inexistente.
2. README raíz/arquitectura describen una fuente local fixture para notas de venta, no integración real. El fixture no satisface una integración de origen canónico ni debe presentarse como tal.
3. La lista RBAC generada, el snapshot observado, la documentación de 23/24 permisos y el modelo de 27 permisos no están sincronizados. Una confirmación histórica del dashboard no demuestra las asignaciones actuales de todos los roles.
4. La auditoría previa es de una revisión anterior: su matriz aún hace referencia a documentos/rutas PDF eliminados y a inventario de dependencias anterior. Consultar este documento para el delta y el anterior para el detalle técnico de los hallazgos que permanecen abiertos.

## Secuencia recomendada para comenzar

1. **Bloqueantes locales:** restringir permisos de `.env` y acordar rotación; exigir entorno seguro al arrancar y eliminar OTP de logs; hacer atómicos los límites/consumo de PIN; responder errores 500 con contrato genérico; resolver el DTO/origen autoritativo de creación de pedidos.
2. **Cerrar release gates:** corregir lint; triage y remediar advisories npm sin actualizar major a ciegas; verificar RBAC y binding/roles con evidencia del tenant; decidir si Support puede existir en producción.
3. **Aprobaciones de negocio/privacidad:** obtener RF/UR fuente vigente, definir acceso por rol a comentarios/datos de cliente/historial de pago, retención y finalidades de métricas antes de cambiar reglas o borrar datos.
4. **Prueba funcional trazable:** matriz RF→pantalla→endpoint→permiso→persistencia→casos de aceptación; cubrir roles autorizados/denegados y transiciones en pruebas. Después validar en un entorno controlado con datos sintéticos.
5. **Evidencia operativa:** revisar TLS, almacenamiento, secretos, aislamiento, backups/restauración, logging, monitoreo y proceso de incidentes en el despliegue real; nada de eso queda demostrado por tests locales.

## Verificaciones ejecutadas

- `cd capaServidor && npm test`: pasa.
- `cd capaVista && npm test`: pasa.
- `cd capaVista && npm run lint`: falla (6 errores, 1 warning).
- `cd capaVista && npm run build`: pasa.
- `npm audit --json` en ambas capas: resultados resumidos en el estado ejecutivo.
- `node scripts/rbac.mjs --check docs/auth0/rbac.observed.json`: detecta cuatro permisos faltantes en el snapshot y evidencia incompleta de roles/binding; no hizo escrituras.

No se modificó lógica funcional ni se cambió configuración local durante esta auditoría.
