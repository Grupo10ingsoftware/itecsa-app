# Auditoría técnica integral ECSS — Itecsa App

**Fecha de corte:** 30-09-2026
**Baseline técnico auditado:** `17974b7612756c5eaa3350289dde40ff987637e8` (`dev`)
**Rama de elaboración:** `fix`
**Tipo de revisión:** código, repositorio y verificaciones locales seguras; sin modificar el producto, la base de datos ni servicios externos.
**Checklist exhaustivo:** `CHECKLIST_ECSS_REQUISITOS_2026-09-30.md`
**Plan:** `PLAN_ACCION_AUDITORIA_ECSS_2026-09-30.md`

> Conclusión: el producto todavía no puede declararse conforme al 100 % con los requisitos técnicos aplicables. Tiene una base funcional y de seguridad apreciable, pero mantiene brechas críticas en migraciones e integración de notas de venta; brechas altas en trazabilidad, verificación, coding standard, métricas, vulnerabilidades y evidencia operacional; y deuda demostrada de código muerto, duplicación, mocks y artefactos de prueba dentro de `src`.

> La indicación del solicitante de que la documentación está lista se trata como una **premisa de alcance**, no como evidencia de una reauditoría documental independiente. Los controles exclusivamente documentales se cierran con esa salvedad; todo control que necesita código, ejecución o entorno se evalúa técnicamente.

---

# PARTE A — RESUMEN EJECUTIVO

## A.1 Alcance

Se auditó el producto software completo: frontend React/Vite; backend Express/Node.js; API; Auth0, identidad, roles, permisos y PIN; Prisma/MariaDB-MySQL; schema y migraciones; integraciones Auth0 Management y Resend; módulos funcionales; configuración, scripts, build y CI; dependencias; tests, mocks, fixtures y fakes; código muerto, símbolos sin uso y duplicación; seguridad, robustez y evidencia de verificación.

No se modificó código funcional, no se ejecutaron migraciones y no se escribieron datos ni servicios externos.

## A.2 Fuentes de verdad

| Rol | Documento | Tratamiento |
|---|---|---|
| Normativo I | ECSS-E-ST-40C Rev.1, 30-04-2025 | Ingeniería de software |
| Normativo II | ECSS-Q-ST-80C Rev.2, 30-04-2025 | Software product assurance |
| Normativo III | ECSS-E-ST-80C, 01-07-2024 | Seguridad en el ciclo de vida |
| Interpretativo | ECSS-E-HB-40A, 11-12-2013 | Contexto y técnicas; no crea incumplimientos por sí solo |

No se utilizó Internet ni otra fuente normativa.

## A.3 Catálogo reconstruido

| Estándar | Requirement IDs |
|---|---:|
| ECSS-E-ST-40C Rev.1 | 688 |
| ECSS-Q-ST-80C Rev.2 | 315 |
| ECSS-E-ST-80C | 127 |
| **Total** | **1.130** |

El checklist contiene una fila por ID y una sección adicional para enunciados `shall` cuyo ID no aparece contiguo en el Markdown. No se inventaron identificadores.

## A.4 Fortalezas demostradas

- Backend: 791 pruebas, 789 correctas, 2 omitidas y 0 fallidas.
- Frontend: verificaciones funcionales más 17 pruebas Node, todas correctas.
- ESLint frontend, `prisma validate` y `verify-data-artifacts.sh` correctos.
- JWT, identidad interna y autorización por capability.
- PIN, validación de estado y transacciones en operaciones sensibles.
- Controles de concurrencia en Orders, Payments y PIN.
- Errores públicos sanitizados y request IDs.
- Lockfiles con integridad.
- Ningún módulo productivo importa desde `test`.

## A.5 Brechas de mayor impacto

1. **DB-001 — Crítica:** las migraciones no reproducen `schema.prisma`.
2. **INT-001 — Alta:** Orders y Payments usan por defecto `FixtureSalesNoteRepository`; no existe adapter Manager.
3. **CAL-001 — Alta:** Calendar acepta `items` del cliente como fuente de cálculo.
4. **AUTH-001 — Alta:** el snapshot Auth0 no acredita dos permisos, ocho roles ni el binding Post Login.
5. **TRACE-001 / VER-001 — Alta:** falta la cadena requisito→código→prueba→resultado, coverage y validación integrada.
6. **STD-001 / MET-001 — Alta:** no hay coding standard integral, lint backend ni programa de métricas.
7. **SEC-002/003/004 — Alta:** no existe evidencia completa de security code review, vulnerability management y pentest independiente.
8. **CODE-001 / DUP-001 / MOCK-001 — Media:** 41 archivos de producto no alcanzables, duplicación y mocks/fakes/fixtures en `src`.

## A.6 Sobre la meta de 100 %

Ejecutar íntegramente el plan dejaría el repositorio en condiciones de reauditoría, pero no permite prometer anticipadamente un certificado de 100 %. El cierre real necesita: controles aplicables en `CUMPLE`; tailoring aprobado; evidencia para los `NO DETERMINABLE`; pruebas sobre DB/Auth0/Manager/Resend autorizados; assessment y pentest independientes; y reauditoría del release candidato.

---

# PARTE B — METODOLOGÍA

## B.1 Secuencia

1. Lectura completa de los cuatro documentos.
2. Separación de normas y handbook.
3. Extracción de 1.130 IDs.
4. Clasificación conservadora de aplicabilidad y estado.
5. Reconocimiento de arquitectura y entry points.
6. Auditoría transversal antes de módulos.
7. Descenso a repositorios, servicios, controladores, rutas, schema, migraciones y scripts.
8. Ejecución local no destructiva.
9. Grafo de imports y búsqueda de consumidores.
10. Consolidación sin duplicar causas raíz.
11. Checklist y plan por dependencias.

## B.2 Interpretación normativa

Se distinguieron `shall`, `should`, `may`, `need not`, `can`, notas y texto descriptivo. Annex U de ECSS-E-ST-40C se usó como guía informativa; la obligación de verificar código y robustez deriva de 5.8.3.5.

## B.3 Estados

- `CUMPLE`: evidencia suficiente, o control exclusivamente documental cubierto por la premisa explícita y marcado como no revalidado.
- `CUMPLE PARCIALMENTE`: implementación incompleta.
- `NO CUMPLE`: evidencia positiva de brecha.
- `NO DETERMINABLE`: evidencia insuficiente.
- `NO APLICA`: ajeno al producto, con justificación.
- `REQUIERE TAILORING`: depende de una decisión explícita.

## B.4 Ejecuciones del 30-09-2026

| Comando | Resultado |
|---|---|
| `RUN_MYSQL_INTEGRATION=false npm test` en backend | 791; 789 pass, 2 skip, 0 fail |
| `npm test` en frontend | correcto; 17/17 Node más checks funcionales |
| `npm run lint` en frontend | correcto |
| `npm run prisma:validate` | schema válido |
| `scripts/verify-data-artifacts.sh` | correcto |
| `node scripts/rbac.mjs --check docs/auth0/rbac.observed.json` | falla: 2 permisos, 8 roles y binding no acreditados |

Las dos pruebas omitidas verifican serialización de cuotas persistentes MySQL y rollback conjunto del evento de seguridad. Por ello el resultado local no constituye integración DB completa.

## B.5 Limitaciones

- Sin acceso a DB `dev`, `_prisma_migrations`, Auth0, Manager o Resend reales.
- Sin `npm audit`, pentest, DAST, fuzzing o carga.
- Build local no ejecutado para evitar crear artefactos; no se observó el artefacto desplegado.
- Deployment, backup/restore, alertas y privilegios efectivos DB no verificables.
- Documentación del proyecto considerada lista por instrucción, no revalidada.

---

# PARTE C — MAPA TÉCNICO

```text
React 19 / Vite 8
  ├─ Auth0 React SDK
  ├─ módulos funcionales
  └─ cliente HTTP
          │ JWT + capabilities
          ▼
Express 5 / Node.js ESM
  ├─ requestContext + errorHandler
  ├─ JWT → identidad interna → capability → PIN
  ├─ controllers → services → repositories
  ├─ Prisma 7 + MariaDB adapter
  ├─ Auth0 Management API
  ├─ Resend
  └─ fixture local de Notas de Venta
          │
          ▼
MySQL/Aiven + servicios externos
```

## C.1 Entry points

- Frontend: `capaVista/src/main.jsx`.
- Backend productivo: `capaServidor/src/app/app.js`.
- Backend desarrollo: `capaServidor/src/app/dev.js`.
- HTTP/middlewares: `capaServidor/src/server.js`.

`dev.js` es entry point real de `npm run dev`, no código muerto.

## C.2 Módulos

Auth, Users, Orders, Kanban, Payments, Order History, Messages, Production Calendar, Production Capacity, Production Load, Metrics, Clients, Products, Profile, Health, Security y Demo Orders. `productionHistory` es un prototipo frontend no conectado al router.

## C.3 Configuración y CI

- Proyectos npm separados para vista y servidor; Prisma CLI en `tooling/prisma`.
- Lockfiles por proyecto; `package-lock.json` raíz vacío sin `package.json` raíz.
- CI en `.github/workflows/security-ci.yml`.
- Push sólo para `main` y `opt-historial`, no `dev`.
- CI materializa el schema con `migrate diff --from-empty`, no reproduce migraciones.

---

# PARTE D — MATRIZ DE APLICABILIDAD

| Familia | Clasificación | Justificación |
|---|---|---|
| Arquitectura, interfaces, código, build, testing | APLICABLE | Producto web ejecutable |
| Integración, verificación y validación | APLICABLE | Capas y servicios externos |
| Configuration management | APLICABLE | Git, lockfiles, schema y migraciones |
| FOSS/software reutilizado | APLICABLE | Dependencias npm |
| Seguridad y vulnerabilidades | APLICABLE | Identidad, permisos, PIN y datos |
| Métricas y cobertura | APLICABLE | Código y pruebas existentes |
| Criticality/dependability | REQUIERE TAILORING | categoría no aportada |
| Security sensitivity | REQUIERE TAILORING | clasificación no aportada |
| ISVV/independencia | REQUIERE TAILORING | depende de riesgo/acuerdo |
| Código generado Prisma | REQUIERE TAILORING | tratamiento no definido |
| Tiempo real/embarcado/OBCP | NO APLICA o tailoring | producto web observado |
| Dispositivos programables/FPGA | NO APLICA | no identificados |
| Software para reutilización externa | NO APLICA | no es el objetivo observado |
| Personal/sitio/operación externa | NO DETERMINABLE | evidencia fuera del repo |

---

# PARTE E — ECSS-E-ST-40C REV.1

## E.1 Procesos

| Cláusula | Estado técnico | Evidencia |
|---|---|---|
| 5.2 requisitos relacionados con software | CUMPLE PARCIALMENTE | trazabilidad/verificación incompletas |
| 5.3 gestión | CUMPLE PARCIALMENTE | Git/CI presentes; gates incompletos |
| 5.4 requisitos y arquitectura | CUMPLE PARCIALMENTE | capas claras; Manager, Calendar y migraciones con brechas |
| 5.5 diseño/coding/unit/integration | CUMPLE PARCIALMENTE | suites amplias; código muerto, duplicación y sin coverage |
| 5.6 validación | CUMPLE PARCIALMENTE | local, no sistema real integrado |
| 5.7 entrega/aceptación | NO DETERMINABLE | sin release/entorno/acta |
| 5.8 verificación | NO CUMPLE | sin matriz, coverage, robustez ni análisis integral |
| 5.9 operación | NO DETERMINABLE | evidencia externa ausente |
| 5.10 mantenimiento | CUMPLE PARCIALMENTE | Git/tests; métricas/gates insuficientes |
| 5.11 seguridad | CUMPLE PARCIALMENTE | controles locales; assurance incompleto |

## E.2 Controles técnicos críticos

### E40-CODE-01

- **Cláusula/ID/nivel:** 5.8.3.5, `ECSS-E-ST-40_0860134`, SHALL.
- **Control:** consistencia, trazabilidad, testabilidad, runtime seguro y justificación de código no trazado.
- **Evidencia:** error handler y tests activos; 41 archivos no alcanzables, símbolos sin uso, duplicación y sin matriz code↔requirement.
- **Estado/hallazgos:** `NO CUMPLE`; CODE-001, CODE-002, DUP-001, TRACE-001, VER-001.

### E40-COVERAGE-01

- **Cláusula/ID/nivel:** 5.8.3.5 b/c, `_0860137` para medición; inciso b sin ID contiguo, SHALL.
- **Control:** acordar cobertura por criticality, medir y justificar no cubierto.
- **Evidencia:** scripts sin instrumentación ni reporte.
- **Estado/hallazgos:** `NO CUMPLE`; `REQUIERE TAILORING` para targets; VER-001, TAILOR-001.

### E40-UNIT-01

- **Cláusula/IDs:** 5.5.3.2, `_0860088` y `_0860089`.
- **Control:** unit tests de requisitos, límites, errores, fuera de rango y estrés.
- **Evidencia:** 791 backend y 17 Node frontend; sin coverage/estrés completo/DB integrada.
- **Estado:** `CUMPLE PARCIALMENTE`; VER-001, ROB-001, PERF-001.

### E40-ROBUST-01

- **Cláusula:** 5.8.3.5 f, SHALL sin ID visible contiguo.
- **Control:** verificar robustez del código fuente.
- **Evidencia:** validación puntual; fechas normalizables, capacidad no estricta, sin análisis backend/fault injection sistemático.
- **Estado:** `NO CUMPLE`; ROB-001, STD-001, VER-001.

### E40-INTEGRATION-01

- **Cláusulas/IDs:** 5.5.4 `_0860090`; 5.8.3.7 `_0860143`.
- **Control:** integrar/verificar contra interfaces y resultados.
- **Evidencia:** Manager inexistente y pruebas MySQL omitidas.
- **Estado:** `CUMPLE PARCIALMENTE`; INT-001, DB-001, ENV-001.

## E.3 Annex U como guía informativa

| Check adaptado a JavaScript | Resultado |
|---|---|
| No inicializados/defaults | CUMPLE PARCIALMENTE |
| Código no alcanzable/inútil | NO CUMPLE |
| Límites/accesos inválidos | CUMPLE PARCIALMENTE |
| División cero/NaN/overflow | NO CUMPLE: sin análisis sistemático |
| Conversiones/coerción | CUMPLE PARCIALMENTE |
| Recursos/promesas/lifetime | NO DETERMINABLE |
| Loops/terminación | NO DETERMINABLE |
| Concurrencia | CUMPLE PARCIALMENTE: dos MySQL omitidas |
| Error handling | CUMPLE PARCIALMENTE: ruta segura, implementaciones duplicadas |

---

# PARTE F — ECSS-Q-ST-80C REV.2

## F.1 Familias

| Cláusula | Estado | Evidencia |
|---|---|---|
| 6.2.3 critical software | REQUIERE TAILORING | categoría no acordada |
| 6.2.6 verification | CUMPLE PARCIALMENTE | suites/CI; falta coverage/trazabilidad |
| 6.2.7 reused/FOSS | CUMPLE PARCIALMENTE | lockfiles; falta evaluación/SBOM |
| 6.2.8 generated code | REQUIERE TAILORING | Prisma no tratado explícitamente |
| 6.2.9 software security | CUMPLE PARCIALMENTE | controles locales; análisis incompleto |
| 6.2.10 security-sensitive | CUMPLE PARCIALMENTE | falta clasificación/assurance |
| 6.3.4 coding | NO CUMPLE | sin estándar integral/lint backend |
| 6.3.5 testing | CUMPLE PARCIALMENTE | niveles, coverage y entorno incompletos |
| 7.1 metrics | NO CUMPLE | sin programa/targets |

## F.2 Controles clave

### Q80-COD-01

- **Cláusula/IDs:** 6.3.4.1–8, `_0720167`, `_0720168`, `_0720170`–`_0720175`; 6.3.4.3 sin ID contiguo.
- **Control:** estándar observado, seguridad/naming/comentarios, herramientas, mediciones y evaluación continua.
- **Evidencia:** ESLint sólo frontend; sin límites backend; muertos/duplicados/exports sin consumidor.
- **Estado:** `NO CUMPLE`; STD-001, CODE-001, CODE-002, DUP-001, MET-001.

### Q80-TEST-01

- **Cláusula/IDs:** 6.3.5.1 `_0720176`, 6.3.5.2 `_0720177`, 6.3.5.3 `_0720178`, 6.3.5.5 a sin ID contiguo.
- **Control:** estrategia por nivel, coverage acordado/medido, revisión y feedback.
- **Evidencia:** pruebas presentes; coverage/trazabilidad/DB/aceptación ausentes.
- **Estado:** `CUMPLE PARCIALMENTE`; VER-001, TRACE-001, TAILOR-001.

### Q80-MET-01

- **Cláusula/IDs:** 7.1.4 `_0720231`, 7.1.5 `_0720232`, 7.1.6 `_0720233`, 7.1.7 `_0720234`.
- **Control:** programa de tamaño, complejidad, defectos, cobertura, fallos y precisión.
- **Evidencia/estado:** no se halló; `NO CUMPLE`, MET-001.

### Q80-DEACT-01

- **Cláusula/ID:** 6.2.6.5 `_0720123` y 6.2.3.2 `_0720094`.
- **Control:** eliminar o demostrar aislamiento del código desactivado.
- **Evidencia/estado:** 41 archivos y símbolos sin consumidores; `NO CUMPLE`, CODE-001/002.

---

# PARTE G — ECSS-E-ST-80C

## G.1 Principios en código

| Principio | Estado | Evidencia |
|---|---|---|
| Attack Surface Reduction | CUMPLE PARCIALMENTE | demo bloqueado; muertos/mocks aumentan superficie |
| Defence-in-Depth | CUMPLE | JWT + identidad + capability + estado + PIN |
| Domain Separation | CUMPLE PARCIALMENTE | capas/roles; entorno externo no acreditado |
| Fail Secure | CUMPLE | autorización/configuración fallan cerradas en pruebas |
| Least Privilege | CUMPLE PARCIALMENTE | matriz en código; tenant no verificado |
| Need-to-Know | CUMPLE PARCIALMENTE | proyecciones minimizadas; clasificación ausente |
| Secure Evolvability | CUMPLE PARCIALMENTE | Git/tests; migraciones/CI defectuosos |
| Separation of Duties | CUMPLE PARCIALMENTE | roles; independencia no demostrada |
| Redundancy | REQUIERE TAILORING | objetivos de disponibilidad ausentes |

## G.2 Assessment

| Cláusula / IDs | Estado | Brecha |
|---|---|---|
| 5.4.2 `_0600119`–`_0600124` | NO CUMPLE | sin review/análisis, corrección, rereview y waiver completos |
| 5.4.3 `_0600126`–`_0600128` | NO DETERMINABLE | auditorías periódicas no evidenciadas |
| 5.4.4 `_0600129`–`_0600133` | NO CUMPLE | sin política/correlación/assessments demostrables |
| 5.4.5 `_0600134`–`_0600140` | NO CUMPLE | sin pentest independiente acreditado |

Componentes sensibles candidatos: auth, identidad, autorización, usuarios/roles, PIN, Orders, Payments, auditoría, migraciones, secretos e integraciones. La clasificación formal requiere tailoring.

---

# PARTE H — COMPLEMENTO ECSS-E-HB-40A

Estas conclusiones son interpretativas, no obligaciones autónomas:

- trazabilidad técnica permite justificar unidades y detectar código ajeno;
- coverage localiza rutas no ejecutadas;
- verificación combina pruebas, revisión y análisis;
- robustez incluye entradas anómalas, fallos externos y degradación;
- complejidad, duplicación y acoplamiento reducen testabilidad;
- limpieza exige regresión antes y después;
- retirar tests sin reemplazo elimina evidencia aunque no sean runtime.

---

# PARTE I — AUDITORÍA TRANSVERSAL

| Área | Estado | Hallazgo |
|---|---|---|
| Arquitectura | CUMPLE PARCIALMENTE | capas claras; integraciones/utilidades duplicadas |
| Frontend | CUMPLE PARCIALMENTE | lint/tests; 36 huérfanos y timeouts no globales |
| Backend | CUMPLE PARCIALMENTE | tests; 5 huérfanos y sin lint |
| API | CUMPLE PARCIALMENTE | Calendar confía en datos cliente |
| DB | NO CUMPLE | migraciones no reproducibles |
| Autenticación | CUMPLE | evidencia local suficiente |
| Autorización | CUMPLE PARCIALMENTE | tenant real no acreditado |
| PIN | CUMPLE PARCIALMENTE | DB/Resend reales no verificados |
| Secretos | CUMPLE PARCIALMENTE | no hallados en Git; operación no evaluada |
| Errores | CUMPLE PARCIALMENTE | handler seguro; duplicación |
| Logging/auditoría | CUMPLE PARCIALMENTE | inmutabilidad/alertas/retención no acreditadas |
| Dependencias/FOSS | CUMPLE PARCIALMENTE | lockfiles; sin SBOM/evaluación completa |
| Configuration management | CUMPLE PARCIALMENTE | Git; migraciones/CI defectuosos |
| Testing | CUMPLE PARCIALMENTE | 74 archivos; niveles/coverage incompletos |
| Coverage | NO CUMPLE | no medido |
| Static analysis | NO CUMPLE | sólo frontend |
| Dynamic/robustness | CUMPLE PARCIALMENTE | sin fault injection/fuzz/load sistemáticos |
| Build | NO DETERMINABLE | no ejecutado/artefacto no observado |
| Deployment | NO DETERMINABLE | evidencia externa ausente |
| Maintenance | CUMPLE PARCIALMENTE | métricas/gates insuficientes |

---

# PARTE J — AUDITORÍA POR MÓDULO

| Módulo | Responsabilidad/interfaces | Datos/seguridad | Testing | Estado/hallazgo |
|---|---|---|---|---|
| Auth | JWT, perfil, reset, PIN, Auth0/Resend | fail-secure, throttle | amplio local | PARCIAL: externos y fake en `src` |
| Users | alta/edición/estado/movimientos | Management API, rol | amplio | PARCIAL: AUTH-001 |
| Orders | NV, alta, edición, transición | Prisma/transacciones | amplio | NO CUMPLE: INT-001/DB-001 |
| Kanban | lista/movimiento | Orders API/PIN | reglas/rutas | PARCIAL: schema físico |
| Payments | decisión/registros | PIN/locks | concurrencia | PARCIAL: fixture/DB omitida |
| Order History | lista/detalle/eventos | queries/redacción | local | PARCIAL: performance |
| Messages | inbox/notificaciones | ownership | local | PARCIAL: operación |
| Calendar | cálculo carga | items del cliente | mocks | NO CUMPLE: CAL-001/ROB-001 |
| Capacity | capacidad producto | capability/Prisma | local | PARCIAL: constraints/DB |
| Load | carga diaria | capability/Prisma | local | PARCIAL: RBAC externo |
| Metrics | resumen periodo | capability/límites | local | PARCIAL: métricas/performance |
| Clients/Products | catálogos | escrituras bloqueadas | matriz HTTP | PARCIAL: DB/trazabilidad |
| Profile | identidad propia | ignora ID cliente | local | PARCIAL: entorno |
| Health | live/readiness | token/config | local | PARCIAL: despliegue |
| Security | throttle/audit | tablas | 2 MySQL skip | PARCIAL: migración/operación |
| Demo Orders | demo | bloqueado prod | específica | PARCIAL: permanece en `src` |
| Production History | prototipo | mock/no router | no productivo | NO CUMPLE: 19 huérfanos |

---

# PARTE K — REGISTRO MAESTRO

| ID | Referencias principales | Área | Estado | Severidad | Causa raíz | Dependencias |
|---|---|---|---|---|---|---|
| DB-001 | E40 5.5/5.8; Q80 6.2.6 | Migraciones | NO CUMPLE | Crítica | schema sin migración completa | integración |
| INT-001 | E40 5.4–5.6; Q80 6.2.7 | Manager/NV | NO CUMPLE | Alta | fixture como integración | DB/contrato |
| CAL-001 | E40 `_0860134`; E80 | Integridad | NO CUMPLE | Alta | trust boundary incorrecto | repo pedidos |
| AUTH-001 | E40 5.11; Q80 6.2.9/10 | RBAC | PARCIAL | Alta | deriva código↔tenant | Auth0 |
| TRACE-001 | E40 `_0860134/142`; Q80 `_0720130` | Trazabilidad | NO CUMPLE | Alta | cadena inexistente | tailoring |
| VER-001 | E40 `_0860088/89/137`; Q80 `_0720176/77` | Verificación | NO CUMPLE | Alta | gates incompletos | entornos |
| STD-001 | Q80 `_0720167`–`174`; E80 `_0600120` | Coding | NO CUMPLE | Alta | estándar incompleto | métricas |
| MET-001 | Q80 `_0720231`–`234` | Métricas | NO CUMPLE | Alta | sin programa | tailoring |
| SEC-001 | E40 5.11; Q80 6.2.9/10 | Assurance | PARCIAL | Alta | análisis no consolidado | entorno/riesgo |
| SEC-002 | E80 `_0600119`–`124` | Code review | NO CUMPLE | Alta | ciclo ausente | STD/VER |
| SEC-003 | E80 `_0600129`–`133` | Vulnerabilidades | NO CUMPLE | Alta | política/assessment ausente | SBOM |
| SEC-004 | E80 `_0600134`–`140` | Pentest | NO CUMPLE | Alta | no evidenciado | release |
| DATA-001 | E40 `_0860134`; Q80 6.3.4 | DB | PARCIAL | Alta | constraints insuficientes | DB-001 |
| ENV-001 | E40 5.6–5.9; E80 5.4 | Externo | NO DETERMINABLE | Alta | sin acceso | coordinación |
| TEST-DEL-001 | E40 `_0860142`; Q80 `_0720176/77` | Tests | NO CUMPLE si se borran sin reemplazo | Alta | confusión runtime/evidencia | suite externa |
| CODE-001 | E40 `_0860134`; Q80 `_0720123` | Código muerto | NO CUMPLE | Media | reemplazos no retirados | VER |
| CODE-002 | E40 `_0860134`; Q80 6.3.4 | Símbolos | NO CUMPLE | Media | sin gate | CODE-001 |
| DUP-001 | E40 `_0860134`; Q80 `_0720167` | Duplicación | NO CUMPLE | Media | infraestructura paralela | tests |
| MOCK-001 | E40 5.5/5.6; Q80 6.2.6 | Mocks runtime | NO CUMPLE | Media | test/demo en `src` | INT |
| ROB-001 | E40 `_0860089`, 5.8.3.5f | Robustez | NO CUMPLE | Media | validación inconsistente | STD/VER |
| CLIENT-001 | E40 `_0860134`; E80 | Timeouts | PARCIAL | Media | HTTP no centralizado | frontend |
| PERF-001 | E40 5.6/5.8; Q80 7.1 | Performance | NO CUMPLE | Media | sin presupuesto | MET |
| CI-001 | Q80 6.2.6/6.3 | CI | PARCIAL | Media | workflow no reproduce baseline | gates |
| DEP-001 | Q80 6.2.7/9; E80 5.4.4 | Dependencias | NO DETERMINABLE | Media | sin assessment actual | fuentes autorizadas |
| SBOM-001 | E80 supply chain; Q80 6.2.7 | Inventario | NO CUMPLE | Media | manifests insuficientes | DEP |
| REV-001 | Q80 `_0720126`–`128` | Reviews | NO DETERMINABLE | Media | evidencia ausente | proceso |
| TOOL-001 | Q80 5.6/6.2.8 | Herramientas | NO CUMPLE | Media | sin clasificación/calificación | tailoring |
| TAILOR-001 | E40/Q80/E80 | Tailoring | REQUIERE TAILORING | Alta | decisiones ausentes | cliente |
| ROOT-001 | Q80 CM | npm raíz | NO CUMPLE | Baja | artefacto huérfano | limpieza |

## K.1 Fichas de hallazgos principales

### DB-001 — Migraciones no reproducibles

- **Tipo/ámbito:** incumplimiento y defecto transversal de persistencia.
- **Archivos:** `schema.prisma`, `migrations/0_init`, `202609260001_orders_integrity`, `202609260002_security_hardening`, CI.
- **Evidencia:** `0_init` crea `Pedidos` sin columnas de snapshot/NV; `orders_integrity` crea índice sobre `Pedidos.numero_nota_venta` sin agregarla. CI crea el schema objetivo directamente.
- **Esperado/brecha:** DB vacía debe alcanzar el schema canónico sólo con migraciones.
- **Impacto/riesgo:** fallos de alta/Kanban, drift y despliegue no repetible.
- **Severidad/confianza:** Crítica/Alta.
- **Remediación/verificación:** DB-01, DB-02 y DB-03; vacío y copia histórica convergen sin drift/pérdida.

### INT-001 — Adapter Manager ausente

- **Tipo/ámbito:** integración Orders/Payments.
- **Archivos:** `salesNoteSource.service.js`, `order.service.js`, `paymentRecord.service.js`.
- **Evidencia:** `SalesNoteSourceService` aliasa/exporta `FixtureSalesNoteRepository` y usa `sales-notes-fixture.json`.
- **Esperado:** adapter read-only Manager con timeout, validación y error seguro.
- **Impacto:** alta/reevaluación no representan integración real.
- **Severidad/confianza:** Alta/Alta.
- **Remediación/verificación:** INT-01 e INT-02; no-demo opera sin fixture y se prueban fallos externos.

### CAL-001 — Calendar confía en el cliente

- **Tipo/ámbito:** seguridad/integridad del endpoint.
- **Archivos:** controlador `operational-load`; `operationalLoad.service.js`.
- **Evidencia:** se transmite `req.body.items` y el servicio calcula con esos datos.
- **Esperado:** body sólo filtros; datos comerciales desde backend.
- **Impacto:** alteración del cálculo por usuario autorizado.
- **Severidad/confianza:** Alta/Alta.
- **Remediación/verificación:** CAL-01; payload manipulado no altera resultados.

### AUTH-001 — Auth0 no acreditado

- **Tipo/ámbito:** seguridad/autorización externa.
- **Archivos:** `shared/authorization.js`, `scripts/rbac.mjs`, snapshot observado.
- **Evidencia:** faltan `manage:production-load`, `view:metrics`; roles y binding sin verificar.
- **Esperado:** tenant coincide exactamente con catálogo.
- **Impacto:** denegaciones o privilegios divergentes.
- **Severidad/confianza:** Alta/Alta sobre snapshot; tenant actual no determinable.
- **Cierre:** export fechado y `--check` sin diferencias.

### TRACE-001 — Trazabilidad técnica ausente

- **Tipo/ámbito:** incumplimiento transversal.
- **Evidencia:** no existe matriz control→componente/función→test→resultado.
- **Impacto:** no se demuestra completitud ni se justifica código no trazado.
- **Severidad/confianza:** Alta/Alta.
- **Cierre:** cero requisitos aplicables sin implementación/prueba o justificación aprobada.

### VER-001 — Verificación insuficiente

- **Evidencia:** suites correctas sin coverage; 2 MySQL skip; externos simulados; sin fault injection sistemático.
- **Esperado:** niveles, objetivos, resultados, coverage, regresión y fallos controlados.
- **Impacto:** requisitos no ejercitados pueden pasar CI.
- **Severidad/confianza:** Alta/Alta.
- **Cierre:** VER-01, VER-02, VER-03 y CI-01 completos.

### STD-001 / MET-001 — Coding y métricas incompletos

- **Evidencia:** ESLint sólo frontend; no hay límites backend ni métricas de tamaño, complejidad, defectos, coverage, fallos o precisión.
- **Esperado:** estándar explícito, tooling y feedback cuantitativo.
- **Impacto:** defectos/deuda no se detectan ni siguen objetivamente.
- **Severidad/confianza:** Alta/Alta.
- **Cierre:** gates con cero excepciones no justificadas y reportes versionados.

### SEC-002/003/004 — Assessment de seguridad incompleto

- **Evidencia:** sin review/análisis integral, rereview, waivers, correlación de inventario, assessments o pentest independiente acreditado.
- **Esperado:** ejecutar, corregir, reverificar, justificar residuales y actualizar riesgo.
- **Impacto:** vulnerabilidades pueden alcanzar release sin control.
- **Severidad/confianza:** Alta/Alta para ausencia en repo; ejecución externa no determinable.
- **Cierre:** reportes fechados, findings cerrados y residuales aceptados.

### TEST-DEL-001 — Borrado de tests sin reemplazo

- **Evidencia:** 59 backend y 15 frontend son sólo test y no entran al runtime; scripts/CI dependen de ellos.
- **Esperado:** si se retiran, suite externa controlada que ejecute contra el artefacto exacto.
- **Impacto:** borrado directo elimina regresión y evidencia.
- **Severidad/confianza:** Alta/Alta.
- **Cierre:** suite externa verde antes de borrar las carpetas.

## K.2 Fichas complementarias

### SEC-001 — Assurance y auditoría operativa incompletas

- **Estándar/tipo/ámbito:** E40 5.11, Q80 6.2.9/10 y E80 5.2–5.4; seguridad transversal.
- **Componente/archivos:** middlewares de autenticación/autorización, PIN, `securityAudit.repo.js`, tablas `SecurityAuditEvent`/`SecurityThrottle`, configuración.
- **Evidencia/estado:** controles locales fuertes, pero inmutabilidad, retención, alertas, permisos DB y operación no acreditados; `CUMPLE PARCIALMENTE`.
- **Esperado/brecha/impacto:** assurance extremo a extremo y pérdida/manipulación detectable; hoy un control local correcto no prueba el ambiente real, con riesgo de evidencia incompleta.
- **Severidad/confianza/causa:** Alta/Alta para repo; operación externa no determinable; causa: ausencia de verificación integrada.
- **Dependencias/remediación/cierre:** DB-03, AUTH-01, SEC-01/02; cerrar con pruebas de persistencia, privilegios, alertas, retención y assessment ligados al release.

### DATA-001 — Constraints de dominio insuficientes

- **Estándar/tipo/ámbito:** E40 `_0860134`, Q80 6.3.4; integridad de datos transversal.
- **Componente/archivos:** `schema.prisma`, migraciones y repositorios Orders/Payments/Capacity/Load.
- **Evidencia/estado:** múltiples columnas de dominio admiten NULL/defaults débiles; reglas dependen de servicios; `CUMPLE PARCIALMENTE`.
- **Esperado/brecha/impacto:** DB y aplicación deben rechazar estados imposibles; datos concurrentes o escritos fuera del servicio pueden violar invariantes.
- **Severidad/confianza/causa:** Alta/Alta; schema legado no reconciliado con reglas actuales.
- **Dependencias/remediación/cierre:** DB-01, DB-02, DB-03 y DATA-01; cerrar con preflight, constraints, concurrencia y rollback verificados.

### ENV-001 — Estado real de entornos no verificable

- **Estándar/tipo/ámbito:** E40 5.6–5.9 y E80 5.4; limitación transversal.
- **Componentes:** DB dev, Auth0, Manager, Resend, deployment, backups, monitoreo y secretos.
- **Evidencia/estado:** sólo configuración/repositorio y snapshots antiguos; `NO DETERMINABLE`.
- **Esperado/brecha/impacto:** evidencia read-only/ejecución autorizada del ambiente exacto; sin ella no se acredita integración, operación ni recuperación.
- **Severidad/confianza/causa:** Alta/Alta sobre ausencia de evidencia; coordinación externa pendiente.
- **Dependencias/remediación/cierre:** DB-03, AUTH-01, VER-03, SEC-02 y FINAL-01; cada subcontrol debe pasar a un estado concluyente.

### CODE-001 — Archivos productivos no alcanzables

- **Estándar/tipo/ámbito:** E40 `_0860134`, Q80 `_0720123`; calidad transversal frontend/backend.
- **Componentes:** 5 archivos backend y 36 frontend inventariados en M.1.
- **Evidencia/estado:** grafo desde entry points sin camino a esos archivos; `NO CUMPLE`.
- **Esperado/brecha/impacto:** eliminar o justificar/aislar; hoy aumentan superficie, mantenimiento y ambigüedad.
- **Severidad/confianza/causa:** Media/Alta; funcionalidades reemplazadas sin retiro.
- **Dependencias/remediación/cierre:** VER-01/02, CI-01, CLEAN-02; cerrar con grafo cero-huérfanos y regresión completa.

### CODE-002 — Funciones, exports y constantes sin consumidor

- **Estándar/tipo/ámbito:** E40 `_0860134`, Q80 6.3.4; code evaluation.
- **Componentes:** lista M.2 y símbolos test-only.
- **Evidencia/estado:** búsqueda de referencias productivas sin consumidores; `NO CUMPLE`, con confianza Media-Alta por imports dinámicos potenciales.
- **Esperado/brecha/impacto:** cero símbolo no usado salvo API justificada; actualmente dificulta revisión y puede ocultar caminos obsoletos.
- **Causa/severidad:** falta de gate automático; Media.
- **Dependencias/remediación/cierre:** STD-01, CLEAN-01/02 y TEST-EXT-01; análisis sin warnings no dispensados.

### DUP-001 — Infraestructura transversal duplicada

- **Estándar/tipo/ámbito:** E40 `_0860134`, Q80 `_0720167`; defecto sistémico.
- **Componentes:** dos `AppError`, error handlers, request contexts, permiso/capability y responders.
- **Evidencia/estado:** implementaciones simultáneas con contratos distintos; `NO CUMPLE`.
- **Esperado/brecha/impacto:** una política por responsabilidad; hoy consumidores pueden divergir en status, mensajes y logging.
- **Severidad/confianza/causa:** Media/Alta; implementaciones creadas en etapas distintas.
- **Dependencias/remediación/cierre:** VER-02, CI-01, CLEAN-01; una implementación y cero imports antiguos.

### MOCK-001 — Mocks, fakes y fixtures dentro de runtime

- **Estándar/tipo/ámbito:** E40 5.5/5.6 y Q80 6.2.6; separación producto/verificación.
- **Componentes:** fixture NV, Calendar mock, ProductionHistory mock, fake PIN y DemoOrders.
- **Evidencia/estado:** artefactos bajo `src`; fixture es default de negocio; `NO CUMPLE`.
- **Esperado/brecha/impacto:** dobles sólo en entorno/paquete de prueba; riesgo de datos no reales y mayor superficie.
- **Severidad/confianza/causa:** Media/Alta; integraciones reales incompletas.
- **Dependencias/remediación/cierre:** INT-02, CAL-01, TEST-EXT-01, CLEAN-03; inspección de artefacto sin estos componentes.

### ROB-001 — Robustez inconsistente

- **Estándar/tipo/ámbito:** E40 `_0860089` y 5.8.3.5 f; defecto transversal.
- **Componentes:** `operationalLoad.service.js`, validadores y adaptadores externos.
- **Evidencia/estado:** fecha imposible puede normalizarse, capacidad carece de validación estricta y entradas inválidas pueden omitirse; `NO CUMPLE`.
- **Esperado/brecha/impacto:** validación determinista y fallos controlados; riesgo de cálculos incorrectos/degradación silenciosa.
- **Severidad/confianza/causa:** Media/Alta; parsers y políticas distribuidos.
- **Dependencias/remediación/cierre:** CAL-01, STD-01, ROB-01, VER-02; matriz boundary/fault completa.

### CLIENT-001 — Requests frontend sin timeout general

- **Estándar/tipo/ámbito:** E40 `_0860134` y E80 fail secure; disponibilidad frontend.
- **Componente:** `capaVista/src/services/api/apiClient.js` y APIs por módulo.
- **Evidencia/estado:** no hay deadline/cancelación global uniforme; `CUMPLE PARCIALMENTE`.
- **Esperado/brecha/impacto:** requests acotadas, cancelables y con UX determinista; riesgo de espera indefinida/estado obsoleto.
- **Severidad/confianza/causa:** Media/Alta; política HTTP descentralizada.
- **Dependencias/remediación/cierre:** ROB-01 y VER-02; pruebas de timeout, cancelación y late response.

### PERF-001 — Performance y degradación no medidas

- **Estándar/tipo/ámbito:** E40 5.6/5.8 y Q80 7.1; verificación no funcional.
- **Componentes:** Orders, History, Metrics, Calendar y DB.
- **Evidencia/estado:** sin dataset representativo, presupuesto, carga o tendencia; `NO CUMPLE`.
- **Esperado/brecha/impacto:** targets y resultados por release; riesgo de degradación no detectada.
- **Severidad/confianza/causa:** Media/Alta; programa de métricas ausente.
- **Dependencias/remediación/cierre:** MET-01, DATA-01, VER-03; carga/estrés dentro de targets.

### CI-001 — Pipeline no representa el ciclo real

- **Estándar/tipo/ámbito:** Q80 6.2.6 y 6.3.4/5; configuration management.
- **Archivo:** `.github/workflows/security-ci.yml`.
- **Evidencia/estado:** no cubre push a `dev`; materializa schema en vez de reproducir migraciones; faltan lint backend/coverage/dead-code; `CUMPLE PARCIALMENTE`.
- **Esperado/brecha/impacto:** gate obligado que reproduzca instalación, migración, build y pruebas; defectos pueden llegar al merge.
- **Severidad/confianza/causa:** Media/Alta; workflow optimizado para schema final.
- **Dependencias/remediación/cierre:** DB-02, STD-01, VER-01, BUILD-01, CI-01; defectos sintéticos deben fallar.

### DEP-001 — Vulnerabilidades actuales no determinadas

- **Estándar/tipo/ámbito:** Q80 6.2.7/9 y E80 5.4.4; supply chain.
- **Componentes:** manifests y lockfiles frontend/backend/tooling.
- **Evidencia/estado:** versiones fijadas e integrity presentes; sin assessment local actual autorizado; `NO DETERMINABLE`.
- **Esperado/brecha/impacto:** inventario correlacionado con fuentes autorizadas y acciones; riesgo residual desconocido.
- **Severidad/confianza/causa:** Media/Alta; auditoría sin feeds externos por restricción.
- **Dependencias/remediación/cierre:** BUILD-01, SEC-02; assessment fechado y findings cerrados/waived.

### SBOM-001 — Inventario de componentes incompleto

- **Estándar/tipo/ámbito:** Q80 6.2.7 y E80 supply chain; reutilización.
- **Componentes:** dependencias directas/transitivas, runtime, herramientas y generado.
- **Evidencia/estado:** manifests/lockfiles no conforman un inventario controlado con origen/uso/licencia; `NO CUMPLE`.
- **Esperado/brecha/impacto:** SBOM exacto por artefacto; sin él no se correlacionan riesgos ni se demuestra composición.
- **Severidad/confianza/causa:** Media/Alta; no existe proceso de release para inventario.
- **Dependencias/remediación/cierre:** BUILD-01 y SEC-02; SBOM con hash igual al artefacto.

### REV-001 — Reviews/inspecciones no acreditadas

- **Estándar/tipo/ámbito:** Q80 `_0720126`–`_0720128`; product assurance.
- **Componentes:** proceso de PR/review y evidencia externa.
- **Evidencia/estado:** Git puede contener reviews remotos, pero no se aportó procedimiento/reporte/independencia; `NO DETERMINABLE`.
- **Esperado/brecha/impacto:** item, autor, revisor, criterios, hallazgos y cierre trazables; revisión informal no basta.
- **Severidad/confianza/causa:** Media/Alta sobre repo; plataforma remota no inspeccionada.
- **Dependencias/remediación/cierre:** GOV-01, TAILOR-01, TRACE-01, FINAL-01; evidencia por PR y auditoría de muestra.

### TOOL-001 — Herramientas y código generado sin tratamiento explícito

- **Estándar/tipo/ámbito:** Q80 5.6/6.2.8; herramientas de desarrollo.
- **Componentes:** Node/npm, Vite, ESLint, Prisma CLI/Client y generación.
- **Evidencia/estado:** herramientas versionadas parcialmente, sin clasificación de impacto/calificación ni verificación del generado; `NO CUMPLE`.
- **Esperado/brecha/impacto:** justificar selección, controlar versiones/inputs/outputs y validar uso; riesgo de salida incorrecta no detectada.
- **Severidad/confianza/causa:** Media/Alta; toolchain tratado como infraestructura implícita.
- **Dependencias/remediación/cierre:** TAILOR-01, STD-01, BUILD-01; manifest y pruebas del toolchain.

### TAILOR-001 — Decisiones críticas pendientes

- **Estándar/tipo/ámbito:** E40/Q80 criticality e E80 sensitivity/independencia; transversal.
- **Componentes:** coverage, verification, security, generated/configurable code, disponibilidad.
- **Evidencia/estado:** 21 IDs y controles asociados dependen de decisión no aportada; `REQUIERE TAILORING`.
- **Esperado/brecha/impacto:** decisiones aprobadas antes de fijar targets; sin ellas no existe criterio objetivo de cierre.
- **Severidad/confianza/causa:** Alta/Alta; contexto contractual fuera del repo.
- **Dependencias/remediación/cierre:** GOV-01, TAILOR-01; cero controles sin decisión/owner.

### ROOT-001 — Lockfile raíz huérfano

- **Estándar/tipo/ámbito:** Q80 configuration management; repositorio raíz.
- **Componente:** `package-lock.json` raíz vacío, sin `package.json` raíz.
- **Evidencia/estado:** artefacto no describe un proyecto instalable; `NO CUMPLE` de baja severidad.
- **Esperado/brecha/impacto:** cada artefacto de configuración debe tener propósito; puede confundir tooling y auditoría.
- **Severidad/confianza/causa:** Baja/Alta; residuo de estructura anterior.
- **Dependencias/remediación/cierre:** BUILD-01 y CLEAN-02; confirmar cero consumidor y eliminar en commit aislado.

---

# PARTE L — CAUSAS RAÍZ

1. Integraciones simuladas mantenidas como defaults.
2. Schema evolucionado sin historia completa.
3. CI valida estado final, no ruta real.
4. Coding standard no ejecutable para todo el stack.
5. Falta de trazabilidad y targets.
6. Reemplazos sin retirar implementaciones antiguas.
7. Infraestructura transversal duplicada.
8. Confusión entre excluir tests del runtime y eliminarlos.
9. Controles locales confundidos con evidencia operacional.
10. Tailoring pendiente.

---

# PARTE M — HALLAZGOS TRANSVERSALES

## M.1 Archivos no alcanzables: 41

Backend (5):

1. `capaServidor/src/middlewares/requestContext.js`
2. `capaServidor/src/middlewares/requirePermission.js`
3. `capaServidor/src/modules/orders/service/createOrderInput.js`
4. `capaServidor/src/modules/payments/controller/paymentError.js`
5. `capaServidor/src/shared/httpResponse.js`

Frontend (36): 19 bajo `modules/productionHistory`; además `config/productTypes.js`, `config/requirementsMap.js`, dos hooks vacíos, tres archivos auth no alcanzables, CSS huérfano de Kanban, `CalendarSummaryCards` y CSS, `StatusBadge`, `SelectInput` y CSS, `TextInput`, y tres utilidades/validators.

Debe recalcularse el grafo justo antes de borrar.

## M.2 Símbolos sin uso productivo

`isNonProductionEnvironment`, `parseBooleanEnvironment`, `PAYMENT_STATUS_VALUES`, `ORDER_STATUS_VALUES`, `stripLanyardProgressObservation`, `normalizeText` de Orders, `UnavailableExternalSalesNoteRepository`, `PRODUCTION_CALENDAR_ITEMS` y el `errorHandler` duplicado.

Sólo usados por pruebas: `MOVE_KANBAN_TO_PRODUCTION_PERMISSION`, `disconnectPrismaClient`, responders de Order/Payment, `FakePinDeliveryProvider` y `requirePermission`. Su retiro depende del traslado de tests.

## M.3 Duplicación/vacíos

- Dos `AppError` activos con contratos distintos.
- Dos error handlers y dos request contexts.
- `requireCapability` activo frente a `requirePermission` obsoleto.
- Responders duplicados/test-only.
- Vacíos: `useFormValidation.js`, `useRoleAccess.js`, `validator.js`, `bootstrap-overrides.css`.

## M.4 Mocks/fakes/fixtures en runtime

| Artefacto | Situación |
|---|---|
| `productionCalendar.mock.js` | constante activa + datos muertos |
| `productionHistory.mock.js` | prototipo inalcanzable |
| `fakePinDelivery.js` | import estático desde servicio productivo |
| `sales-notes-fixture.json` | fuente predeterminada de Orders/Payments |
| `demoOrders` | bloqueado en producción pero dentro de `src` |

---

# PARTE N — SEGURIDAD

## N.1 Evidencia favorable

- JWT antes de rutas protegidas y fallo cerrado.
- Identidad interna/rol vigente antes de autorizar.
- Capabilities por endpoint.
- PIN con hash, lockout, recuperación y concurrencia.
- Errores sanitizados y logs correlacionables.
- Demo deshabilitado en producción.
- Escrituras auxiliares bloqueadas.

## N.2 Brechas

- Auth0 real no acreditado.
- Sin clasificación de sensibilidad/análisis de riesgo técnico trazable.
- Auditoría sin inmutabilidad, alertas y retención verificadas.
- Sin SBOM/vulnerability management completo.
- Sin security source review, DAST/fuzzing y pentest acreditados.
- DB/TLS/secretos/deployment no determinables.
- Código muerto/demo aumentan superficie.

---

# PARTE O — TESTING Y VERIFICACIÓN

- 59 archivos backend y 15 frontend; total 74.
- Ningún `src` importa desde `test`; no implementan runtime.
- Borrarlos directamente no es conforme porque se pierde regresión/evidencia.
- Si deben salir del repositorio, primero se trasladan a un repositorio/paquete de verificación controlado y CI demuestra ejecución contra el artefacto exacto.

Faltan: coverage statement/branch/function; requisito→test; MySQL; Manager/Auth0/Resend reales; boundary global; timeouts/fallos externos; fault injection/rollback; carga/estrés; DAST/fuzzing/pentest.

---

# PARTE P — CONFIGURACIÓN Y DEPENDENCIAS

- Manifests/lockfiles presentes; no se hallaron secretos actuales versionados.
- Sin SBOM y sin evaluación completa de reutilizados.
- Vulnerabilidades actuales `NO DETERMINABLE`.
- Lockfile raíz vacío y huérfano.
- CI no cubre push a `dev` ni reproduce migraciones.
- Backend sin lint; sin gates de coverage, complejidad, muertos, duplicación o mocks.
- Build local/artefacto desplegado no inspeccionados.

---

# PARTE Q — NO DETERMINABLE

1. DB física `dev`, datos e historial de migraciones.
2. Error exacto de Kanban/alta en `dev`.
3. Tenant Auth0 y binding reales.
4. Resend y Manager reales.
5. TLS/privilegios DB.
6. Deployment, artefacto y rollback.
7. Backup/restore y monitoreo/alertas.
8. Vulnerabilidades actuales.
9. Auditorías internas ejecutadas.
10. Performance/capacidad representativa.
11. Independencia de verification/pentest.

---

# PARTE R — NO APLICA / TAILORING

## R.1 NO APLICA

- FPGA/dispositivos programables.
- Software embarcado, telemetría, telecommand y OBCP, salvo contexto contractual contrario.
- Producto destinado a reutilización externa.
- Annexes informativos como requisitos autónomos.

## R.2 REQUIERE TAILORING

| Decisión | Efecto |
|---|---|
| Criticality A/B/C/D | coverage y rigor |
| Dependability/safety | medidas/regresión |
| Security sensitivity | profundidad de assurance |
| Independencia de verification | tercero/equipo |
| Independencia/alcance de pentest | ejecutor/escenarios |
| Código generado Prisma | inputs/outputs/versionado/verificación |
| Código configurable | combinaciones válidas |
| Disponibilidad/redundancia | recuperación/backup/failover |

---

# PARTE S — MATRIZ MAESTRA DE CONFORMIDAD

| Estado | IDs |
|---|---:|
| CUMPLE | 627 |
| CUMPLE PARCIALMENTE | 338 |
| NO CUMPLE | 78 |
| NO DETERMINABLE | 56 |
| NO APLICA | 10 |
| REQUIERE TAILORING | 21 |
| **Total** | **1.130** |

Los 627 `CUMPLE` corresponden a controles documentales/organizativos cubiertos por la premisa del solicitante; no son revalidación independiente. La conformidad técnica exige cerrar los 493 controles abiertos y confirmar las diez justificaciones `NO APLICA`.

La matriz fila a fila está en `CHECKLIST_ECSS_REQUISITOS_2026-09-30.md`:

```text
ECSS → cláusula → requirement ID → síntesis → evidencia/brecha → estado → hallazgo
```

## S.1 Criterio de cierre

1. Cada aplicable en `CUMPLE` con evidencia ligada a commit/release.
2. Tailoring aprobado y aplicado.
3. Cada `NO DETERMINABLE` resuelto mediante evidencia suficiente o reclasificado por una decisión de aplicabilidad/tailoring aprobada.
4. DB vacía e histórica convergen por migraciones.
5. Kanban/alta/Payments funcionan con DB y Manager reales.
6. Auth0 real coincide con el catálogo.
7. Coverage, coding, análisis, robustez y métricas cumplen targets.
8. Cero código muerto/duplicado/mock productivo no justificado.
9. Suite ejecutable aunque se traslade fuera del repo.
10. Security review, vulnerability assessment y pentest cerrados.
11. Reauditoría confirma `requisito → implementación → prueba → evidencia → cumple`.
