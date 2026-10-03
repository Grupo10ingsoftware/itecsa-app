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

La puerta versionada en [`.github/workflows/security-ci.yml`](../../.github/workflows/security-ci.yml) ejecuta estas comprobaciones en pull requests y pushes a `main` o `dev` con Node.js 22. También valida Prisma contra MySQL desechable, ejecuta auditorías de dependencias y escanea secretos. Para impedir efectivamente un merge cuando falle, el repositorio debe marcar sus jobs como checks requeridos en la protección de la rama.

`npm audit` informa actualmente vulnerabilidades altas transitivas que requieren una revisión de dependencias separada; algunas propuestas automáticas implican cambios mayores de Prisma y no deben aplicarse con `--force` dentro de una corrección de interfaz. La CI bloquea severidad crítica sin ocultar la necesidad de planificar esa actualización.

Instalar dependencias y generar Prisma según la [guía de desarrollo](README.md) antes de las suites de aplicación. Backend usa `node --test`; frontend combina verificaciones SSR con tests Node. El lint global puede revelar problemas ajenos a documentación: registrarlos sin presentar un lint dirigido como aprobación global.

Desde `capaVista`, `npm run test:payments:browser` comprueba el ciclo del PIN y el diálogo con datos ficticios mediante Vite y un navegador headless. El script busca Edge en rutas Windows o usa `ITECSA_BROWSER_BIN` si apunta a un ejecutable compatible. Se requiere ese navegador; no equivale a QA en una sesión Auth0 desplegada.

Desde `capaServidor`, `npm run prisma:validate` valida el schema. `npm run orders:preflight` y `node scripts/paymentsReadBaseline.mjs` son inspecciones que requieren una conexión autorizada y no escriben datos. Sus resultados reflejan ese entorno y momento, no una prueba de migración o carga representativa.

## Documentación

Al mover o actualizar guías, revisar los enlaces locales y la navegación desde el índice principal y el archivo histórico. Los informes preservan referencias de su revisión original; sus avisos iniciales deben enlazar las guías actuales.

## Límites de evidencia

Los tests con dobles verifican contratos y reglas, pero no acreditan locks, rollback físico MySQL, configuración del tenant o accesibilidad en la pantalla desplegada. La [validación aislada de Payments](../operacion/PAYMENTS_SOLICITUD_BD.md), la [migración de Orders](../operacion/ORDERS_MIGRACION.md) y los [pendientes](../PENDIENTES.md) detallan esas condiciones de cierre. No ejecutar pruebas de escritura contra la base compartida.
