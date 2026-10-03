# Validación de la entrega

El 03-10-2026 se retiraron las carpetas `test` de frontend y backend por decisión de entrega, junto con fixtures, ejecutores de navegador y comandos asociados. La aplicación no dependía de esos archivos para funcionar. Los manifiestos ya no incluyen scripts de tests y CI ya no ejecuta las suites de regresión.

## Comprobaciones disponibles

Instalar dependencias según la [guía de desarrollo](README.md). Desde la raíz:

```bash
npm run lint --prefix capaVista
npm run build --prefix capaVista
npm run prisma:validate --prefix capaServidor
```

Lint revisa el código frontend, build comprueba su compilación y Prisma valida el schema. Ninguno verifica por sí solo el comportamiento funcional completo, la autorización efectiva, los envíos de correo ni la concurrencia de operaciones.

CI conserva estas comprobaciones, la generación del cliente Prisma, la materialización y comparación del schema completo en MySQL desechable, las auditorías de dependencias, el control de artefactos protegidos y el escaneo de secretos. No ejecuta pruebas de operaciones concurrentes ni suites funcionales.

`npm run orders:preflight --prefix capaServidor` y `node capaServidor/scripts/paymentsReadBaseline.mjs` son inspecciones que requieren una conexión autorizada y no escriben datos. Sus resultados reflejan ese entorno y momento; no son una prueba de migración o carga representativa.

## Evidencia histórica y validación funcional

Los resultados de tests conservados en los informes corresponden a revisiones anteriores a la retirada. No indican que esas suites sigan disponibles en este checkout ni garantizan regresión después de cambios futuros. Las [medidas de carga](CARGA_FORMULARIOS_P18_P19.md) conservan muestras de laboratorio; también se retiraron sus ejecutores.

Antes de desplegar, comprobar los flujos en un entorno autorizado con cuentas y datos de prueba. La [validación aislada de Payments](../operacion/PAYMENTS_SOLICITUD_BD.md), la [migración de Orders](../operacion/ORDERS_MIGRACION.md) y los [pendientes](../PENDIENTES.md) detallan las condiciones de cierre. No ejecutar comprobaciones de escritura contra la base compartida.

## Documentación

Al mover o actualizar guías, revisar los enlaces locales y la navegación desde el índice principal y el archivo histórico. Las referencias a archivos de tests en enlaces históricos apuntan a su revisión en Git. Las instrucciones operativas vigentes deben reflejar los comandos disponibles.
