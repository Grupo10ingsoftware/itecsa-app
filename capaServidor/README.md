# Backend ITECSA

API Express 5 con validación JWT Auth0 y persistencia MySQL/Aiven mediante Prisma 7 y el adaptador MariaDB.

## Desarrollo

Después de completar la [configuración local](../docs/desarrollo/README.md), desde esta carpeta:

```bash
npm ci --prefix ../tooling/prisma
npm ci
npm run prisma:generate
npm run dev
```

La API usa `http://localhost:3000/api`. `npm start` inicia sin nodemon. Las comprobaciones disponibles se describen en la [guía de validación](../docs/desarrollo/PRUEBAS.md). El arranque y la generación del cliente no aplican migraciones.

## Referencias

- [Índice técnico](../docs/README.md) y [arquitectura](../docs/arquitectura/ARQUITECTURA.md).
- [Endpoints, cuerpos y permisos](../docs/desarrollo/API.md).
- [Pruebas y comprobaciones](../docs/desarrollo/PRUEBAS.md).
- [Auth0 y gestión de usuarios](../docs/auth0/README.md).
- [Migración de Orders](../docs/operacion/ORDERS_MIGRACION.md), [validación aislada de Payments](../docs/operacion/PAYMENTS_SOLICITUD_BD.md) y [pendientes](../docs/PENDIENTES.md).

Antes de ejecutar introspección o migraciones, revisar sus efectos y el entorno autorizado. `prisma:pull` modifica el schema local; no es un paso rutinario para arrancar el código versionado. Los secretos y el certificado CA permanecen fuera de Git.

La CLI Prisma se instala por separado en `tooling/prisma`. Consultar las [dependencias](../docs/security/DEPENDENCIAS.md) y la [configuración de seguridad](../docs/security/README.md).

## Configuración y controles

La plantilla [env.example](env.example) contiene las variables del servidor. La
[guía de desarrollo](../docs/desarrollo/README.md) explica su uso; no copiar secretos
ni mantener otra lista de variables en este README. `APP_ENV` y `NODE_ENV` deben
coincidir; `PIN_SECRET` se conserva al trabajar con la misma base.

Las rutas funcionales usan JWT, identidad local activa y permisos efectivos del
catálogo compartido. El PIN se exige en las operaciones que lo requieren. Los
errores se gestionan mediante [la política HTTP](../docs/security/H08-http-errors.md).

`GET /api/health/live` comprueba el proceso sin consultar la base. `/internal/ready`
es opcional, requiere `X-Health-Token` y debe exponerse solo en red interna.

Las rutas demo y la fuente fixture necesitan `ENABLE_DEMO_ROUTES=true` y quedan
prohibidas en producción. Manager todavía no está integrado. La recuperación de
PIN usa un proveedor explícito; sin configuración queda indisponible. Consultar
[entrega de PIN](../docs/security/H07-pin-recovery-delivery.md).

[Documentos y solicitudes P18](../docs/modulos/PRIVACY.md) y
[reportes P19](../docs/modulos/INCIDENT_REPORTS.md) son canales técnicos de remisión;
la empresa gestiona atención y decisiones. Su configuración, migraciones y recepción
real siguen sujetas a validación del entorno.
