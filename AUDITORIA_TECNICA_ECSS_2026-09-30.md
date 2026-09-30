# Auditoría técnica ECSS — Itecsa App

**Fecha:** 30-09-2026  
**Rama:** `dev`  
**Commit auditado:** `17974b7612756c5eaa3350289dde40ff987637e8`  
**Estado inicial:** `dev` coincidente con `origin/dev`; árbol de trabajo limpio antes de crear estos entregables.  
**Tipo de revisión:** análisis estático y pruebas locales sin modificar código, base de datos, dependencias ni servicios externos.

## A. Resumen ejecutivo

La aplicación contiene controles técnicos sólidos de autenticación, autorización, PIN, transacciones y protección de errores. No obstante, persisten problemas críticos o altos en la cadena de migraciones, la integración de notas de venta, la fuente de datos de Production Calendar, la verificación del tenant Auth0 y la evidencia de verificación.

Se identificaron además:

- 5 archivos backend no alcanzables desde los entry points.
- 36 archivos frontend no alcanzables.
- Funciones, exports, constantes y datos mock sin consumidores.
- Infraestructura duplicada para errores, request context y permisos.
- Fakes, fixtures y datos demo dentro del árbol productivo.
- 74 archivos de pruebas correctamente separados del runtime: 59 backend y 15 frontend.

Los archivos de prueba no implementan funcionalidad productiva y ningún archivo de `src` los importa. Su eliminación literal sin una suite equivalente externa eliminaría la protección de regresión y degradaría la verificabilidad del producto. Por solicitud del equipo, su traslado y eliminación se incorpora como la última fase del plan de acción.

## B. Alcance y metodología

### Alcance incluido

- Código frontend y backend.
- Entry points y grafo de imports.
- Funciones y exports sin uso.
- Código muerto y estilos muertos.
- Mocks, fixtures, fakes y datos demo.
- Duplicación técnica.
- Autenticación, autorización, PIN y errores.
- Prisma, schema y migraciones.
- Configuración, dependencias y CI.
- Testing y separación runtime/test.

### Alcance excluido

Por instrucción del solicitante, los entregables documentales ECSS, planes, matrices y documentación formal se consideran cubiertos externamente. No generan hallazgos ni acciones en esta revisión.

### Referencias utilizadas

- ECSS-E-ST-40C Rev.1.
- ECSS-Q-ST-80C Rev.2.
- ECSS-E-ST-80C.
- ECSS-E-HB-40A únicamente como orientación interpretativa.

### Comprobaciones ejecutadas

| Comprobación | Resultado |
|---|---|
| Backend `RUN_MYSQL_INTEGRATION=false npm test` | 791 tests: 789 correctos, 2 omitidos, 0 fallidos |
| Frontend `npm test` | Correcto |
| Frontend `npm run lint` | Correcto |
| Prisma `npm run prisma:validate` | Correcto |
| `scripts/verify-data-artifacts.sh` | Correcto |
| Chequeo RBAC | Faltan `manage:production-load` y `view:metrics`; roles y Post Login sin verificar |
| Grafo de imports | 5 archivos backend y 36 frontend no alcanzables |
| Imports desde carpetas `test` | Ninguno |
| Estado Git tras inspección | Limpio |

No se ejecutaron migraciones, conexiones a DB compartida, cambios Auth0, envíos Resend, `npm audit`, pentest ni deployment.

## C. Mapa técnico

```text
React / Vite
    │
    ├── Auth0 Universal Login
    │
    ▼
Express
    ├── JWT issuer/audience
    ├── identidad interna activa
    ├── capability por ruta
    └── PIN en operaciones sensibles
          │
          ▼
Controllers → Services → Repositories
          │
          ├── Prisma → MySQL/Aiven
          ├── Auth0 Management API
          ├── Resend
          └── Fixture de notas de venta
```

### Entry points

- Frontend: `capaVista/src/main.jsx`.
- Backend productivo: `capaServidor/src/app/app.js`.
- Backend desarrollo: `capaServidor/src/app/dev.js`.

`dev.js` no es código muerto: es el entry point de `npm run dev`.

### Módulos

Auth, Users, Orders, Kanban, Payments, History, Messages, Production Calendar, Production Capacity, Production Load, Metrics, Clients, Products, Profile, Health, Security y Demo Orders.

`productionHistory` existe físicamente, consume mocks y no está conectado al router.

## D. Aplicabilidad ECSS

| Área | Aplicabilidad |
|---|---|
| Implementación, diseño y código | Aplicable |
| Verificación y testing | Aplicable |
| Configuration management técnico | Aplicable |
| Seguridad de software | Aplicable |
| Datos y persistencia | Aplicable |
| Dependencias y supply chain | Aplicable |
| Código muerto y desactivado | Aplicable |
| Cobertura por criticality | REQUIERE TAILORING |
| Código generado por Prisma | REQUIERE TAILORING |
| FPGA y dispositivos programables | NO APLICA |
| Software destinado a reutilización externa | NO APLICA |
| Entregables documentales | Excluidos de esta revisión |

## E. ECSS-E-ST-40C Rev.1 — Evaluación técnica

| Área | Estado | Resultado |
|---|---|---|
| Arquitectura e implementación | CUMPLE PARCIALMENTE | Separación por capas, pero integraciones incompletas y archivos de gran tamaño |
| Unit testing | CUMPLE PARCIALMENTE | Cobertura funcional amplia; coverage no medido |
| Validación | CUMPLE PARCIALMENTE | Sin entorno integrado DB/Auth0/Manager verificado |
| Verificación de código | CUMPLE PARCIALMENTE | Lint frontend; backend sin lint y con código muerto |
| Manejo de errores | CUMPLE PARCIALMENTE | Ruta activa segura; implementaciones duplicadas |
| Integración de notas de venta | NO CUMPLE | Fixture usado por defecto; Manager no implementado |
| Integridad de migraciones | NO CUMPLE | La secuencia versionada no reproduce el schema actual |
| Operación real | NO DETERMINABLE | Infraestructura externa no inspeccionada |
| Seguridad técnica | CUMPLE PARCIALMENTE | Controles locales fuertes; tenant y auditoría operativa no verificados |

## F. ECSS-Q-ST-80C Rev.2 — Product assurance técnico

| Control | Estado | Evidencia |
|---|---|---|
| Código muerto/desactivado | NO CUMPLE | 41 archivos productivos no alcanzables |
| Configuration management | CUMPLE PARCIALMENTE | Git y lockfiles presentes; migraciones no reproducibles |
| Coding standards | CUMPLE PARCIALMENTE | ESLint frontend; backend sin equivalente |
| Complejidad | NO CUMPLE | Archivos de hasta 1.261 líneas sin límites automáticos |
| Testing | CUMPLE PARCIALMENTE | Suites amplias; coverage y validación operacional ausentes |
| Separación test/runtime | CUMPLE | Ningún módulo productivo importa desde `test` |
| Datos de prueba | CUMPLE PARCIALMENTE | Tests separados; mocks y fakes permanecen dentro de `src` |
| Dependencias | CUMPLE PARCIALMENTE | Lockfiles con integrity; vulnerabilidades actuales no verificadas |
| Métricas de calidad | NO CUMPLE | Sin coverage, complejidad o densidad de defectos |
| Código generado | REQUIERE TAILORING | Prisma Client |

## G. ECSS-E-ST-80C — Seguridad

| Control | Estado |
|---|---|
| JWT issuer/audience | CUMPLE |
| Identidad interna activa | CUMPLE |
| Autorización por capability | CUMPLE |
| Tenant Auth0 real | NO DETERMINABLE |
| Least privilege | CUMPLE PARCIALMENTE |
| Fail secure | CUMPLE |
| Defence-in-depth | CUMPLE |
| Secretos actuales en Git | CUMPLE |
| PIN | CUMPLE PARCIALMENTE |
| Auditoría de seguridad | CUMPLE PARCIALMENTE |
| Supply chain | CUMPLE PARCIALMENTE |
| Pentest | NO CUMPLE |
| Monitoreo operativo | NO DETERMINABLE |
| Superficie demo | CUMPLE PARCIALMENTE |

## H. Aplicación interpretativa de ECSS-E-HB-40A

- El código no alcanzable debe eliminarse o justificarse.
- La cobertura ayuda a localizar rutas sin ejecutar.
- La limpieza debe protegerse con pruebas antes y después.
- Las dependencias cíclicas, archivos grandes y duplicación reducen testabilidad.
- Robustez requiere verificar entradas anómalas y degradación segura.
- Eliminar pruebas sin reemplazo rompe la cadena de evidencia de verificación.

## I. Auditoría transversal

| Área | Estado | Hallazgo |
|---|---|---|
| Frontend runtime | CUMPLE PARCIALMENTE | CODE-001, MOCK-001 |
| Backend runtime | CUMPLE PARCIALMENTE | CODE-001, DUP-001 |
| Base de datos | NO CUMPLE | DB-001 |
| Integración Manager | NO CUMPLE | INT-001 |
| Production Calendar | NO CUMPLE | CAL-001 |
| Authentication | CUMPLE | — |
| Authorization | CUMPLE PARCIALMENTE | AUTH-001 |
| PIN | CUMPLE PARCIALMENTE | ENV-001 |
| Error handling | CUMPLE PARCIALMENTE | DUP-001 |
| Logging/auditoría | CUMPLE PARCIALMENTE | SEC-001 |
| Testing | CUMPLE PARCIALMENTE | VER-001 |
| Separación test/runtime | CUMPLE | — |
| Mocks en runtime | NO CUMPLE | MOCK-001 |
| Código muerto | NO CUMPLE | CODE-001 |
| Símbolos sin uso | NO CUMPLE | CODE-002 |
| Duplicación | NO CUMPLE | DUP-001 |
| Coverage | NO CUMPLE | VER-001 |
| Static analysis backend | NO CUMPLE | VER-001 |
| Performance | NO CUMPLE | PERF-001 |
| CI | CUMPLE PARCIALMENTE | CI-001 |
| Deployment | NO DETERMINABLE | ENV-001 |

## J. Auditoría por módulo

| Módulo | Resultado |
|---|---|
| Auth | Seguro funcionalmente; provider fake dentro de `src` |
| Users | RBAC correcto en código; tenant no verificado |
| Orders | Transaccional y protegido; depende del fixture de NV |
| Kanban | Activo; puede fallar por schema físico desactualizado |
| Payments | PIN y locks sólidos; comparte la fuente fixture de NV |
| History | Activo; `productionHistory` es un prototipo separado y muerto |
| Messages | Activo; usa error handling central |
| Production Calendar frontend | Consume API real, pero importa constantes desde un archivo mock |
| Production Calendar backend | Confía en pedidos recibidos desde el cliente para calcular carga |
| Production Capacity | Activo |
| Production Load | Activo y con validación más estricta que el cálculo antiguo de Calendar |
| Metrics | Activo; exactitud y performance no medidas |
| Clients/Products | Activos |
| Profile | Activo |
| Health | Activo; configuración real no verificada |
| Security | Activo; depende de la migración física pendiente |
| DemoOrders | Bloqueado en producción, pero presente dentro de `src` |
| ProductionHistory | No alcanzable y basado en mocks |

## K. Registro maestro de hallazgos

| ID | Hallazgo | Estado | Severidad | Confianza |
|---|---|---|---:|---:|
| DB-001 | Migraciones no reproducen el schema actual | NO CUMPLE | Crítica | Alta |
| INT-001 | Orders/Payments usan fixture de NV por defecto | NO CUMPLE | Alta | Alta |
| CAL-001 | Cálculo operacional confía en pedidos del cliente | NO CUMPLE | Alta | Alta |
| AUTH-001 | RBAC observado incompleto o no verificado | CUMPLE PARCIALMENTE | Alta | Alta |
| SEC-001 | Auditoría sin inmutabilidad ni assurance operativo acreditado | CUMPLE PARCIALMENTE | Alta | Alta |
| DATA-001 | Constraints de dominio insuficientes | CUMPLE PARCIALMENTE | Alta | Alta |
| ENV-001 | Estado real DB/Auth0/Resend/deployment desconocido | NO DETERMINABLE | Alta | Alta |
| VER-001 | Sin coverage, lint backend o validación operacional completa | NO CUMPLE | Alta | Alta |
| TEST-DEL-001 | Borrar tests sin reemplazo destruye la red de regresión | NO CUMPLE | Alta | Alta |
| CODE-001 | 41 archivos productivos no alcanzables | NO CUMPLE | Media | Alta |
| CODE-002 | Funciones, exports y constantes sin uso | NO CUMPLE | Media | Media-Alta |
| DUP-001 | Errores, request context y permisos duplicados | NO CUMPLE | Media | Alta |
| MOCK-001 | Mocks, fixtures y fakes dentro del runtime | NO CUMPLE | Media | Alta |
| ROB-001 | Fechas/cantidades inválidas pueden normalizarse u omitirse | NO CUMPLE | Media | Alta |
| CLIENT-001 | Requests frontend sin política general de timeout | CUMPLE PARCIALMENTE | Media | Alta |
| PERF-001 | Sin presupuesto ni medición representativa | NO CUMPLE | Media | Alta |
| CI-001 | CI no valida push a `dev` y no reproduce migraciones | CUMPLE PARCIALMENTE | Media | Alta |
| DEP-001 | Vulnerabilidades actuales no determinadas | NO DETERMINABLE | Media | Alta |
| ROOT-001 | `package-lock.json` raíz vacío y sin `package.json` | NO CUMPLE | Baja | Alta |

## L. Causas raíz

1. Funcionalidades reemplazadas sin retirar implementaciones anteriores.
2. Uso prolongado de mocks como sustitutos de integraciones reales.
3. Falta de gate automático para código no alcanzable y exports sin uso.
4. Infraestructura transversal creada en distintas etapas sin consolidación.
5. Base preexistente no reconciliada con Prisma migrations.
6. CI valida el schema final, pero no la historia de migraciones.
7. Falta de coverage y análisis estático backend.
8. Confusión entre excluir tests del runtime y eliminar la capacidad de probar.

## M. Inventario de archivos no alcanzables

### Backend: 5

1. `capaServidor/src/middlewares/requestContext.js`
2. `capaServidor/src/middlewares/requirePermission.js`
3. `capaServidor/src/modules/orders/service/createOrderInput.js`
4. `capaServidor/src/modules/payments/controller/paymentError.js`
5. `capaServidor/src/shared/httpResponse.js`

### Frontend: 36

#### `productionHistory`: 19

- `components/OrderHistorySummary.jsx`
- `components/OrderHistorySummary.module.css`
- `components/ProductionHistoryFilters.jsx`
- `components/ProductionHistoryFilters.module.css`
- `components/ProductionHistoryRow.jsx`
- `components/ProductionHistoryTable.jsx`
- `components/ProductionHistoryTable.module.css`
- `components/SampleHistoryItem.jsx`
- `components/SampleHistoryItem.module.css`
- `components/SampleHistoryList.jsx`
- `components/SampleHistoryList.module.css`
- `components/StatusPill.jsx`
- `components/StatusPill.module.css`
- `mocks/productionHistory.mock.js`
- `pages/ProductionHistoryDetailPage.jsx`
- `pages/ProductionHistoryDetailPage.module.css`
- `pages/ProductionHistoryPage.jsx`
- `pages/ProductionHistoryPage.module.css`
- `utils/productionHistoryFormatters.js`

#### Otros: 17

- `config/productTypes.js`
- `config/requirementsMap.js`
- `hooks/useFormValidation.js`
- `hooks/useRoleAccess.js`
- `modules/auth/components/LoginForm.jsx`
- `modules/auth/components/PasswordRules.jsx`
- `modules/auth/utils/authValidation.js`
- `modules/kanban/styles/KanbanOffCanvas.module.css`
- `modules/productionCalendar/components/CalendarSummaryCards.jsx`
- `modules/productionCalendar/components/CalendarSummaryCards.module.css`
- `shared/components/data/StatusBadge.jsx`
- `shared/components/forms/SelectInput.jsx`
- `shared/components/forms/SelectInput.module.css`
- `shared/components/forms/TextInput.jsx`
- `utils/formatters.js`
- `utils/validator.js`
- `utils/validators.js`

La lista se basa en el grafo de imports desde los entry points. Debe volver a verificarse después de los refactors y antes de borrar.

## N. Funciones, exports y datos sin uso

### Sin referencias productivas confirmadas

- `isNonProductionEnvironment`.
- `parseBooleanEnvironment`.
- `PAYMENT_STATUS_VALUES`.
- `ORDER_STATUS_VALUES`.
- `stripLanyardProgressObservation`.
- `normalizeText` de `order.service.js`.
- `UnavailableExternalSalesNoteRepository`.
- `PRODUCTION_CALENDAR_ITEMS`.
- `middlewares/errorHandler.errorHandler`.
- Exports contenidos en los archivos frontend no alcanzables.

### Usados únicamente por pruebas

- `MOVE_KANBAN_TO_PRODUCTION_PERMISSION`.
- `disconnectPrismaClient`.
- `sendOrderError`.
- `sendOrderOperationError`.
- `sendPaymentError`.
- `FakePinDeliveryProvider`.
- `requirePermission`.

Estos símbolos no deben borrarse individualmente hasta migrar o trasladar las pruebas que todavía los importan.

## O. Duplicación técnica

### Error model

- `errors/AppError.js`.
- `shared/appError.js`.

Ambos modelos están activos y usan constructores incompatibles.

### Error handling

- `errors/httpErrors.js#errorHandler` activo.
- `middlewares/errorHandler.js#errorHandler` no usado.
- `shared/httpResponse.js` no alcanzable.
- `paymentError.js` usado solamente por tests.
- `sendOrderError` y `sendOrderOperationError` usados solamente por tests.

### Request context

- `errors/httpErrors.js#requestContext` activo.
- `middlewares/requestContext.js` no alcanzable.

### Autorización

- `requireCapability.js` activo.
- `requirePermission.js` reemplazado y usado únicamente por tests.

### Archivos vacíos idénticos

- `hooks/useFormValidation.js`.
- `hooks/useRoleAccess.js`.
- `utils/validator.js`.
- `styles/bootstrap-overrides.css`.

El CSS vacío está alcanzable por un import y debe retirarse junto con dicho import.

## P. Mocks, fixtures y fakes dentro del runtime

| Componente | Situación |
|---|---|
| `productionCalendar.mock.js` | El módulo activo importa `PRODUCTION_STATUSES`; el arreglo `PRODUCTION_CALENDAR_ITEMS` está muerto |
| `productionHistory.mock.js` | Solo alimenta el módulo `productionHistory`, que es inalcanzable |
| `fakePinDelivery.js` | Importado estáticamente desde el servicio productivo; solo se instancia en `NODE_ENV=test` |
| `sales-notes-fixture.json` | Es la fuente predeterminada de Orders/Payments en desarrollo; sin demo, responde 503 |
| `demoOrders` | Código demo dentro de `src`; correctamente bloqueado en producción |

## Q. Archivos de prueba

### Inventario

- `capaServidor/test`: 59 archivos.
- `capaVista/test`: 15 archivos.
- Total: 74 archivos.

### Resultado

- Ningún archivo productivo importa desde esas carpetas.
- No forman parte del bundle frontend.
- No forman parte del entry point normal backend.
- Ejercitan los módulos productivos externamente.

### Riesgo de eliminación

- El script frontend `npm test` referencia archivos concretos y fallará.
- El CI perderá comprobaciones de autorización, PIN, Orders y Payments.
- La limpieza dejará de tener protección de regresión.
- La reauditoría no podrá demostrar cierre si no existe una suite equivalente.

La eliminación se acepta como decisión del equipo únicamente después de trasladar la suite a un repositorio o paquete de verificación externo.

## R. Configuración, datos y dependencias

- Lockfiles backend/frontend presentes y con integrity.
- No se encontraron secretos actuales versionados.
- Las rutas demo están prohibidas en producción.
- El alta de pedidos queda inutilizable sin demo porque falta Manager.
- CI materializa `schema.prisma` desde cero, ocultando los defectos de la cadena de migraciones.
- CI no se ejecuta ante push directo a `dev`.
- El estado actual de vulnerabilidades es NO DETERMINABLE sin acceso al registro npm.
- El `package-lock.json` raíz está vacío.

## S. Matriz consolidada

| Estado | Familias técnicas |
|---|---:|
| CUMPLE | 8 |
| CUMPLE PARCIALMENTE | 12 |
| NO CUMPLE | 11 |
| NO DETERMINABLE | 3 |
| NO APLICA | 2 |
| REQUIERE TAILORING | 2 |
| **Total** | **38** |

## T. Elementos no determinables

1. Estado físico de la DB `dev`.
2. Migraciones realmente aplicadas.
3. Error exacto emitido por Kanban en `dev`.
4. Tenant Auth0 desplegado.
5. Post Login Action real.
6. Configuración Resend.
7. TLS real hacia la DB.
8. Vulnerabilidades actuales de dependencias.
9. Deployment y rollback.
10. Monitoreo, alertas, backups y restauración.

## U. Criterio de cierre

La auditoría podrá cerrarse cuando:

- Las migraciones sean reproducibles y no exista drift.
- Kanban y alta de pedidos funcionen en el entorno integrado.
- Manager sustituya al fixture.
- Production Calendar use datos autoritativos.
- RBAC real coincida con el catálogo.
- No queden archivos o símbolos no alcanzables sin justificación.
- Exista una sola infraestructura de errores, request context y autorización.
- No queden mocks/fakes dentro del runtime productivo.
- La suite de verificación continúe ejecutándose después de retirar las carpetas `test` del repositorio de aplicación.

El plan de remediación asociado se encuentra en `PLAN_ACCION_AUDITORIA_ECSS_2026-09-30.md`.
