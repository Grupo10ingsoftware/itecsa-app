# Plan de acción — Auditoría técnica ECSS Itecsa App

**Fecha:** 30-09-2026  
**Baseline:** `17974b7612756c5eaa3350289dde40ff987637e8`  
**Auditoría relacionada:** `AUDITORIA_TECNICA_ECSS_2026-09-30.md`

## 1. Principios de ejecución

1. Un cambio controlado por PR.
2. Capturar comportamiento antes de refactorizar.
3. No mezclar migraciones con limpieza de código.
4. No eliminar una implementación duplicada hasta migrar todos sus consumidores.
5. No retirar fixtures hasta activar la integración real.
6. No eliminar pruebas hasta que la suite equivalente funcione fuera del repositorio de aplicación.
7. Toda eliminación debe ser reversible mediante un commit pequeño.
8. La documentación formal está fuera del alcance de este plan.

## 2. Priorización

| Prioridad | Cambios |
|---|---|
| P0 | DB-01, INT-01, CAL-01, AUTH-01 |
| P1 | SEC-01, DATA-01, ROB-01, VER-01, CI-01 |
| P2 | CLEAN-01 a CLEAN-07 |
| Final destructivo | CLEAN-08 y CLEAN-09 |

## 3. Grafo de dependencias

```text
BASE-01 Capturar baseline
├── DB-01 Migraciones
│   ├── Kanban integrado
│   ├── Security tables
│   └── INT-01 Manager
├── AUTH-01 Auth0
├── CAL-01 Calendar autoritativo
└── VER-01 Verificación
    ├── SEC-01 / DATA-01 / ROB-01
    ├── CI-01
    └── Limpieza final
        ├── CLEAN-01 Duplicados
        ├── CLEAN-02 Backend muerto
        ├── CLEAN-03 ProductionHistory
        ├── CLEAN-04 Frontend muerto
        ├── CLEAN-05 Símbolos sin uso
        ├── CLEAN-06 Mocks/fakes
        ├── CLEAN-07 Vacíos
        ├── CLEAN-08 Traslado/eliminación de tests
        └── CLEAN-09 Reauditoría
```

## 4. Fase 0 — Baseline

### BASE-01 — Capturar comportamiento actual

**Objetivo:** disponer de una referencia antes de cualquier corrección.

**Pasos:**

1. Registrar commit, versión Node, versiones instaladas y configuración no secreta.
2. Ejecutar backend tests.
3. Ejecutar frontend tests.
4. Ejecutar lint frontend.
5. Ejecutar Prisma validate.
6. Ejecutar build frontend.
7. Guardar resultados y logs sin secretos.

**Criterio de cierre:** baseline reproducible asociado a un commit.

## 5. Fase 1 — Restablecimiento funcional

### DB-01 — Reconciliar migraciones

**Hallazgos:** DB-001, DATA-001, ENV-001.  
**Prioridad:** P0.  
**Severidad:** Crítica.

**Pasos:**

1. Ejecutar preflight read-only sobre una conexión autorizada.
2. Comparar schema físico, `schema.prisma` e historial `_prisma_migrations`.
3. Crear una base MySQL vacía.
4. Ejecutar exclusivamente la cadena versionada.
5. Identificar columnas/tablas que el historial no crea.
6. Crear migraciones de reconciliación aditivas.
7. Probar sobre copia aislada representativa.
8. Verificar datos históricos NULL y duplicados.
9. Preparar backup y rollback.
10. Aplicar en `dev` durante ventana autorizada.
11. Ejecutar `migrate status`, drift check y pruebas funcionales.

**Pruebas:** Orders, Kanban, Payments, SecurityThrottle, SecurityAuditEvent, locks y rollback.

**Criterio de cierre:** una base vacía y una copia histórica llegan al mismo schema mediante las migraciones versionadas.

### INT-01 — Integración Manager

**Hallazgo:** INT-001.  
**Prioridad:** P0.  
**Severidad:** Alta.  
**Dependencia:** DB-01.

**Pasos:**

1. Definir el contrato mínimo de consulta read-only.
2. Crear un adapter independiente de Prisma del producto.
3. Aplicar timeout y cancelación.
4. Validar número de NV, cliente, items, cantidades y versión.
5. Mapear errores externos a respuestas seguras.
6. Probar indisponibilidad, timeout, respuesta inválida y duplicados.
7. Seleccionar el adapter por ambiente.
8. Configurar producción para usar exclusivamente Manager.
9. Eliminar el alias `SalesNoteSourceService → FixtureSalesNoteRepository`.
10. Retirar la fixture del artefacto productivo en CLEAN-06.

**Criterio de cierre:** alta y reevaluación funcionan sin `ENABLE_DEMO_ROUTES`.

### CAL-01 — Production Calendar autoritativo

**Hallazgos:** CAL-001, ROB-001.  
**Prioridad:** P0.  
**Severidad:** Alta.

**Pasos:**

1. Cambiar el endpoint para aceptar solamente rango y filtros.
2. Consultar pedidos y detalles desde el backend.
3. Impedir que el cliente envíe cantidades, estado o fecha autoritativa.
4. Validar fechas mediante round-trip `YYYY-MM-DD`.
5. Validar capacidad como entero positivo.
6. Rechazar items inválidos en vez de omitirlos silenciosamente.
7. Probar manipulación de payload.

**Criterio de cierre:** el cliente no puede alterar el cálculo de carga.

### AUTH-01 — Reconciliar Auth0

**Hallazgo:** AUTH-001.  
**Prioridad:** P0.  
**Severidad:** Alta.

**Pasos:**

1. Exportar el estado real del tenant.
2. Comparar catálogo esperado y observado.
3. Agregar `manage:production-load`.
4. Agregar `view:metrics`.
5. Verificar permisos de cada uno de los ocho roles.
6. Verificar el binding Post Login.
7. Probar rol único, usuario interno activo y capabilities.
8. Ejecutar nuevamente `rbac.mjs --check`.

**Rollback:** conservar export previo del tenant.

**Criterio de cierre:** chequeo RBAC sin diferencias y matriz por rol correcta.

## 6. Fase 2 — Seguridad, integridad y robustez

### SEC-01 — Asegurar auditoría

**Hallazgo:** SEC-001.

**Pasos:**

1. Confirmar que `SecurityAuditEvent` existe físicamente.
2. Limitar UPDATE/DELETE al usuario runtime.
3. Detectar y alertar fallos de persistencia.
4. Definir comportamiento cuando un evento obligatorio no puede guardarse.
5. Probar request ID, actor, acción, recurso y resultado.
6. Probar recuperación y retención operacional.

**Criterio de cierre:** pérdida o manipulación de evidencia es detectable.

### DATA-01 — Fortalecer constraints

**Hallazgo:** DATA-001.  
**Dependencia:** DB-01.

**Pasos:**

1. Clasificar NULL históricos válidos.
2. Definir NOT NULL, CHECK y FK aplicables.
3. Identificar cantidades y estados inválidos.
4. Limpiar datos solamente en copia autorizada.
5. Crear migraciones aditivas.
6. Probar rollback y concurrencia.

**Criterio de cierre:** la DB rechaza estados, relaciones y cantidades imposibles acordadas.

### ROB-01 — Robustez y timeouts

**Hallazgos:** ROB-001, CLIENT-001, PERF-001.

**Pasos:**

1. Rechazar fechas normalizadas por JavaScript.
2. Rechazar capacidades cero, negativas o no enteras.
3. Agregar timeout y `AbortController` a llamadas frontend.
4. Definir límites de rango y payload.
5. Medir consultas de Orders, History y Metrics con datos representativos.
6. Agregar pruebas boundary y de indisponibilidad.

**Criterio de cierre:** entradas inválidas generan 4xx determinista y ninguna request queda abierta indefinidamente.

## 7. Fase 3 — Verificación y CI

### VER-01 — Red de seguridad

**Hallazgos:** VER-001, TEST-DEL-001.

**Pasos:**

1. Añadir lint backend.
2. Medir coverage backend/frontend.
3. Establecer baseline y umbrales acordados.
4. Ejecutar integración MySQL.
5. Incorporar E2E Auth0 por rol.
6. Incorporar tests Manager.
7. Incorporar tests autoritativos de Calendar.
8. Ejecutar build y smoke tests.

**Criterio de cierre:** toda funcionalidad crítica tiene una prueba automatizada antes de iniciar CLEAN-01.

### CI-01 — Corregir gates

**Hallazgo:** CI-001.

**Pasos:**

1. Ejecutar el workflow en pushes a `dev`.
2. Reproducir migrations desde vacío.
3. Comparar el resultado con `schema.prisma`.
4. Incorporar lint backend y coverage.
5. Incorporar detector de imports/exports huérfanos.
6. Fallar ante mocks/fakes no autorizados dentro del runtime.
7. Mantener dependency audit y secret scan.

**Criterio de cierre:** CI detecta una migración faltante y un archivo productivo no alcanzable introducido deliberadamente en una rama de prueba.

## 8. Fase 4 — Limpieza final

Esta fase se ejecuta únicamente cuando las fases funcionales, de seguridad y verificación están cerradas.

### CLEAN-01 — Consolidar duplicados

**Objetivo:** dejar una sola implementación de cada infraestructura transversal.

**Cambios:**

- Unificar `errors/AppError.js` y `shared/appError.js`.
- Conservar un solo `respondError` y un solo `errorHandler`.
- Conservar un solo `requestContext`.
- Conservar `requireCapability` y retirar `requirePermission`.
- Migrar consumidores y tests antes de borrar helpers antiguos.

**Regresiones a vigilar:** códigos HTTP, mensajes públicos, request ID, errores Auth0, Prisma, PIN, Orders y Payments.

### CLEAN-02 — Eliminar backend no alcanzable

Eliminar, después de confirmar cero consumidores:

1. `capaServidor/src/middlewares/requestContext.js`
2. `capaServidor/src/middlewares/requirePermission.js`
3. `capaServidor/src/modules/orders/service/createOrderInput.js`
4. `capaServidor/src/modules/payments/controller/paymentError.js`
5. `capaServidor/src/shared/httpResponse.js`

### CLEAN-03 — Eliminar `productionHistory`

Eliminar el directorio completo `capaVista/src/modules/productionHistory`: 11 archivos JS/JSX y 8 CSS.

### CLEAN-04 — Eliminar otros archivos frontend no alcanzables

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

### CLEAN-05 — Eliminar símbolos sin uso

Revalidar y eliminar:

- `isNonProductionEnvironment`.
- `parseBooleanEnvironment`.
- `PAYMENT_STATUS_VALUES`.
- `ORDER_STATUS_VALUES`.
- `stripLanyardProgressObservation`.
- `normalizeText` de `order.service.js`.
- `UnavailableExternalSalesNoteRepository` después de Manager.
- `PRODUCTION_CALENDAR_ITEMS`.
- `middlewares/errorHandler.errorHandler`.

Símbolos test-only que se eliminan después de trasladar la suite:

- `MOVE_KANBAN_TO_PRODUCTION_PERMISSION`.
- `disconnectPrismaClient` si no tiene uso de shutdown.
- `sendOrderError`.
- `sendOrderOperationError`.
- `sendPaymentError`.
- `FakePinDeliveryProvider`.
- `requirePermission`.

### CLEAN-06 — Retirar mocks, fixtures y fakes

1. Mover `PRODUCTION_STATUSES` a un módulo de constantes productivo.
2. Eliminar `PRODUCTION_CALENDAR_ITEMS`.
3. Eliminar `productionCalendar.mock.js`.
4. Mover `FakePinDeliveryProvider` a la suite externa.
5. Inyectar el provider desde pruebas.
6. Eliminar la fixture de NV después de habilitar Manager.
7. Eliminar `demoOrders` si tailoring determina que no se conserva.
8. Eliminar ramas y comentarios destinados solo a mocks.

### CLEAN-07 — Retirar archivos vacíos y artefactos raíz

- Retirar el import y eliminar `styles/bootstrap-overrides.css`.
- Confirmar eliminación de los hooks y validator vacíos.
- Eliminar `package-lock.json` raíz si se confirma que no existe proyecto npm raíz.
- Retirar directorios vacíos y `.gitkeep` que ya no tengan propósito.

### CLEAN-08 — Trasladar y eliminar los tests

**Objetivo solicitado:** retirar los 74 archivos de prueba del repositorio de aplicación sin perder la capacidad de verificar el producto.

**Orden obligatorio:**

1. Ejecutar por última vez los 59 archivos backend y 15 frontend.
2. Guardar resultados y coverage asociados al commit.
3. Copiar o mover las suites a un repositorio/paquete de verificación externo.
4. Configurar la suite externa para apuntar a un commit o artefacto del producto.
5. Ejecutarla desde CI y verificar resultado correcto.
6. Eliminar `capaServidor/test`.
7. Eliminar `capaVista/test`.
8. Actualizar los scripts `test` de ambos `package.json`.
9. Actualizar `.github/workflows/security-ci.yml` para ejecutar la suite externa.
10. Verificar que el paquete productivo no contenga tests, fixtures ni fakes.

**Bloqueo:** si no existe suite externa equivalente, la eliminación no puede cerrar TEST-DEL-001.

### CLEAN-09 — Verificación posterior

1. Ejecutar el grafo de imports.
2. Confirmar cero archivos huérfanos no justificados.
3. Confirmar cero exports sin consumidor.
4. Confirmar cero mocks/fakes dentro del runtime.
5. Ejecutar la suite externa.
6. Ejecutar build frontend.
7. Iniciar backend.
8. Ejecutar smoke test de todos los módulos.
9. Revisar tamaño del artefacto final.

## 9. Orden exacto

1. BASE-01.
2. DB-01.
3. Verificar Kanban.
4. INT-01.
5. Verificar alta y reevaluación.
6. CAL-01.
7. AUTH-01.
8. SEC-01.
9. DATA-01.
10. ROB-01.
11. VER-01.
12. CI-01.
13. CLEAN-01.
14. CLEAN-02.
15. CLEAN-03.
16. CLEAN-04.
17. CLEAN-05.
18. CLEAN-06.
19. CLEAN-07.
20. Ejecutar suite completa.
21. Trasladar suite a verificación externa.
22. CLEAN-08.
23. CLEAN-09.
24. Reauditoría final.

## 10. Distribución para siete personas

| Persona | Workstream |
|---|---|
| 1 | DB, Prisma y migraciones |
| 2 | Orders y Manager |
| 3 | Production Calendar y robustez |
| 4 | Auth0, auditoría y seguridad |
| 5 | Frontend, timeouts y limpieza UI |
| 6 | Testing, coverage y suite externa |
| 7 | CI, análisis estático y consolidación transversal |

La persona 6 controla el traslado/eliminación final de tests. La persona 7 verifica el grafo después de cada lote de limpieza.

## 11. Estrategia de integración

- Un hallazgo por PR.
- Commits de eliminación separados y revertibles.
- Migraciones en PR independiente de código funcional.
- Capturar tests antes de cada refactor transversal.
- Integrar infraestructura común antes de migrar módulos consumidores.
- No borrar fixtures antes de activar Manager.
- No borrar helpers antiguos antes de migrar tests.
- Promover local aislado → CI → staging → `dev` → aceptación.
- No desplegar si rollback y smoke tests no están disponibles.

## 12. Criterio de reauditoría final

La reauditoría debe confirmar:

1. Migraciones reproducibles y drift cero.
2. Kanban funcional.
3. Alta sin fixture.
4. Manager con timeout y validación.
5. Calendar con datos autoritativos.
6. RBAC consistente.
7. Auditoría persistente y detectable.
8. Build correcto.
9. Backend inicia correctamente.
10. Cero archivos muertos no justificados.
11. Cero funciones o exports sin uso no justificado.
12. Una sola infraestructura de errores, contexto y permisos.
13. Cero mocks/fakes en runtime productivo.
14. Cero tests en el repositorio de aplicación, si se mantiene esa decisión.
15. Suite externa ejecutada desde CI.
16. Coverage conservada o mejorada.
17. Smoke test por módulo.

El cierre requiere la cadena:

```text
Hallazgo
→ cambio
→ prueba
→ resultado
→ evidencia
→ cierre
```
