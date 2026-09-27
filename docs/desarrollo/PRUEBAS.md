# Pruebas y validación

Los comandos proceden de los manifiestos y scripts versionados. Los recuentos de tests de los informes archivados corresponden a sus commits; no son una garantía para esta revisión.

## Comprobaciones locales

Desde la raíz:

```bash
node scripts/check-docs.mjs
node --test scripts/*.test.mjs
npm test --prefix capaServidor
npm test --prefix capaVista
npm run lint --prefix capaVista
npm run build --prefix capaVista
```

Instalar dependencias y generar Prisma según la [guía de desarrollo](README.md) antes de las suites de aplicación. Backend usa `node --test`; frontend combina verificaciones SSR con tests Node. El lint global puede revelar problemas ajenos a documentación: registrarlos sin presentar un lint dirigido como aprobación global.

Desde `capaVista`, `npm run test:payments:browser` comprueba el ciclo del PIN y el diálogo con datos ficticios mediante Vite y un navegador headless. El script busca Edge en rutas Windows o usa `ITECSA_BROWSER_BIN` si apunta a un ejecutable compatible. Se requiere ese navegador; no equivale a QA en una sesión Auth0 desplegada.

Desde `capaServidor`, `npm run prisma:validate` valida el schema. `npm run orders:preflight` y `node scripts/paymentsReadBaseline.mjs` son inspecciones que requieren una conexión autorizada y no escriben datos. Sus resultados reflejan ese entorno y momento, no una prueba de migración o carga representativa.

## Documentación

[check-docs.mjs](../../scripts/check-docs.mjs) revisa los enlaces e imágenes Markdown locales, tanto inline como por referencia, y comprueba que exista el archivo o directorio destino. Las rutas se resuelven respecto del documento; `/` representa la raíz del repositorio. Informa archivo, línea y destino roto, y sale con código 1.

No accede a la red ni valida encabezados, enlaces HTML o rutas escritas solo como texto/código. Omite URLs externas, fragmentos de encabezados y bloques de código. Los informes en `docs/archivo/auditorias/` y `docs/archivo/implementaciones/` conservan referencias históricas; sus README e índices sí se validan. Los avisos iniciales de los informes también se comprueban para conservar la navegación vigente.

## CI y límites de evidencia

El [workflow](../../.github/workflows/docker.yml) ejecuta el control documental y las pruebas de scripts, backend y frontend en PR a `dev`/`main` y antes de publicar nuevas imágenes. También construye y verifica las imágenes. El rollback recupera una pareja publicada y conserva su flujo sin reconstruir ni instalar dependencias de la aplicación.

Los tests con dobles verifican contratos y reglas, pero no acreditan locks, rollback físico MySQL, configuración del tenant o accesibilidad en la pantalla desplegada. La [validación aislada de Payments](../operacion/PAYMENTS_SOLICITUD_BD.md), la [migración de Orders](../operacion/ORDERS_MIGRACION.md) y los [pendientes](../PENDIENTES.md) detallan esas condiciones de cierre. No ejecutar pruebas de escritura contra la base compartida.
