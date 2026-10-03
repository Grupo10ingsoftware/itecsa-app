# Pruebas y validación

Los comandos proceden de los manifiestos y scripts versionados. Los recuentos de tests de los informes archivados corresponden a sus commits; no son una garantía para esta revisión.

## Comprobaciones locales

Desde la raíz:

```bash
npm test --prefix capaServidor
npm test --prefix capaVista
npm run lint --prefix capaVista
npm run build --prefix capaVista
```

Instalar dependencias y generar Prisma según la [guía de desarrollo](README.md) antes de las suites de aplicación. Backend usa `node --test`; frontend combina verificaciones SSR con tests Node. El lint global puede revelar problemas ajenos a documentación: registrarlos sin presentar un lint dirigido como aprobación global.

Desde `capaVista`, `npm run test:payments:browser` comprueba el ciclo del PIN y el diálogo con datos ficticios mediante Vite y un navegador headless. El script busca Edge en rutas Windows o usa `ITECSA_BROWSER_BIN` si apunta a un ejecutable compatible. Se requiere ese navegador; no equivale a QA en una sesión Auth0 desplegada.

`npm run test:profile:browser --prefix capaVista` usa el layout y los componentes de perfil/movimientos reales con respuestas sintéticas en un navegador aislado. Comprueba carga/error/reintento del perfil, datos personales verificados visibles antes de completar la actividad, una sola consulta de perfil bajo StrictMode, ausencia de precarga del historial, búsqueda/paginación fija de diez registros sin selector, rol centrado, consultas propias, reapertura y respuestas tardías, foco al cerrar, historial vacío, PIN de recuperación/aceptación y reutilización administrativa en seis anchos (320–1440). No consulta usuarios reales ni envía correos. La suite backend incluye autorización y pertenencia para `GET /auth/profile/movements`.

Los comandos `test:forms:performance` y `test:forms:performance:baseline` también comparan Mi perfil con y sin precarga de código, incluyendo una API artificialmente lenta. El procedimiento y las medidas están en [Carga de formularios y perfil](CARGA_FORMULARIOS_P18_P19.md). Son mediciones controladas con sesión sintética, sin latencia real de Auth0/MySQL.

`npm run test:layout:browser --prefix capaVista` reutiliza el layout real con sesión/API sintéticas. Comprueba en seis anchos (320–1440) el orden de las acciones, perfil y bandeja sin duplicación lateral, indicador/apertura/limpieza de notificaciones, permisos, ausencia de consultas extra de identidad, textos largos, botones táctiles, foco y teclas Enter/Space/Tab, colapso/drawer/overlay y confirmación de cierre de sesión. La suite SSR verifica los accesos del header con todos los roles y permisos parciales. No consulta identidades reales ni realiza acciones sobre una cuenta desplegada.

Desde `capaServidor`, `npm run prisma:validate` valida el schema. `npm run orders:preflight` y `node scripts/paymentsReadBaseline.mjs` son inspecciones que requieren una conexión autorizada y no escriben datos. Sus resultados reflejan ese entorno y momento, no una prueba de migración o carga representativa.

## Documentación

Al mover o actualizar guías, revisar los enlaces locales y la navegación desde el índice principal y el archivo histórico. Los informes preservan referencias de su revisión original; sus avisos iniciales deben enlazar las guías actuales.

## Límites de evidencia

Los tests con dobles verifican contratos y reglas, pero no acreditan locks, rollback físico MySQL, configuración del tenant o accesibilidad en la pantalla desplegada. La [validación aislada de Payments](../operacion/PAYMENTS_SOLICITUD_BD.md), la [migración de Orders](../operacion/ORDERS_MIGRACION.md) y los [pendientes](../PENDIENTES.md) detallan esas condiciones de cierre. No ejecutar pruebas de escritura contra la base compartida.
