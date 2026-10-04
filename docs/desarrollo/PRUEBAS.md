# Pruebas y validación

Los comandos proceden de los manifiestos y scripts versionados. Los recuentos de tests de informes archivados corresponden a sus commits; no garantizan el resultado de una revisión posterior.

## Comprobaciones locales

Instalar dependencias y generar Prisma según la [guía de desarrollo](README.md). Desde la raíz:

```bash
npm test --prefix capaServidor
npm test --prefix capaVista
npm run lint --prefix capaVista
npm run build --prefix capaVista
npm run prisma:validate --prefix capaServidor
```

La puerta versionada en [`.github/workflows/security-ci.yml`](../../.github/workflows/security-ci.yml) ejecuta estas comprobaciones en pull requests y pushes a `main` o `dev` con Node.js 22. También valida Prisma contra MySQL desechable, ejecuta auditorías de dependencias y escanea secretos. Para impedir efectivamente un merge cuando falle, el repositorio debe marcar sus jobs como checks requeridos en la protección de la rama.

`npm audit` informa actualmente vulnerabilidades altas transitivas que requieren una revisión de dependencias separada; algunas propuestas automáticas implican cambios mayores de Prisma y no deben aplicarse con `--force` dentro de una corrección de interfaz. La CI bloquea severidad crítica sin ocultar la necesidad de planificar esa actualización.

Backend usa `node --test`; frontend combina verificaciones SSR con tests Node. Lint revisa el código frontend, build comprueba su compilación y Prisma valida el schema. Ninguna comprobación aislada acredita por sí sola el comportamiento desplegado, la configuración de Auth0 o los envíos reales de correo.

Se conservan los 86 archivos de prueba preexistentes y se añadió la cobertura del detalle de Kanban con y sin etiquetas. Las suites actuales también cubren la fuente fixture opt-in, la consulta paginada de pedidos sin fecha y la promoción de usuarios en el primer acceso. Las pruebas con dobles verifican contratos y lógica; las escrituras de pedidos, pagos o usuarios sobre MySQL se ejecutan únicamente en una base desechable y aislada.

Desde `capaVista`, `npm run test:payments:browser` y `npm run test:metrics:browser` ejecutan comprobaciones de navegador. Requieren un navegador compatible disponible en el entorno; no equivalen a QA en una sesión Auth0 desplegada.

`npm run orders:preflight --prefix capaServidor` y `node capaServidor/scripts/paymentsReadBaseline.mjs` son inspecciones que requieren una conexión autorizada y no escriben datos. Sus resultados reflejan ese entorno y momento; no son una prueba de migración o carga representativa.

## Validación funcional y evidencia

Las [medidas de carga de P18/P19](CARGA_FORMULARIOS_P18_P19.md) son muestras de laboratorio y no demuestran capacidad del despliegue productivo. Antes de desplegar, comprobar los flujos en un entorno autorizado con cuentas y datos de prueba.

La [validación aislada de Payments](../operacion/PAYMENTS_SOLICITUD_BD.md), la [migración de Orders](../operacion/ORDERS_MIGRACION.md) y los [pendientes](../PENDIENTES.md) detallan condiciones adicionales de cierre. No ejecutar comprobaciones de escritura contra la base compartida.

## Documentación

Al mover o actualizar guías, revisar los enlaces locales y la navegación desde el índice principal y el archivo histórico. Las instrucciones operativas vigentes deben reflejar los comandos disponibles.
