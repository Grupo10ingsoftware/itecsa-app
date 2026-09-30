# Plan de acción detallado ECSS — Itecsa App

**Fecha:** 30-09-2026
**Baseline técnico:** `17974b7612756c5eaa3350289dde40ff987637e8`
**Auditoría:** `AUDITORIA_TECNICA_ECSS_2026-09-30.md`
**Checklist:** `CHECKLIST_ECSS_REQUISITOS_2026-09-30.md`

## Regla de ejecución

`UN CAMBIO CONTROLADO A LA VEZ.` Ningún hallazgo se cierra por implementar código: se cierra sólo cuando el cambio, sus pruebas, el resultado y la evidencia quedan ligados al mismo commit/release.

Las herramientas citadas son posibles medios de implementación. Los requisitos son los resultados exigidos por ECSS; ECSS no exige una marca específica de linter, scanner o framework.

---

# PARTE T — GRAFO DE REMEDIACIÓN

```text
FASE 0  GOV-01 — baseline y evidencia reproducible
   ↓
FASE 1  TAILOR-01 + TRACE-01 — aplicabilidad y trazabilidad
   ↓
FASE 2  DB-01 → DB-02 → DB-03 — persistencia y migraciones
   ↓
FASE 3  INT-01 → INT-02 + CAL-01 + AUTH-01 — flujos críticos
   ↓
FASE 4  STD-01 + MET-01 + BUILD-01 — estándar, métricas y build
   ↓
FASE 5  SEC-01 + ROB-01 + DATA-01 — seguridad, datos y robustez
   ↓
FASE 6  VER-01 → VER-02 — cobertura y verificación automatizada
   ↓
FASE 7  CI-01 — gate obligatorio de integración
   ↓
FASE 8  CLEAN-01 → CLEAN-02 + CLEAN-03 — limpieza del producto
   ↓
FASE 9  TEST-EXT-01 → CLEAN-04 — suite externa y retiro de tests
   ↓
FASE 10 VER-03 + SEC-02 — calificación y assessment de seguridad
   ↓
FASE 11 FINAL-01 — reauditoría y cierre ECSS
```

## T.1 Bloqueantes

- La puerta de salida de cada fase bloquea la fase siguiente.
- `GOV-01` bloquea cualquier cambio de remediación.
- `TAILOR-01` bloquea los targets de coverage, independencia y security sensitivity; `TRACE-01` permanece vivo hasta el cierre.
- `DB-01` bloquea la reparación de migraciones y la validación de Kanban/Orders sobre MySQL.
- `INT-01` bloquea el cutover de Manager y el retiro del fixture.
- `VER-01`, `VER-02` y `CI-01` bloquean toda limpieza destructiva.
- `TEST-EXT-01` bloquea eliminar `capaServidor/test` y `capaVista/test`.
- `VER-03` y `SEC-02` se cierran sobre el mismo release candidate posterior a la limpieza.

## T.2 Paralelización segura

La secuencia entre fases es estricta. Dentro de una fase sólo se paralelizan cambios que no compartan archivos ni contratos y cuya entrada obligatoria ya esté satisfecha. En cada ficha, `SIGUIENTE` identifica dependientes técnicos, pero nunca autoriza saltar una puerta de fase. `TRACE-01` se actualiza transversalmente; inventarios, análisis de seguridad y preparación de ambientes pueden adelantarse, pero no permiten declarar cerrada una fase posterior. Los archivos centrales (`server.js`, `schema.prisma`, workflows, clientes API y utilidades de error) deben tener un único owner durante cada ventana.

---

# PARTE U — PLAN DE ACCIÓN POR FASES

## U.1 Mapa progresivo de fases

Cada fase se trabaja como un incremento cerrable. No se abre la fase siguiente hasta satisfacer su puerta de salida, salvo las tareas explícitamente paralelizables indicadas dentro de cada cambio.

| Fase | Foco | Cambios | Resultado de salida |
|---:|---|---|---|
| 0 | LÍNEA BASE Y CONTROL DEL CAMBIO | GOV-01 | Un tercero reproduce el baseline; cualquier diferencia está explicada. |
| 1 | APLICABILIDAD, TAILORING Y TRAZABILIDAD | TAILOR-01, TRACE-01 | Ningún control de tailoring carece de owner/decisión y ninguna referencia técnica está rota. |
| 2 | PERSISTENCIA Y MIGRACIONES | DB-01, DB-02, DB-03 | Schema vacío e histórico convergen, drift cero y smoke de Orders/Kanban/Payments correcto. |
| 3 | FLUJOS CRÍTICOS E INTEGRACIONES | INT-01, INT-02, CAL-01, AUTH-01 | Alta, reevaluación, Kanban, Payments y Calendar funcionan sin fixtures; RBAC queda zero-diff. |
| 4 | ESTÁNDAR DE CÓDIGO, MÉTRICAS Y BUILD | STD-01, MET-01, BUILD-01 | Lint/análisis de ambos proyectos sin deuda no aceptada y artefacto reproducible/inventariado. |
| 5 | SEGURIDAD TÉCNICA, DATOS Y ROBUSTEZ | SEC-01, ROB-01, DATA-01 | Fallos y entradas inválidas son deterministas; DB rechaza estados imposibles; pérdida de auditoría es detectable. |
| 6 | COBERTURA Y VERIFICACIÓN AUTOMATIZADA | VER-01, VER-02 | Targets logrados, residuales justificados y cada control sensible posee prueba trazada. |
| 7 | GATE DE INTEGRACIÓN CONTINUA | CI-01 | Cada gate falla frente a una violación deliberada y branch protection exige el workflow. |
| 8 | LIMPIEZA DEL PRODUCTO | CLEAN-01, CLEAN-02, CLEAN-03 | Grafo limpio, artifact inspection correcta y regresión completa verde. |
| 9 | EXTERNALIZACIÓN Y RETIRO DE TESTS | TEST-EXT-01, CLEAN-04 | Equivalencia de casos/coverage demostrada y CI no puede quedar verde sin la suite externa. |
| 10 | CALIFICACIÓN INTEGRADA Y ASSESSMENT DE SEGURIDAD | VER-03, SEC-02 | Resultados dentro de targets y cero vulnerabilidad sobre threshold sin waiver aprobado. |
| 11 | REAUDITORÍA Y CIERRE ECSS | FINAL-01 | Todo requisito aplicable en CUMPLE, tailoring aprobado, NO APLICA justificado y cero NO DETERMINABLE. |

## U.2 Regla de seguimiento

Para declarar una fase terminada deben existir: cambios integrados, pruebas verdes, evidencia ligada al commit, checklist actualizado, riesgos residuales tratados y aprobación de la puerta de salida. El avance se registra con `[ ]` pendiente y `[x]` cerrado:

- [ ] **Fase 0 — LÍNEA BASE Y CONTROL DEL CAMBIO:** Un tercero reproduce el baseline; cualquier diferencia está explicada.
- [ ] **Fase 1 — APLICABILIDAD, TAILORING Y TRAZABILIDAD:** Ningún control de tailoring carece de owner/decisión y ninguna referencia técnica está rota.
- [ ] **Fase 2 — PERSISTENCIA Y MIGRACIONES:** Schema vacío e histórico convergen, drift cero y smoke de Orders/Kanban/Payments correcto.
- [ ] **Fase 3 — FLUJOS CRÍTICOS E INTEGRACIONES:** Alta, reevaluación, Kanban, Payments y Calendar funcionan sin fixtures; RBAC queda zero-diff.
- [ ] **Fase 4 — ESTÁNDAR DE CÓDIGO, MÉTRICAS Y BUILD:** Lint/análisis de ambos proyectos sin deuda no aceptada y artefacto reproducible/inventariado.
- [ ] **Fase 5 — SEGURIDAD TÉCNICA, DATOS Y ROBUSTEZ:** Fallos y entradas inválidas son deterministas; DB rechaza estados imposibles; pérdida de auditoría es detectable.
- [ ] **Fase 6 — COBERTURA Y VERIFICACIÓN AUTOMATIZADA:** Targets logrados, residuales justificados y cada control sensible posee prueba trazada.
- [ ] **Fase 7 — GATE DE INTEGRACIÓN CONTINUA:** Cada gate falla frente a una violación deliberada y branch protection exige el workflow.
- [ ] **Fase 8 — LIMPIEZA DEL PRODUCTO:** Grafo limpio, artifact inspection correcta y regresión completa verde.
- [ ] **Fase 9 — EXTERNALIZACIÓN Y RETIRO DE TESTS:** Equivalencia de casos/coverage demostrada y CI no puede quedar verde sin la suite externa.
- [ ] **Fase 10 — CALIFICACIÓN INTEGRADA Y ASSESSMENT DE SEGURIDAD:** Resultados dentro de targets y cero vulnerabilidad sobre threshold sin waiver aprobado.
- [ ] **Fase 11 — REAUDITORÍA Y CIERRE ECSS:** Todo requisito aplicable en CUMPLE, tailoring aprobado, NO APLICA justificado y cero NO DETERMINABLE.

# FASE 0 — LÍNEA BASE Y CONTROL DEL CAMBIO

**FOCO:** Congelar el punto de partida y asegurar que toda evidencia pertenece al mismo commit.

**ENTRADA OBLIGATORIA:** Repositorio disponible y sin cambios funcionales de auditoría pendientes.

**CAMBIOS INCLUIDOS:** GOV-01.

**ENTREGABLES DE FASE:** Manifest de baseline, hashes, versiones y resultados reproducibles sin secretos.

**PUERTA DE SALIDA:** Un tercero reproduce el baseline; cualquier diferencia está explicada.

**SIGUIENTE FASE PERMITIDA:** Fase 1.

**AVANCE GOV-01:** la captura local del candidato `488fc51c1bebaacac37cb29a675be533aaf0fe49` y sus resultados están en [el expediente de línea base](docs/evidence/GOV-01/README.md). Falta reproducción por otra persona y aprobación del responsable; por ello la fase sigue pendiente.

## CAMBIO GOV-01 — Congelar baseline y expediente de evidencia

**OBJETIVO:** establecer una referencia reproducible antes de corregir.
**HALLAZGOS:** todos; especialmente VER-001, TRACE-001 y ENV-001.
**REQUISITOS:** E40 5.8; Q80 6.2.6 y 6.3.5.
**CAUSA RAÍZ:** resultados no ligados de forma uniforme a commit/entorno.
**PRIORIDAD / SEVERIDAD:** P0 / Alta.
**DEPENDENCIAS:** ninguna.
**PARALELO:** No; abre el programa.
**COMPONENTES:** Git, Node, npm, Prisma, configuración no secreta, resultados.
**NO MODIFICAR:** DB compartida, Auth0, Resend, Manager.

**ESTADO ACTUAL:** existen ejecuciones locales, pero no un expediente único de release.
**ESTADO OBJETIVO:** manifest de baseline con commit, versiones, hashes de lockfiles y resultados completos.

**PASOS:**

1. Crear rama desde el commit candidato.
2. Registrar commit, rama, Node/npm/Prisma y sistema operativo.
3. Registrar hashes de `package-lock.json`, `schema.prisma` y migraciones.
4. Capturar variables requeridas por nombre, nunca sus valores secretos.
5. Ejecutar tests backend con integración desactivada y registrar los skips.
6. Ejecutar tests/lint frontend y `prisma validate`.
7. Ejecutar `verify-data-artifacts.sh` y RBAC check read-only.
8. Guardar logs inmutables en el sistema de evidencia acordado.
9. Crear identificador de baseline reutilizable por todas las acciones.

**PRUEBAS ANTES:** repetir comandos de la auditoría.
**PRUEBAS DESPUÉS:** verificar que un tercero reproduce los resultados.
**REGRESIONES:** filtración de secretos en logs.
**RIESGO:** evidencia incompleta o asociada a otro commit.
**ROLLBACK:** eliminar únicamente el expediente defectuoso y regenerar; no alterar producto.
**CIERRE:** baseline firmado/fechado, reproducido y sin secretos.
**SIGUIENTE:** TAILOR-01 y TRACE-01 de la fase 1, una vez aprobada la puerta de salida de fase 0.

# FASE 1 — APLICABILIDAD, TAILORING Y TRAZABILIDAD

**FOCO:** Fijar qué exige ECSS al producto y cómo se demostrará cada control.

**ENTRADA OBLIGATORIA:** Fase 0 cerrada.

**CAMBIOS INCLUIDOS:** TAILOR-01, TRACE-01.

**ENTREGABLES DE FASE:** Decisiones de criticality/sensitivity/independencia y matriz requisito→código→prueba→evidencia.

**PUERTA DE SALIDA:** Ningún control de tailoring carece de owner/decisión y ninguna referencia técnica está rota.

**SIGUIENTE FASE PERMITIDA:** Fase 2; el mantenimiento de la trazabilidad continúa durante todo el plan.

## CAMBIO TAILOR-01 — Cerrar decisiones de aplicabilidad

**OBJETIVO:** convertir todos los `REQUIERE TAILORING` en decisiones aprobadas.
**HALLAZGOS:** TAILOR-001, VER-001, TOOL-001.
**REQUISITOS:** tablas de criticality E40; Q80 6.2.3, 6.2.6, 6.2.8, 6.3.5; E80 5.4.5.
**CAUSA:** categoría, sensibilidad e independencia no aportadas.
**PRIORIDAD / SEVERIDAD:** P0 / Alta.
**DEPENDENCIAS:** GOV-01.
**PARALELO:** Sí, con TRACE-01 dentro de la fase 1; sólo se preparan inventarios de fases posteriores.
**COMPONENTES:** checklist y criterios técnicos; la documentación formal se asume disponible.

**ESTADO ACTUAL:** 21 IDs en tailoring y controles adicionales por cláusula.
**ESTADO OBJETIVO:** decisión, responsable, justificación, fecha, impacto y evidencia por control.

**PASOS:**

1. Asignar criticality A/B/C/D o la categoría contractual válida.
2. Clasificar dependability/safety criticality.
3. Clasificar security sensitivity por componente y dato.
4. Acordar cobertura statement, branch y MC/DC cuando corresponda.
5. Acordar independencia de reviews, ISVV y pentest.
6. Definir tratamiento de Prisma/generated code.
7. Definir configuraciones válidas y combinaciones ambientales.
8. Definir disponibilidad, recuperación y redundancia aplicables.
9. Registrar controles no aplicables con racional verificable.
10. Actualizar cada fila afectada del checklist sin alterar requirement IDs.

**PRUEBAS ANTES:** revisión de todas las filas `TAILORING`.
**PRUEBAS DESPUÉS:** ninguna fila carece de decisión/owner.
**REGRESIONES:** usar tailoring para rebajar una obligación aplicable sin justificación.
**RIESGO:** targets imposibles o insuficientes.
**ROLLBACK:** restaurar decisión anterior y reabrir controles dependientes.
**CIERRE:** aprobación explícita cliente/proyecto y targets consumibles por CI.
**SIGUIENTE:** TRACE-01, VER-01, MET-01, SEC-02.

## CAMBIO TRACE-01 — Crear trazabilidad técnica bidireccional

**OBJETIVO:** mapear requisito→control→código→prueba→resultado.
**HALLAZGOS:** TRACE-001, CODE-001/002.
**REQUISITOS:** E40 `_0860134`, `_0860142`, `_0860143`; Q80 `_0720130`.
**PRIORIDAD / SEVERIDAD:** P0 / Alta.
**DEPENDENCIAS:** GOV-01; targets finales dependen de TAILOR-01.
**PARALELO:** Sí.
**COMPONENTES:** módulos, endpoints, schema, tests y checklist.

**ESTADO ACTUAL:** trazabilidad implícita/narrativa.
**ESTADO OBJETIVO:** matriz versionada y validada automáticamente.

**PASOS:**

1. Definir IDs técnicos estables por control/requisito.
2. Registrar componente, archivo, función/endpoint/modelo y owner.
3. Registrar tests unit/integration/system/security asociados.
4. Registrar comando, resultado, fecha, commit y entorno.
5. Marcar código sin requisito y requisito sin código/test.
6. Resolver cada hueco mediante implementación, prueba, justificación o eliminación.
7. Añadir chequeo de referencias rotas en CI.
8. Actualizar la matriz en cada PR.

**PRUEBAS ANTES:** muestreo de Orders, Auth y Calendar para demostrar huecos.
**PRUEBAS DESPUÉS:** auditoría bidireccional de muestra y detector sin referencias rotas.
**REGRESIONES:** matriz obsoleta o IDs sólo en comentarios.
**RIESGO:** burocracia sin evidencia ejecutable.
**ROLLBACK:** volver a la última matriz válida y bloquear merge.
**CIERRE:** cero aplicables sin implementación/prueba o waiver aprobado; cero unidades injustificadas.
**SIGUIENTE:** poblar continuamente; finalizar en FINAL-01.

# FASE 2 — PERSISTENCIA Y MIGRACIONES

**FOCO:** Restablecer una base reproducible antes de cambiar flujos que dependen de ella.

**ENTRADA OBLIGATORIA:** Fases 0 y 1 cerradas; MySQL aislado y backup/restore disponibles.

**CAMBIOS INCLUIDOS:** DB-01, DB-02, DB-03.

**ENTREGABLES DE FASE:** Diff completo, migraciones reparadas, replay desde vacío, upgrade histórico y rollback probado.

**PUERTA DE SALIDA:** Schema vacío e histórico convergen, drift cero y smoke de Orders/Kanban/Payments correcto.

**SIGUIENTE FASE PERMITIDA:** Fase 3.

## CAMBIO DB-01 — Diagnóstico determinista de schema y migraciones

**OBJETIVO:** localizar todas las divergencias antes de escribir SQL correctivo.
**HALLAZGOS:** DB-001, DATA-001, ENV-001.
**REQUISITOS:** E40 5.5/5.8; Q80 6.2.6 y configuration control.
**PRIORIDAD / SEVERIDAD:** P0 / Crítica.
**DEPENDENCIAS:** GOV-01.
**PARALELO:** No con DB-02 ni DB-03, que dependen de este diagnóstico; se permiten inventarios read-only de la fase 2.
**COMPONENTES:** `schema.prisma`, todas las migraciones, `_prisma_migrations`, copia de DB.
**NO MODIFICAR:** DB compartida durante diagnóstico.

**ESTADO ACTUAL:** `0_init` no crea columnas actuales de `Pedidos`; una migración posterior indexa una columna ausente.
**ESTADO OBJETIVO:** diff exhaustivo vacío↔migraciones↔schema↔DB física.

**PASOS:**

1. Crear MySQL efímero/aislado con versión y collation equivalentes.
2. Aplicar exclusivamente las migraciones, en orden.
3. Capturar la primera sentencia fallida y estado parcial.
4. Exportar estructura resultante sin datos.
5. Comparar con `schema.prisma` y enumerar tabla/columna/índice/FK/default/nullability.
6. Obtener, con autorización read-only, schema e historial real de `dev`.
7. Comparar checksums y migraciones marcadas/aplicadas.
8. Identificar datos que violarían nuevos unique/check/not-null.
9. Producir una tabla de precondiciones y riesgos por migración.

**PRUEBAS ANTES:** `prisma validate` y replay actual esperado-fallido.
**PRUEBAS DESPUÉS:** informe de diferencias sin cambiar DB.
**REGRESIONES:** usar `db push` o `migrate diff --from-empty` como sustituto.
**RIESGO:** inspeccionar credenciales/datos sensibles; usar mínimos privilegios.
**ROLLBACK:** destruir sólo DB efímera.
**CIERRE:** todas las diferencias enumeradas y clasificadas.
**SIGUIENTE:** DB-02.

## CAMBIO DB-02 — Reparar la historia de migraciones

**OBJETIVO:** construir schema canónico desde vacío sin drift.
**HALLAZGOS:** DB-001.
**PRIORIDAD / SEVERIDAD:** P0 / Crítica.
**DEPENDENCIAS:** DB-01.
**PARALELO:** No sobre migraciones.
**COMPONENTES:** nuevas migraciones aditivas; `schema.prisma`; guía de preflight.
**NO MODIFICAR:** migraciones ya aplicadas en ambientes compartidos salvo decisión formal documentada.

**ESTADO ACTUAL:** cadena incompleta.
**ESTADO OBJETIVO:** replay desde vacío igual a schema canónico.

**PASOS:**

1. Elegir estrategia: baseline corregido para instalaciones nuevas y migraciones de reconciliación para existentes, preservando checksums aplicados.
2. Agregar antes del índice todas las columnas `Pedidos` requeridas.
3. Agregar las columnas snapshot de `Detalle_pedido` en orden compatible.
4. Incorporar tablas/índices de security hardening sólo tras sus precondiciones.
5. Definir backfill/canonicalización de NV sin adivinar datos comerciales.
6. Detectar duplicados antes del índice unique y abortar con reporte seguro.
7. Probar transacción/atomicidad que permita el motor.
8. Repetir replay desde vacío al menos dos veces en entornos nuevos.
9. Comparar schema resultante con Prisma sin diferencias inesperadas.

**PRUEBAS ANTES:** fixture de esquema que demuestra el fallo actual.
**PRUEBAS DESPUÉS:** replay limpio, `migrate status`, drift cero, generación/validate.
**REGRESIONES:** pérdida de datos, índice antes de backfill, checksum modificado.
**RIESGO:** bloqueo de tablas y colisiones.
**ROLLBACK:** snapshot/backup y migración inversa ensayada; nunca rollback improvisado en compartida.
**CIERRE:** vacío reproduce schema y test automatizado lo demuestra.
**SIGUIENTE:** DB-03 y CI-01.

## CAMBIO DB-03 — Validar upgrade histórico y aplicar controladamente

**OBJETIVO:** llevar una copia representativa y luego `dev` al schema correcto.
**HALLAZGOS:** DB-001, ENV-001.
**PRIORIDAD / SEVERIDAD:** P0 / Crítica.
**DEPENDENCIAS:** DB-02, backup autorizado.
**PARALELO:** No durante ventana DB.
**COMPONENTES:** copia anonimizada, migraciones, Orders/Kanban/Payments/Security.

**PASOS:**

1. Restaurar copia representativa en aislamiento.
2. Ejecutar preflight de NULL, duplicados, FKs y tamaños.
3. Ejecutar migraciones con logs y duración.
4. Verificar conteos, checksums de muestras y relaciones.
5. Ejecutar integración Orders/Kanban/Payments y dos tests MySQL omitidos.
6. Ensayar rollback/restore y medir RTO/RPO acordados.
7. Preparar ventana, owner, criterio abort y comunicación.
8. Aplicar a `dev` sólo con autorización y backup confirmado.
9. Ejecutar smoke post-migración y `migrate status`.

**PRUEBAS ANTES/DESPUÉS:** misma suite y consultas de integridad.
**REGRESIONES:** locks, downtime, pérdida/cambio semántico.
**RIESGO:** máximo; no aplicar sin restore probado.
**ROLLBACK:** restaurar backup validado si criterio abort se activa.
**CIERRE:** dev sin drift, tests reales verdes y evidencia de restore.
**SIGUIENTE:** validar error original de Kanban y habilitar INT-02.

# FASE 3 — FLUJOS CRÍTICOS E INTEGRACIONES

**FOCO:** Cerrar las causas funcionales de alta/Kanban y los límites de confianza externos.

**ENTRADA OBLIGATORIA:** Fase 2 cerrada y contratos/credenciales sandbox autorizados.

**CAMBIOS INCLUIDOS:** INT-01, INT-02, CAL-01, AUTH-01.

**ENTREGABLES DE FASE:** Manager real, Calendar autoritativo y Auth0 reconciliado con pruebas negativas.

**PUERTA DE SALIDA:** Alta, reevaluación, Kanban, Payments y Calendar funcionan sin fixtures; RBAC queda zero-diff.

**SIGUIENTE FASE PERMITIDA:** Fase 4.

## CAMBIO INT-01 — Especificar contrato técnico de Manager

**OBJETIVO:** reemplazar la fixture mediante una interfaz verificable y mínima.
**HALLAZGOS:** INT-001, MOCK-001.
**REQUISITOS:** E40 5.4–5.6; Q80 6.2.7/6.2.9.
**PRIORIDAD / SEVERIDAD:** P0 / Alta.
**DEPENDENCIAS:** GOV-01; coordinación Manager.
**PARALELO:** No antes del cierre de la fase 2; dentro de la fase 3 puede coordinarse con CAL-01 y AUTH-01.
**COMPONENTES:** interfaz `SalesNoteRepository`, configuración y schemas de respuesta.

**PASOS:**

1. Definir consulta read-only, auth, transporte y ambientes.
2. Definir campos mínimos: NV, cliente, usuario origen, líneas, códigos, cantidades, fechas y versión.
3. Definir canonicalización y límites exactos.
4. Definir timeout/cancelación, retry sólo idempotente y circuit/fail-closed.
5. Definir errores: no existe, no autorizado, timeout, 5xx, inválido, duplicado.
6. Definir freshness/consistencia para reevaluación y Payment preview.
7. Crear contract tests independientes de implementación.
8. Acordar logging sin credenciales ni datos excesivos.

**PRUEBAS ANTES:** congelar comportamiento válido de fixture.
**PRUEBAS DESPUÉS:** proveedor real y doble controlado pasan contract tests.
**REGRESIONES:** aceptar strings como cantidades, fechas imposibles o líneas duplicadas.
**RIESGO:** contrato externo ambiguo.
**ROLLBACK:** feature flag sólo para entorno no productivo, sin fallback silencioso.
**CIERRE:** contrato aprobado y suite de contrato verde.
**SIGUIENTE:** INT-02.

## CAMBIO INT-02 — Implementar adapter, cutover y retirar default fixture

**OBJETIVO:** hacer operativas alta/reevaluación/cobranzas sin demo.
**HALLAZGOS:** INT-001.
**PRIORIDAD / SEVERIDAD:** P0 / Alta.
**DEPENDENCIAS:** INT-01 y DB-02; prueba integrada tras DB-03.
**PARALELO:** Condicional.
**ARCHIVOS:** nuevo adapter; `salesNoteSource.service.js`, `order.service.js`, `paymentRecord.service.js`, configuración.

**PASOS:**

1. Implementar adapter contra la interfaz, sin importar Prisma del producto.
2. Aplicar deadline y `AbortSignal`.
3. Validar schema externo antes de crear una transacción.
4. Mapear errores a códigos públicos seguros y logs correlacionables.
5. Inyectar adapter por composition root.
6. Configurar no-demo para exigir Manager; prohibir fixture como fallback.
7. Ejecutar contract/integration tests para éxito, 404, timeout, 401/403, 5xx, JSON inválido, línea duplicada y cantidades límite.
8. Ejecutar alta y reevaluación reales en entorno autorizado.
9. Mantener fixture sólo en el paquete de pruebas hasta CLEAN-03.

**PRUEBAS ANTES:** regresión completa Orders/Payments.
**PRUEBAS DESPUÉS:** unit, contract, integration, transacción/rollback y smoke UI.
**REGRESIONES:** doble alta, snapshot incoherente, actor no confiable, fallback demo.
**RIESGO:** indisponibilidad Manager.
**ROLLBACK:** revertir adapter/configuración; nunca activar fixture silenciosa en producción.
**CIERRE:** ambiente no-demo registra/reevalúa con Manager y falla seguro.
**SIGUIENTE:** CLEAN-03 puede retirar fixture.

## CAMBIO CAL-01 — Hacer Calendar autoritativo y robusto

**OBJETIVO:** impedir que el cliente defina datos comerciales del cálculo.
**HALLAZGOS:** CAL-001, ROB-001.
**REQUISITOS:** E40 `_0860134`, 5.8.3.5f; E80 integrity/fail secure.
**PRIORIDAD / SEVERIDAD:** P0 / Alta.
**DEPENDENCIAS:** GOV-01; DB estable para integración.
**PARALELO:** Sí con Manager.
**ARCHIVOS:** controller/routes/service Calendar, repositorio de Orders, frontend API.

**PASOS:**

1. Congelar tests que prueben el contrato vulnerable actual.
2. Cambiar request a rango/filtros permitidos solamente.
3. Rechazar campos `items`, cantidad, estado, dueDate y capacidad enviados por cliente.
4. Consultar items desde un repositorio backend con filtros y paginación.
5. Usar round-trip estricto `YYYY-MM-DD`; rechazar fechas normalizadas.
6. Validar capacidad como entero positivo y rangos máximos.
7. No omitir registros inválidos silenciosamente: error o quarantine trazable.
8. Probar zona horaria Chile y cambio de día.
9. Actualizar frontend para no transportar datos autoritativos.

**PRUEBAS ANTES:** resultado actual con datos conocidos.
**PRUEBAS DESPUÉS:** manipulación de body, límites, fechas imposibles, empty set, timeout DB y carga acumulada.
**REGRESIONES:** visualización del calendario, filtros y performance.
**RIESGO:** consultas costosas.
**ROLLBACK:** revertir contrato y servicio juntos; no dejar versiones cruzadas.
**CIERRE:** body manipulado no altera resultado y toda entrada inválida es determinista.
**SIGUIENTE:** ROB-01, VER-02.

## CAMBIO AUTH-01 — Reconciliar Auth0 con catálogo versionado

**OBJETIVO:** demostrar least privilege real.
**HALLAZGOS:** AUTH-001, ENV-001.
**REQUISITOS:** E40 5.11; Q80 6.2.9/10; E80 least privilege/separation.
**PRIORIDAD / SEVERIDAD:** P0 / Alta.
**DEPENDENCIAS:** GOV-01 y credencial read-only; cambios requieren autorización.
**PARALELO:** Sí.
**COMPONENTES:** `shared/authorization.js`, `scripts/rbac.mjs`, tenant y Action.

**PASOS:**

1. Exportar resource server, scopes, ocho roles, asignaciones, Action y binding.
2. Guardar snapshot sin tokens/secretos, con fecha/tenant/commit.
3. Ejecutar `rbac.mjs --check` y clasificar cada diferencia.
4. Añadir `manage:production-load` y `view:metrics` si siguen ausentes.
5. Eliminar scopes extra no justificados.
6. Verificar exactamente un rol ITECSA por usuario de prueba.
7. Verificar Action desplegada y binding Post Login.
8. Renovar sesiones y probar matriz HTTP por rol con tokens reales.
9. Ejecutar tests negativos: sin rol, dos roles, permiso ausente, usuario desvinculado y token antiguo.

**PRUEBAS ANTES:** check sobre snapshot viejo.
**PRUEBAS DESPUÉS:** check cero-diff y matriz real.
**REGRESIONES:** lockout administrativo o privilegios extra.
**RIESGO:** cambio externo de alto impacto.
**ROLLBACK:** export previo y restauración controlada.
**CIERRE:** catálogo, tenant, tokens y tabla interna coinciden.
**SIGUIENTE:** VER-03 debe usar el tenant reconciliado; cierre definitivo en FINAL-01. `ENV-001` es un hallazgo, no un cambio del plan.

# FASE 4 — ESTÁNDAR DE CÓDIGO, MÉTRICAS Y BUILD

**FOCO:** Crear la disciplina automática que medirá y protegerá los cambios restantes.

**ENTRADA OBLIGATORIA:** Contratos críticos estabilizados en Fase 3.

**CAMBIOS INCLUIDOS:** STD-01, MET-01, BUILD-01.

**ENTREGABLES DE FASE:** Coding standard ejecutable, baseline de métricas, clean build reproducible y SBOM.

**PUERTA DE SALIDA:** Lint/análisis de ambos proyectos sin deuda no aceptada y artefacto reproducible/inventariado.

**SIGUIENTE FASE PERMITIDA:** Fase 5.

## CAMBIO STD-01 — Coding standard ejecutable para todo el stack

**OBJETIVO:** cumplir Q80 6.3.4 y detectar defectos antes del merge.
**HALLAZGOS:** STD-001, CODE-001/002, DUP-001, ROB-001.
**PRIORIDAD / SEVERIDAD:** P1 / Alta.
**DEPENDENCIAS:** TAILOR-01.
**PARALELO:** Sí; un owner configura reglas centrales.
**COMPONENTES:** ESLint/config, package scripts, CI, convenciones de excepciones.

**PASOS:**

1. Definir reglas para naming, imports, comentarios útiles y estructura.
2. Definir reglas de seguridad, async/promises, manejo de error y logs.
3. Definir límites de complejidad, profundidad, tamaño de función/archivo y parámetros.
4. Configurar lint backend y conservar frontend.
5. Activar detección de variables/imports/exports no usados y código inalcanzable.
6. Añadir detector de ciclos y grafo de entry points.
7. Definir dispensas con ID, owner, razón, caducidad y riesgo.
8. Ejecutar baseline; convertir cada warning en ticket o waiver.
9. Corregir en PRs pequeños; no aplicar autofix masivo sin revisión.
10. Hacer CI obligatorio con cero warnings no dispensados.

**PRUEBAS ANTES:** baseline de hallazgos.
**PRUEBAS DESPUÉS:** lint frontend/backend y analizadores en CI.
**REGRESIONES:** reglas incompatibles con JSX/ESM/Prisma.
**RIESGO:** churn masivo.
**ROLLBACK:** revertir regla individual, documentar dispensa temporal.
**CIERRE:** estándar versionado, herramientas identificadas y cero deuda no aceptada.
**SIGUIENTE:** CLEAN-01/02 cuando VER-01 esté listo.

## CAMBIO MET-01 — Programa de métricas técnicas

**OBJETIVO:** medir tamaño, complejidad, defectos, cobertura, fallos y precisión.
**HALLAZGOS:** MET-001, PERF-001.
**REQUISITOS:** Q80 `_0720231`–`_0720234`.
**PRIORIDAD / SEVERIDAD:** P1 / Alta.
**DEPENDENCIAS:** TAILOR-01, STD-01, VER-01.
**PARALELO:** diseño sí; gate tras baseline.

**PASOS:**

1. Definir cada métrica, unidad, fuente y owner.
2. Medir LOC productivo/test sin mezclar generado/vendor.
3. Medir complejidad por función/módulo y distribución.
4. Medir coverage por nivel y componente sensible.
5. Registrar fallos, severidad, tiempo abierto, reapertura y regresiones.
6. Definir precisión/rangos de cálculos de capacidad, carga y métricas.
7. Establecer targets aprobados y regla de no-regresión.
8. Publicar reporte por commit/release y tendencias.
9. Crear acción correctiva automática al exceder target.

**PRUEBAS:** validar cálculos con repositorio fixture y detectar degradación intencional.
**REGRESIONES:** gaming de métricas o exclusiones amplias.
**RIESGO:** targets arbitrarios; se mitiga con tailoring.
**ROLLBACK:** volver al último baseline, nunca ocultar la regresión.
**CIERRE:** reporte reproducible y feedback usado en PR.
**SIGUIENTE:** CI-01, FINAL-01.

## CAMBIO BUILD-01 — Build reproducible, software reutilizado y SBOM

**OBJETIVO:** demostrar composición exacta del artefacto.
**HALLAZGOS:** DEP-001, SBOM-001, ROOT-001, TOOL-001.
**REQUISITOS:** E40 5.5.3.1; Q80 5.6, 6.2.7/8; E80 supply chain.
**PRIORIDAD / SEVERIDAD:** P1 / Media-Alta.
**DEPENDENCIAS:** GOV-01, TAILOR-01.
**PARALELO:** Sí.
**COMPONENTES:** package manifests/lockfiles, Vite, Node, Prisma, CI.

**PASOS:**

1. Fijar versiones de runtime y package manager.
2. Instalar exclusivamente desde lockfiles en entorno limpio.
3. Generar Prisma según política acordada y registrar input/tool/output.
4. Construir frontend dos veces y comparar contenido/hashes explicando variaciones.
5. Smoke backend con configuración sintética segura.
6. Inventariar directas/transitivas, versiones, origen, licencia y uso.
7. Generar SBOM con hash y commit.
8. Identificar dependencias no usadas y retirar individualmente con pruebas.
9. Eliminar lockfile raíz sólo tras confirmar que no hay proyecto raíz.
10. Verificar que artefacto no incluya tests, mocks, `.env`, mapas sensibles o docs internas.

**PRUEBAS:** clean install/build/smoke y diff de artefacto.
**REGRESIONES:** actualización implícita, artefactos no deterministas.
**RIESGO:** diferencias por timestamps; documentar/excluir sólo metadatos justificados.
**ROLLBACK:** restaurar lockfile/toolchain anterior.
**CIERRE:** build limpio reproducible y SBOM trazable.
**SIGUIENTE:** SEC-02, CI-01.

# FASE 5 — SEGURIDAD TÉCNICA, DATOS Y ROBUSTEZ

**FOCO:** Endurecer los controles que protegen integridad, disponibilidad y evidencia.

**ENTRADA OBLIGATORIA:** Toolchain y targets definidos en Fase 4.

**CAMBIOS INCLUIDOS:** SEC-01, ROB-01, DATA-01.

**ENTREGABLES DE FASE:** Auditoría persistente verificable, validación/timeouts uniformes y constraints de dominio.

**PUERTA DE SALIDA:** Fallos y entradas inválidas son deterministas; DB rechaza estados imposibles; pérdida de auditoría es detectable.

**SIGUIENTE FASE PERMITIDA:** Fase 6.

## CAMBIO SEC-01 — Garantizar auditoría y configuración sensible

**OBJETIVO:** hacer detectable la pérdida/manipulación de eventos y validar mínimos privilegios.
**HALLAZGOS:** SEC-001, DATA-001, ENV-001.
**REQUISITOS:** E40 5.11; Q80 6.2.9/10; E80 principios de integridad.
**PRIORIDAD / SEVERIDAD:** P1 / Alta.
**DEPENDENCIAS:** DB-03, TAILOR-01.
**PARALELO:** Condicional.
**COMPONENTES:** `securityAudit.repo.js`, `SecurityAuditEvent`, logs/alerts, usuario DB.

**PASOS:**

1. Confirmar tabla/índices/FK mediante migración real.
2. Enumerar eventos obligatorios y campos mínimos.
3. Definir qué eventos participan en transacción de negocio y cuáles son best-effort.
4. Tratar fallo de persistencia según criticidad, sin ocultarlo.
5. Restringir UPDATE/DELETE del usuario runtime o alertar su uso.
6. Definir retención, acceso, export y borrado autorizado.
7. Alertar gaps, fallos de escritura y volumen anómalo.
8. Verificar que no se registren PIN, OTP, tokens, credenciales ni payload excesivo.
9. Probar actor, acción, recurso, outcome, reason y request ID.

**PRUEBAS:** éxito, denegación, rollback, DB caída, evento duplicado y limpieza.
**REGRESIONES:** romper transacciones o filtrar secretos.
**RIESGO:** crecimiento de tabla/disponibilidad.
**ROLLBACK:** desactivar sólo alerta defectuosa; no perder evento obligatorio.
**CIERRE:** integridad/pérdida detectable y privilegios demostrados.
**SIGUIENTE:** SEC-02 y FINAL-01.

## CAMBIO ROB-01 — Validación, timeouts y fault handling

**OBJETIVO:** cubrir 5.5.3.2 y robustez 5.8.3.5.
**HALLAZGOS:** ROB-001, CLIENT-001, PERF-001.
**PRIORIDAD / SEVERIDAD:** P1 / Media-Alta.
**DEPENDENCIAS:** STD-01, CAL-01, INT-01.
**PARALELO:** por adaptador/módulo, con contrato central único.

**PASOS:**

1. Centralizar parsing estricto de fechas con round-trip.
2. Centralizar enteros, rangos, tamaños y enums sin coerción ambigua.
3. Añadir timeout/cancelación al cliente HTTP frontend.
4. Añadir deadlines a Auth0, Manager y Resend.
5. Definir retries sólo para operaciones idempotentes y acotados.
6. Definir límites de body, query, paginación y rango temporal.
7. Probar n-1/n/n+1, vacío, null, tipo incorrecto, máximo y overflow.
8. Probar DB caída, timeout, respuesta parcial/malformada y conexión abortada.
9. Probar que errores residuales se sanitizan y auditan.
10. Medir que ninguna request queda abierta indefinidamente.

**PRUEBAS:** unit/boundary/integration/fault injection.
**REGRESIONES:** cancelar requests legítimas lentas o reintentar escrituras.
**RIESGO:** comportamiento UI distinto en redes lentas.
**ROLLBACK:** feature flag temporal para timeout, nunca desactivar validación crítica.
**CIERRE:** matriz de fallos completa y resultados deterministas.
**SIGUIENTE:** VER-02, CI-01.

## CAMBIO DATA-01 — Constraints, transacciones y precisión

**OBJETIVO:** impedir estados imposibles en persistencia.
**HALLAZGOS:** DATA-001, DB-001, ROB-001.
**PRIORIDAD / SEVERIDAD:** P1 / Alta.
**DEPENDENCIAS:** DB-03 y reglas de negocio confirmadas.
**PARALELO:** No sobre schema compartido.

**PASOS:**

1. Inventariar NULL/default/enum/unique/FK y rangos.
2. Distinguir histórico legítimo de dato inválido.
3. Definir constraints para cantidades, capacidad, estados, fechas y relaciones.
4. Corregir datos sólo en copia y con autorización explícita.
5. Agregar migraciones aditivas y preflight.
6. Probar transacciones, concurrencia, idempotencia y rollback.
7. Definir precisión de cálculos y evitar coerción/NaN.
8. Verificar queries e índices con volumen representativo.

**PRUEBAS:** inserts/updates inválidos, race, deadlock/retry permitido, rollback.
**REGRESIONES:** bloquear histórico válido o degradar consultas.
**RIESGO:** datos legados.
**ROLLBACK:** restauración ensayada y constraints reversibles cuando proceda.
**CIERRE:** DB rechaza todos los estados imposibles acordados.
**SIGUIENTE:** VER-02/03.

# FASE 6 — COBERTURA Y VERIFICACIÓN AUTOMATIZADA

**FOCO:** Construir la red de seguridad requerida antes de cualquier eliminación.

**ENTRADA OBLIGATORIA:** Fases 1, 4 y 5 cerradas.

**CAMBIOS INCLUIDOS:** VER-01, VER-02.

**ENTREGABLES DE FASE:** Coverage por nivel/criticality y casos positivos, negativos, boundary, concurrencia y fallos.

**PUERTA DE SALIDA:** Targets logrados, residuales justificados y cada control sensible posee prueba trazada.

**SIGUIENTE FASE PERMITIDA:** Fase 7.

## CAMBIO VER-01 — Instrumentar cobertura por nivel y criticality

**OBJETIVO:** producir coverage reproducible y cerrar gaps.
**HALLAZGOS:** VER-001, TAILOR-001.
**REQUISITOS:** E40 5.8.3.5 b/c `_0860137`; Q80 `_0720177` y 6.3.5.5.
**PRIORIDAD / SEVERIDAD:** P1 / Alta.
**DEPENDENCIAS:** TAILOR-01, GOV-01.
**PARALELO:** Sí frontend/backend.

**PASOS:**

1. Configurar coverage statement/branch/function por proyecto.
2. Excluir sólo generado/vendor con justificación.
3. Separar unit, integration y validation.
4. Medir baseline sin imponer target artificial.
5. Comparar contra targets de criticality.
6. Añadir tests basados en requisitos para huecos.
7. Para no cubierto imposible: inspección/análisis y justificación por línea/rama.
8. Publicar reporte por commit.
9. Fallar CI por regresión o target incumplido.

**PRUEBAS:** introducir rama sintética no cubierta y confirmar fallo.
**REGRESIONES:** exclusiones amplias o tests sin assertions.
**RIESGO:** optimizar porcentaje sin calidad.
**ROLLBACK:** restaurar target aprobado anterior; nunca ocultar archivos.
**CIERRE:** targets logrados y todo residual justificado.
**SIGUIENTE:** VER-02/03, CI-01.

## CAMBIO VER-02 — Completar unit, boundary, robustness y security tests

**OBJETIVO:** cubrir errores y límites de todo control sensible.
**HALLAZGOS:** VER-001, ROB-001, SEC-001.
**PRIORIDAD / SEVERIDAD:** P1 / Alta.
**DEPENDENCIAS:** VER-01, STD-01, ROB-01.
**PARALELO:** Sí por módulo.

**PASOS:**

1. Derivar casos desde TRACE-01, no desde implementación solamente.
2. Agregar n-1/n/n+1, tipo inválido, null, vacío, máximo y duplicado.
3. Cubrir todos los códigos de error públicos y sanitización.
4. Cubrir auth negativo, rol, capability, estado, ownership y PIN.
5. Cubrir timeouts/cancelación/respuesta malformada.
6. Cubrir fecha/zona horaria y precisión/capacidad.
7. Cubrir concurrencia e idempotencia.
8. Revisar determinismo; eliminar dependencia de reloj/red no controlados.
9. Revisar calidad de assertions y falsos positivos.

**PRUEBAS ANTES/DESPUÉS:** coverage diff y mutation/fallo deliberado controlado.
**REGRESIONES:** snapshots laxos o mocks que no respetan contrato.
**RIESGO:** suite lenta; categorizar sin omitir gates críticos.
**ROLLBACK:** revertir test defectuoso y abrir incidente; no silenciar.
**CIERRE:** cada requisito sensible tiene caso positivo/negativo/boundary.
**SIGUIENTE:** VER-03.

# FASE 7 — GATE DE INTEGRACIÓN CONTINUA

**FOCO:** Convertir los controles cerrados en condiciones obligatorias de merge.

**ENTRADA OBLIGATORIA:** Fases 2, 4 y 6 cerradas.

**CAMBIOS INCLUIDOS:** CI-01.

**ENTREGABLES DE FASE:** Pipeline obligatorio de migraciones, análisis, coverage, build, SBOM y artefactos.

**PUERTA DE SALIDA:** Cada gate falla frente a una violación deliberada y branch protection exige el workflow.

**SIGUIENTE FASE PERMITIDA:** Fase 8.

## CAMBIO CI-01 — Gate único de conformidad técnica

**OBJETIVO:** impedir reintroducción de todas las brechas cerradas.
**HALLAZGOS:** CI-001 y transversales.
**PRIORIDAD / SEVERIDAD:** P1 / Alta.
**DEPENDENCIAS:** DB-02, STD-01, VER-01, BUILD-01.
**PARALELO:** No durante edición del workflow.
**ARCHIVO:** `.github/workflows/security-ci.yml` y scripts llamados.

**PASOS:**

1. Activar PR y push para ramas protegidas, incluida `dev` si continúa como integración.
2. Clean install con lockfile y versiones fijadas.
3. Aplicar migraciones reales desde vacío; prohibir schema materializado como sustituto.
4. Ejecutar drift check.
5. Ejecutar lint frontend/backend y análisis de ciclos/muertos.
6. Ejecutar unit/integration/coverage y targets.
7. Ejecutar build reproducible y smoke.
8. Ejecutar secret scan, dependency/vulnerability assessment autorizado y SBOM.
9. Fallar ante mocks/fakes/fixtures no autorizados en runtime.
10. Fallar ante migración faltante, export huérfano o nueva duplicación según thresholds.
11. Publicar evidencia y retener artefactos/logs sin secretos.
12. Probar cada gate introduciendo una violación deliberada en rama temporal.

**REGRESIONES:** pipeline verde por pasos omitidos/condiciones incorrectas.
**RIESGO:** duración; paralelizar jobs sin reducir controles.
**ROLLBACK:** revertir sólo job defectuoso con waiver temporal fechado.
**CIERRE:** cada gate detecta su defecto sintético y branch protection lo exige.
**SIGUIENTE:** limpieza final.

# FASE 8 — LIMPIEZA DEL PRODUCTO

**FOCO:** Eliminar duplicación, código/estilos muertos y dobles de prueba sin romper contratos.

**ENTRADA OBLIGATORIA:** Fase 7 cerrada; CI y coverage obligatorios.

**CAMBIOS INCLUIDOS:** CLEAN-01, CLEAN-02, CLEAN-03.

**ENTREGABLES DE FASE:** Una infraestructura transversal, cero huérfanos no justificados y runtime sin mocks/fakes/fixtures.

**PUERTA DE SALIDA:** Grafo limpio, artifact inspection correcta y regresión completa verde.

**SIGUIENTE FASE PERMITIDA:** Fase 9.

## CAMBIO CLEAN-01 — Consolidar infraestructura duplicada

**OBJETIVO:** una sola implementación para error, contexto y autorización.
**HALLAZGOS:** DUP-001, CODE-002.
**PRIORIDAD / SEVERIDAD:** P2 / Media.
**DEPENDENCIAS:** VER-02, CI-01.
**PARALELO:** No en infraestructura central.

**PASOS:**

1. Congelar tests de status, códigos públicos, request ID y logs.
2. Elegir un contrato `AppError` y adaptar consumidores por lote.
3. Elegir un `respondError/errorHandler` final.
4. Conservar `errors/httpErrors.js#requestContext` o reemplazo probado.
5. Conservar `requireCapability`; migrar tests de `requirePermission`.
6. Migrar Orders/Payments responders test-only.
7. Ejecutar suite tras cada consumidor.
8. Eliminar implementación antigua sólo con cero referencias.

**PRUEBAS:** errores Auth0/Prisma/PIN/Orders/Payments y headers.
**REGRESIONES:** cambiar contrato público o filtrar detalles.
**RIESGO:** fallo transversal.
**ROLLBACK:** un commit por migración/consumidor.
**CIERRE:** una implementación por responsabilidad y cero imports viejos.
**SIGUIENTE:** CLEAN-02.

## CAMBIO CLEAN-02 — Eliminar archivos, estilos y símbolos muertos

**OBJETIVO:** cero código no alcanzable no justificado.
**HALLAZGOS:** CODE-001, CODE-002, ROOT-001.
**PRIORIDAD / SEVERIDAD:** P2 / Media.
**DEPENDENCIAS:** CLEAN-01, CI-01, TRACE-01.
**PARALELO:** backend/frontend en PRs separados.

**PASOS:**

1. Recalcular grafo desde entry points y build config.
2. Buscar imports dinámicos, rutas y referencias de assets.
3. Eliminar los 5 huérfanos backend confirmados.
4. Eliminar el directorio `productionHistory` (19 archivos).
5. Eliminar los otros 17 huérfanos frontend confirmados.
6. Eliminar símbolos sin uso productivo después de migrar tests.
7. Retirar import y CSS vacío `bootstrap-overrides.css`.
8. Eliminar hooks/validator vacíos y directorios sin propósito.
9. Eliminar lockfile raíz sólo tras BUILD-01.
10. Ejecutar grafo, lint, tests, build y smoke después de cada lote.

**PRUEBAS:** navegación/rutas, Orders, Kanban, Calendar, Payments y Auth.
**REGRESIONES:** borrar lazy import o API pública de tests externos.
**RIESGO:** falsos positivos del análisis estático.
**ROLLBACK:** commits pequeños, uno por familia.
**CIERRE:** cero huérfanos/exports sin uso no dispensados; bundle funcional.
**SIGUIENTE:** CLEAN-03.

## CAMBIO CLEAN-03 — Retirar mocks, fixtures, fakes y demo del runtime

**OBJETIVO:** artefacto productivo sin datos o proveedores de prueba.
**HALLAZGOS:** MOCK-001, INT-001.
**PRIORIDAD / SEVERIDAD:** P2 / Media.
**DEPENDENCIAS:** INT-02, CAL-01, TEST-EXT-01 para fakes usados por pruebas.
**PARALELO:** Condicional.

**PASOS:**

1. Mover `PRODUCTION_STATUSES` a constante productiva.
2. Eliminar `PRODUCTION_CALENDAR_ITEMS` y mock Calendar.
3. Eliminar mock con todo `productionHistory`.
4. Mover `FakePinDeliveryProvider` al paquete de verificación e inyectarlo desde tests.
5. Retirar `sales-notes-fixture.json` después del cutover Manager.
6. Eliminar alias `SalesNoteSourceService → FixtureSalesNoteRepository`.
7. Evaluar `demoOrders`: eliminar o aislar en paquete/artefacto que nunca se despliega.
8. Eliminar ramas/comentarios sólo destinados a mocks.
9. Inspeccionar artefacto para demostrar ausencia.

**PRUEBAS:** producción falla al intentar configurar fake/demo; tests usan inyección externa.
**REGRESIONES:** desarrollo sin proveedor o pérdida de datos de prueba antes de migrar.
**RIESGO:** romper suite.
**ROLLBACK:** restaurar únicamente en paquete test, no runtime.
**CIERRE:** cero mocks/fakes/fixtures/demo no autorizados en artefacto.
**SIGUIENTE:** TEST-EXT-01.

# FASE 9 — EXTERNALIZACIÓN Y RETIRO DE TESTS

**FOCO:** Cumplir la decisión de retirar tests del repositorio sin perder evidencia ECSS.

**ENTRADA OBLIGATORIA:** Fase 8 cerrada y contratos estables.

**CAMBIOS INCLUIDOS:** TEST-EXT-01, CLEAN-04.

**ENTREGABLES DE FASE:** Suite externa versionada/obligatoria y repositorio productivo sin carpetas de test.

**PUERTA DE SALIDA:** Equivalencia de casos/coverage demostrada y CI no puede quedar verde sin la suite externa.

**SIGUIENTE FASE PERMITIDA:** Fase 10.

## CAMBIO TEST-EXT-01 — Crear producto de verificación externo

**OBJETIVO:** sacar tests del repositorio de aplicación sin perder assurance.
**HALLAZGOS:** TEST-DEL-001.
**REQUISITOS:** E40 `_0860142`; Q80 `_0720176/77`, regresión.
**PRIORIDAD / SEVERIDAD:** P2 final / Alta.
**DEPENDENCIAS:** CI-01, VER-01/02/03, CLEAN-01.
**PARALELO:** No con cambios de contratos.

**PASOS:**

1. Crear repositorio o paquete de verificación con control de acceso/versiones.
2. Copiar primero los 59 backend y 15 frontend conservando historial cuando sea posible.
3. Mover helpers/fixtures/fakes de test fuera de `src`.
4. Fijar cómo obtiene el artefacto exacto: commit, package, image o checkout inmutable.
5. Reemplazar imports internos frágiles por interfaces de prueba acordadas.
6. Configurar secretos de test y servicios sandbox sin exponerlos.
7. Ejecutar suite completa y coverage desde el nuevo lugar.
8. Comparar número de casos, skips y resultados con baseline.
9. Configurar CI de producto para disparar/esperar la suite externa.
10. Definir versionado conjunto y compatibilidad.

**PRUEBAS ANTES:** baseline 789 pass/2 skip backend y frontend verde.
**PRUEBAS DESPUÉS:** misma o mejor cobertura, cero casos perdidos no aprobados.
**REGRESIONES:** tests apuntando a branch mutable o ambiente compartido.
**RIESGO:** pérdida de atomicidad entre código y tests.
**ROLLBACK:** conservar carpetas originales hasta demostrar tres ejecuciones verdes o criterio acordado.
**CIERRE:** suite externa obligatoria, trazable y reproducible.
**SIGUIENTE:** CLEAN-04.

## CAMBIO CLEAN-04 — Eliminar carpetas de test del repositorio de aplicación

**OBJETIVO:** completar la decisión del equipo sin perder verificación.
**HALLAZGOS:** TEST-DEL-001, CODE-002.
**PRIORIDAD / SEVERIDAD:** Final destructivo / Alta.
**DEPENDENCIAS:** TEST-EXT-01 cerrado y evidencia aprobada.
**PARALELO:** No.

**PASOS:**

1. Ejecutar por última vez ambas suites locales y guardar resultados/coverage.
2. Ejecutar suite externa sobre el mismo commit.
3. Comparar inventario de 74 archivos/casos y explicar diferencias.
4. Eliminar `capaServidor/test`.
5. Eliminar `capaVista/test`.
6. Actualizar scripts `test` para invocar la verificación externa o indicar claramente el comando oficial.
7. Actualizar CI sin eliminar gates.
8. Retirar exports/product code usados exclusivamente por la suite antigua si la externa ya no los necesita.
9. Ejecutar build/smoke y suite externa otra vez.
10. Verificar que el artefacto ya no contiene test/fixtures/fakes.

**PRUEBAS:** equivalencia pre/post y cobertura no inferior a target.
**REGRESIONES:** CI verde sin ejecutar la suite externa.
**RIESGO:** pérdida irreversible de evidencia si se borra antes de copiar.
**ROLLBACK:** revertir el commit de eliminación; historial Git conserva archivos.
**CIERRE:** cero tests en repo de aplicación y suite externa obligatoria verde.
**SIGUIENTE:** FINAL-01.

# FASE 10 — CALIFICACIÓN INTEGRADA Y ASSESSMENT DE SEGURIDAD

**FOCO:** Validar el candidato completo con servicios reales autorizados y evaluación independiente.

**ENTRADA OBLIGATORIA:** Fases 2–9 cerradas; release candidate congelado y entorno aislado disponible.

**CAMBIOS INCLUIDOS:** VER-03, SEC-02.

**ENTREGABLES DE FASE:** Integración/E2E/performance/recovery, vulnerability assessment, security audit y pentest/retest.

**PUERTA DE SALIDA:** Resultados dentro de targets y cero vulnerabilidad sobre threshold sin waiver aprobado.

**SIGUIENTE FASE PERMITIDA:** Fase 11.

## CAMBIO VER-03 — Integración, sistema, performance y recuperación

**OBJETIVO:** verificar comportamiento con componentes reales autorizados.
**HALLAZGOS:** ENV-001, PERF-001, VER-001.
**PRIORIDAD / SEVERIDAD:** P1 / Alta.
**DEPENDENCIAS:** DB-03, INT-02, AUTH-01, VER-02.
**PARALELO:** preparación sí; ejecución coordinada.

**PASOS:**

1. Levantar MySQL limpio y aplicar migraciones.
2. Ejecutar las dos pruebas hoy omitidas.
3. Ejecutar flujo E2E por rol con Auth0 de test.
4. Ejecutar alta/reevaluación con Manager de test.
5. Ejecutar entrega/recovery PIN con Resend sandbox autorizado.
6. Ejecutar failure injection: DB, Manager, Auth0, Resend y red.
7. Verificar rollback, no duplicación y consistencia de auditoría.
8. Preparar dataset representativo y medir Orders/History/Metrics/Calendar.
9. Definir presupuesto de latencia/throughput y degradación.
10. Probar backup/restore y smoke del artefacto restaurado.

**PRUEBAS:** integración completa, E2E, carga, estrés y recuperación.
**REGRESIONES:** tocar datos reales o servicios productivos.
**RIESGO:** acciones externas; usar cuentas/datos dedicados.
**ROLLBACK:** destruir entorno aislado y restaurar snapshot.
**CIERRE:** resultados dentro de targets y evidencia asociada al release.
**SIGUIENTE:** SEC-02 sobre el mismo candidato y después FINAL-01; CI-01 ya debe estar cerrado desde la fase 7.

## CAMBIO SEC-02 — Ciclo completo de vulnerabilidades y pentest

**OBJETIVO:** cerrar E80 5.4.2–5.4.5.
**HALLAZGOS:** SEC-002, SEC-003, SEC-004, DEP-001, SBOM-001.
**PRIORIDAD / SEVERIDAD:** P1 / Alta.
**DEPENDENCIAS:** TAILOR-01, BUILD-01, STD-01, VER-01; pentest tras release candidato.
**PARALELO:** análisis estático sí; pentest no antes de estabilizar.

**PASOS:**

1. Definir política de severity/scoring, fuentes autorizadas y SLA de corrección.
2. Correlacionar SBOM con vulnerabilidades conocidas mediante mecanismo autorizado.
3. Ejecutar revisión manual de auth, autorización, PIN, errores, logs, queries, datos y configuración.
4. Ejecutar análisis estático, dependency scan y secret scan.
5. Ejecutar análisis dinámico/fuzzing sobre entorno aislado autorizado.
6. Registrar cada finding con componente, severidad, evidencia y owner.
7. Corregir antes de qualification.
8. Repetir el mismo análisis para confirmar cada fix.
9. Para residual: justificación, waiver, riesgo actualizado y aprobación.
10. Ejecutar auditoría interna de seguridad con independencia acordada.
11. Acordar scope/escenarios del pentest independiente.
12. Ejecutar pentest en desarrollo, qualification/pre-acceptance según tailoring.
13. Corregir y retestear; actualizar riesgo.

**PRUEBAS ANTES:** baseline de scans/review.
**PRUEBAS DESPUÉS:** rerun y retest independiente.
**REGRESIONES:** false positives cerrados sin análisis o escaneo sólo de dependencias directas.
**RIESGO:** pruebas activas sobre sistemas reales; usar entorno autorizado y reglas de engagement.
**ROLLBACK:** detener prueba al criterio acordado; restaurar snapshot.
**CIERRE:** cero vulnerabilidades sobre threshold sin waiver y pentest/retest aprobado.
**SIGUIENTE:** FINAL-01.

# FASE 11 — REAUDITORÍA Y CIERRE ECSS

**FOCO:** Reevaluar todos los controles sobre el release exacto y emitir la decisión final.

**ENTRADA OBLIGATORIA:** Todas las fases anteriores cerradas y evidencia congelada.

**CAMBIOS INCLUIDOS:** FINAL-01.

**ENTREGABLES DE FASE:** Checklist revalidado, registro final de no conformidades/waivers y expediente del release.

**PUERTA DE SALIDA:** Todo requisito aplicable en CUMPLE, tailoring aprobado, NO APLICA justificado y cero NO DETERMINABLE.

**SIGUIENTE FASE PERMITIDA:** Aceptación y release controlado.

## CAMBIO FINAL-01 — Reauditoría completa de 1.130 controles

**OBJETIVO:** demostrar conformidad del release candidato.
**HALLAZGOS:** todos.
**REQUISITOS:** los tres estándares completos; handbook sólo interpretativo.
**PRIORIDAD / SEVERIDAD:** P0 de cierre / Alta.
**DEPENDENCIAS:** todas las acciones aplicables cerradas.
**PARALELO:** revisión por capítulos sí; consolidación única.

**PASOS:**

1. Congelar release candidate y hashes.
2. Releer las versiones normativas entregadas.
3. Recorrer cada fila del checklist; no heredar estados automáticamente.
4. Adjuntar evidencia por requisito aplicable.
5. Confirmar cada `NO APLICA` y decisión de tailoring.
6. Resolver todo `NO DETERMINABLE` mediante evidencia suficiente o una decisión aprobada de aplicabilidad/tailoring; si no es posible, el release no cierra la auditoría.
7. Repetir grafo de imports, símbolos, duplicación y mocks.
8. Repetir clean build, migrations vacío/upgrade, lint, análisis y coverage.
9. Repetir unit/integration/system/security/performance/recovery.
10. Incorporar source review, vulnerability assessment, auditoría y pentest/retest.
11. Ejecutar smoke por módulo y por rol.
12. Verificar trazabilidad bidireccional y evidencia inmutable.
13. Emitir registro final de no conformidades/waivers.

**PRUEBAS:** todos los gates definidos.
**REGRESIONES:** reusar evidencia de otro commit o ambiente.
**RIESGO:** declarar cumplimiento con controles abiertos.
**ROLLBACK:** bloquear release y reabrir hallazgo.
**CIERRE:** cada aplicable `CUMPLE`, tailoring aprobado, no aplica justificado y cero requisitos en `NO DETERMINABLE`.
**SIGUIENTE:** aceptación/release controlado.

---

# PARTE V — ORDEN EXACTO DE IMPLEMENTACIÓN

## V.1 Secuencia obligatoria de fases

| Orden | Fase | Condición para iniciarla | Condición para cerrarla |
|---:|---|---|---|
| 1 | 0 — Línea base | Repositorio disponible | Baseline reproducible y evidencia ligada al commit |
| 2 | 1 — Aplicabilidad y trazabilidad | Fase 0 cerrada | Tailoring decidido y trazabilidad inicial completa |
| 3 | 2 — Persistencia | Fase 1 cerrada | Replay/upgrade/rollback verificados y drift cero |
| 4 | 3 — Flujos críticos | Fase 2 cerrada | Manager, Calendar, Auth0, Orders, Kanban y Payments verificados |
| 5 | 4 — Estándar, métricas y build | Fase 3 cerrada | Controles ejecutables y build reproducible con SBOM |
| 6 | 5 — Seguridad, datos y robustez | Fase 4 cerrada | Controles técnicos y de integridad aprobados |
| 7 | 6 — Cobertura y verificación | Fase 5 cerrada | Targets de pruebas/coverage logrados y trazados |
| 8 | 7 — CI obligatorio | Fase 6 cerrada | Gates negativos probados y branch protection activa |
| 9 | 8 — Limpieza del producto | Fase 7 cerrada | Duplicados, muertos y dobles de runtime retirados sin regresión |
| 10 | 9 — Externalización de tests | Fase 8 cerrada | Suite externa equivalente y obligatoria; tests locales retirados |
| 11 | 10 — Calificación y seguridad | Fase 9 cerrada | Release candidate calificado y vulnerabilidades tratadas |
| 12 | 11 — Reauditoría | Fase 10 cerrada | Los 1.130 controles quedan resueltos según aplicabilidad |

## V.2 Orden exacto de cambios

1. **Fase 0:** ejecutar `GOV-01` y aprobar su puerta de salida.
2. **Fase 1:** ejecutar `TAILOR-01`; luego crear la matriz inicial con `TRACE-01` y mantenerla en cada cambio posterior.
3. **Fase 2:** ejecutar `DB-01` para diagnosticar sin modificar datos.
4. **Fase 2:** ejecutar `DB-02` y demostrar replay desde una base vacía.
5. **Fase 2:** ejecutar `DB-03` sobre copia aislada, validar upgrade/rollback y aplicar a `dev` sólo con autorización.
6. **Fase 2:** repetir los smoke tests de Orders/Kanban/Payments y cerrar o reclasificar el error de `dev` con evidencia.
7. **Fase 3:** ejecutar `INT-01` antes de tocar el fixture de Manager.
8. **Fase 3:** ejecutar `INT-02`, verificar adapter/cutover y retirar el fallback sólo cuando no existan consumidores.
9. **Fase 3:** ejecutar `CAL-01` y `AUTH-01`; pueden correr en paralelo si no comparten owner ni archivos.
10. **Fase 3:** probar alta, reevaluación, Kanban, Payments, Calendar y RBAC; aprobar la puerta.
11. **Fase 4:** ejecutar `STD-01` y fijar reglas obligatorias de ambos proyectos.
12. **Fase 4:** ejecutar `MET-01` y registrar el baseline de métricas.
13. **Fase 4:** ejecutar `BUILD-01`, comprobar clean build y generar SBOM.
14. **Fase 5:** ejecutar `SEC-01`, `ROB-01` y `DATA-01`; integrar uno por vez y repetir pruebas afectadas.
15. **Fase 6:** ejecutar `VER-01` y aprobar targets de coverage según tailoring.
16. **Fase 6:** ejecutar `VER-02`; completar pruebas unitarias, boundary, robustez, concurrencia y seguridad.
17. **Fase 7:** ejecutar `CI-01` y provocar deliberadamente una falla de cada gate para probar que bloquea el merge.
18. **Fase 8:** ejecutar `CLEAN-01` y consolidar infraestructura duplicada antes de borrar consumidores.
19. **Fase 8:** ejecutar `CLEAN-02` y `CLEAN-03` en cambios separados y revertibles.
20. **Fase 8:** repetir suite, artifact inspection, build y smoke; no avanzar con una regresión abierta.
21. **Fase 9:** ejecutar `TEST-EXT-01` y demostrar equivalencia de casos, cobertura y trazabilidad.
22. **Fase 9:** hacer obligatoria la suite externa en CI antes de ejecutar `CLEAN-04`.
23. **Fase 9:** ejecutar `CLEAN-04` y retirar las carpetas de test locales en un commit aislado.
24. **Fase 9:** repetir suite externa, build, artifact inspection y smoke sobre el repositorio ya limpio.
25. **Fase 10:** congelar el release candidate y ejecutar `VER-03` en el ambiente controlado.
26. **Fase 10:** ejecutar `SEC-02`, corregir vulnerabilidades, repetir scans/pentest y cerrar sólo contra el mismo candidato.
27. **Fase 11:** ejecutar `FINAL-01`, reauditar los 1.130 IDs y las cláusulas sin ID contiguo, y emitir la decisión final.

---

# PARTE W — DISTRIBUCIÓN PARA SIETE PERSONAS

| Persona | Workstream | Archivos/áreas | Bloqueos y conflictos |
|---|---|---|---|
| 1 | DB y datos | Prisma, migraciones, constraints | owner único de schema; coordina 3 y 4 |
| 2 | Manager/Orders/Payments | source adapter, services, contracts | espera INT-01 y DB; no toca errores centrales |
| 3 | Calendar/robustez/frontend API | Calendar, validation, timeouts | acuerda parsers con 5; usa DB estable |
| 4 | Auth0/seguridad/auditoría | RBAC, security tables, assessments | cambios externos autorizados; coordina 1 y 7 |
| 5 | Coding/cleanup frontend/backend | lint, duplicación, muertos, mocks | no borra hasta CI/coverage; owner de infraestructura común |
| 6 | Verificación/métricas/suite externa | tests, coverage, performance, traceability | controla gate previo a borrado |
| 7 | CI/build/SBOM/release | workflow, clean build, evidence | integra resultados; no reescribe schema ni tests |

## W.1 Trabajo necesariamente secuencial

- Las fases 0–11 avanzan en orden; cada puerta de salida autoriza la fase siguiente.
- Persona 1 termina DB-02 y DB-03 en la fase 2 antes de integrar flujos críticos.
- Persona 2 termina Manager en la fase 3 antes de retirar el fixture.
- Persona 6 termina coverage en la fase 6 y persona 7 activa CI en la fase 7 antes de la limpieza destructiva.
- Persona 6 demuestra la equivalencia de la suite externa en la fase 9 antes de retirar los tests locales.
- Persona 4 coordina pentest sólo sobre el release candidate estable de la fase 10.

## W.2 Puntos de integración

- `schema.prisma` y migrations: persona 1 exclusiva.
- `server.js`, errors y middleware: persona 5 exclusiva por ventana.
- `security-ci.yml`: persona 7 exclusiva.
- contratos Orders/Manager: persona 2; persona 6 consume, no redefine.
- parsers/cliente HTTP compartidos: persona 3 con revisión de persona 5.

---

# PARTE X — ESTRATEGIA DE INTEGRACIÓN

1. Un hallazgo o cambio controlado por PR.
2. Commits de eliminación independientes y revertibles.
3. Migraciones separadas de refactors.
4. Tests de caracterización antes de cambiar contratos.
5. Interfaces centrales primero; consumidores después.
6. No retirar fixture antes de Manager.
7. No retirar implementación antigua hasta cero consumidores.
8. No borrar tests antes de suite externa verde y obligatoria.
9. Promoción: local aislado → CI → integración → staging → aceptación.
10. Todo PR declara requirement IDs, hallazgos, pruebas, riesgos y rollback.
11. Conflictos en archivos compartidos se resuelven por owner, no por merge automático ciego.
12. Ningún waiver es permanente sin owner, riesgo, aprobación y fecha de revisión.

## X.1 Plantilla de PR

- Baseline y commit.
- Hallazgo(s) y requirement ID(s).
- Estado antes/después.
- Archivos cambiados.
- Pruebas antes/después y resultados.
- Coverage/métricas afectadas.
- Riesgo de regresión.
- Seguridad/datos/migración.
- Rollback probado.
- Evidencia adjunta.
- Checklist actualizado.

---

# PARTE Y — REAUDITORÍA FINAL

## Y.1 Gate automático mínimo

- clean install/build reproducible;
- migrations desde vacío y upgrade histórico, drift cero;
- lint/análisis frontend y backend, cero warnings no dispensados;
- cero ciclos, huérfanos, exports sin uso y duplicados fuera de waiver;
- cero mocks/fakes/fixtures/demo en artefacto productivo;
- unit/integration/system/security tests verdes;
- coverage conforme a tailoring y sin regresión;
- SBOM y assessment de dependencias;
- secret scan y security source review;
- performance/robustez dentro de targets;
- suite externa obligatoria tras eliminación local.

## Y.2 Evidencia externa mínima

- DB real y migraciones aplicadas;
- Auth0 zero-diff y tokens por rol;
- Manager/Resend integrados;
- deployment/rollback/backup-restore;
- monitoreo, alertas y auditoría;
- vulnerability assessments;
- pentest independiente y retest.

## Y.3 Condición de cumplimiento

```text
Requirement ID
→ aplicabilidad/tailoring
→ control técnico
→ implementación exacta
→ prueba/revisión/análisis
→ resultado ligado al release
→ evidencia aprobada
→ CUMPLE
```

No se declara “100 %” mientras exista un requisito aplicable en `CUMPLE PARCIALMENTE`, `NO CUMPLE` o `NO DETERMINABLE`, ni un tailoring sin decisión aprobada. La limpieza del repositorio es necesaria pero no suficiente: la conformidad exige además evidencia integrada, operacional y de seguridad.
