# GOV-01 — línea base técnica

- **ID de baseline:** `GOV-01-2026-09-30-488fc51-darwin-x64-node24`.
- **Captura:** 2026-09-30, 14:24 UTC.

**Estado:** evidencia local capturada; pendiente reproducción y aprobación independiente de la puerta de salida de fase 0.

## Alcance y procedencia

| Campo | Valor |
|---|---|
| Commit candidato probado | `488fc51c1bebaacac37cb29a675be533aaf0fe49` |
| Rama del candidato | `esa_fix` (`origin/esa_fix` al iniciar) |
| Estado del árbol al iniciar | limpio |
| Commit auditado anteriormente | `17974b7612756c5eaa3350289dde40ff987637e8` (`dev`) |
| Diferencia entre ambos | en `esa_fix` se incorporaron los entregables de auditoría, checklist y plan; el candidato probado es el commit actual, no el antiguo `dev` |
| Sistema | macOS 13.7.8, Darwin 22.6.0, x64 |
| Node.js / npm / Prisma CLI | 24.20.0 / 11.19.0 / 7.10.0 |
| Git | 2.39.2 (Apple Git-143) |
| Entorno de ejecución | worktree desacoplado en `/tmp`, extraído del commit candidato; sin archivos `.env` locales |
| Requisitos vinculados por el plan | ECSS-E-ST-40C Rev.1, 5.8; ECSS-Q-ST-80C Rev.2, 6.2.6 y 6.3.5 |
| Hallazgos vinculados | VER-001, TRACE-001, ENV-001; la divergencia RBAC corresponde a AUTH-001 |

La rama `esa_fix` ya existía como rama dedicada del candidato; no se creó otra rama para este expediente. El repositorio de trabajo no contenía modificaciones funcionales al iniciar GOV-01. La copia aislada se usó para evitar que dependencias generadas o secretos locales alteraran el resultado.

## Inventario de configuración y artefactos

`SHA256SUMS` fija los cuatro lockfiles, `schema.prisma`, las once migraciones SQL, los dos archivos de ejemplo de entorno y los siete logs archivados. Se verifica desde la raíz del repositorio con:

```sh
shasum -a 256 -c docs/evidence/GOV-01/SHA256SUMS
```

Los nombres de configuración requeridos por el arranque backend son `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `FRONTEND_ORIGIN`, `PIN_SECRET`, `APP_ENV`, `RATE_LIMIT_SECRET` y `SECURITY_LOG_HMAC_KEY`. La conexión real exige además `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` y, con TLS, `DB_SSL_CA_PATH`. Las pruebas locales fijan `APP_ENV=test`, `NODE_ENV=test` y `ENABLE_DEMO_ROUTES=true` mediante `test/setup.mjs`; la integración se desactivó expresamente con `RUN_MYSQL_INTEGRATION=false`. Prisma CLI usa `DATABASE_URL` cuando se accede a una fuente de datos. El frontend usa `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`, `VITE_API_BASE_URL` y `VITE_ENABLE_DEMO_ROUTES`. El resto de opciones y sus nombres están fijados en los `env.example` hasheados. No se copiaron valores de `.env`, contraseñas, tokens ni certificados.

## Reproducción desde una copia limpia

Ejecutar en un directorio nuevo, con Node.js 24.20.0 y npm 11.19.0. Los comandos no acceden a DB ni servicios externos; `rbac --check` compara un snapshot versionado.

```sh
git worktree add --detach /tmp/itecsa-gov01-replay 488fc51c1bebaacac37cb29a675be533aaf0fe49
cd /tmp/itecsa-gov01-replay
npm ci --prefix tooling/prisma --no-audit --no-fund
npm ci --prefix capaServidor --no-audit --no-fund
npm ci --prefix capaVista --no-audit --no-fund
npm run prisma:validate --prefix capaServidor
npm run prisma:generate --prefix capaServidor
RUN_MYSQL_INTEGRATION=false npm test --prefix capaServidor
npm test --prefix capaVista
npm run lint --prefix capaVista
scripts/verify-data-artifacts.sh
node scripts/rbac.mjs --check docs/auth0/rbac.observed.json
```

Se debe registrar el código de salida de cada comando. `rbac --check` devuelve 1 por el hallazgo conocido y no se debe reinterpretar como resultado satisfactorio. Las duraciones, rutas temporales y hashes de logs regenerados pueden cambiar; se comparan las cantidades y causas. La ejecución archivada se hizo en esta misma secuencia lógica, salvo que la primera prueba backend precedió a `prisma:generate`; esa desviación y su resolución figuran abajo.

## Resultados observados

| Comando / control | Salida | Evidencia |
|---|---|---|
| `npm ci` en los tres paquetes | 0 en los tres; npm 11 avisó sobre scripts de instalación no aprobados, sin impedir la generación explícita | registro de ejecución de esta captura |
| Backend antes de `prisma:generate` | 1; 314 tests, 291 pass, 21 fail, 2 skip; falta export `Prisma` del cliente no generado | [backend-test-initial.log](logs/backend-test-initial.log) |
| `npm run prisma:generate --prefix capaServidor` | 0; Prisma Client 7.10.0 generado | [prisma-generate.log](logs/prisma-generate.log) |
| `RUN_MYSQL_INTEGRATION=false npm test --prefix capaServidor` después de generar | 0; 791 tests, 789 pass, 0 fail, 2 skip | [backend-test.log](logs/backend-test.log) |
| `npm test --prefix capaVista` | 0; verificaciones funcionales y 17/17 tests Node | [frontend-test.log](logs/frontend-test.log) |
| `npm run lint --prefix capaVista` | 0 | [frontend-lint.log](logs/frontend-lint.log) |
| `npm run prisma:validate --prefix capaServidor` | 0; schema válido | [prisma-validate.log](logs/prisma-validate.log) |
| `scripts/verify-data-artifacts.sh` | 0; sin salida | control ejecutado en la copia aislada |
| `node scripts/rbac.mjs --check docs/auth0/rbac.observed.json` | 1; faltan 2 permisos, 8 roles sin verificar y binding Post Login sin verificar | [rbac-check.log](logs/rbac-check.log) |

Las dos pruebas omitidas son la serialización de cuotas persistentes MySQL y el rollback conjunto del evento de seguridad. Permanecen abiertas para la fase de persistencia/verificación. El chequeo RBAC demuestra divergencia del snapshot versionado, no el estado actual del tenant Auth0. No se ejecutaron migraciones ni hubo escritura a MySQL, Auth0, Manager o Resend.

## Control de salida de fase

- [x] Candidato, rama, entorno, versiones y hashes registrados.
- [x] Resultados, códigos de salida, skips y diferencias archivados.
- [x] Logs revisados por patrones de secretos antes de incorporarlos; la copia aislada carecía de `.env` locales.
- [x] Comandos de reproducción fijados sobre un commit exacto.
- [ ] Una persona distinta reproduce y deja fecha, plataforma, resultados y referencia de su evidencia.
- [ ] Responsable del proyecto revisa esa reproducción y aprueba el cierre de GOV-01.

Hasta completar los dos últimos puntos, la fase 0 permanece abierta en el plan. Este expediente no cambia el estado de los 1.130 requisitos del checklist; sirve como punto de comparación para las fases posteriores. El control de integridad del contenido archivado lo proporciona el commit Git que incorpora este directorio; cualquier resultado posterior debe crear una nueva revisión identificable, sin reemplazar silenciosamente esta captura.
