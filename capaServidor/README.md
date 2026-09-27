# Backend ITECSA

API Express 5 con validación JWT Auth0 y persistencia MySQL/Aiven mediante Prisma 7 y el adaptador MariaDB.

## Desarrollo

Después de completar la [configuración local](../docs/desarrollo/README.md), desde esta carpeta:

```bash
npm ci
npm run prisma:generate
npm run dev
```

La API usa `http://localhost:3000/api`. `npm start` inicia sin nodemon y `npm test` ejecuta las pruebas. El arranque y la generación del cliente no aplican migraciones.

## Referencias

- [Índice técnico](../docs/README.md) y [arquitectura](../docs/arquitectura/ARQUITECTURA.md).
- [Endpoints, cuerpos y permisos](../docs/desarrollo/API.md).
- [Pruebas y comprobaciones](../docs/desarrollo/PRUEBAS.md).
- [Auth0 y gestión de usuarios](../docs/auth0/README.md).
- [Migración de Orders](../docs/operacion/ORDERS_MIGRACION.md), [validación aislada de Payments](../docs/operacion/PAYMENTS_SOLICITUD_BD.md) y [pendientes](../docs/PENDIENTES.md).

Antes de ejecutar introspección o migraciones, revisar sus efectos y el entorno autorizado. `prisma:pull` modifica el schema local; no es un paso rutinario para arrancar el código versionado. Los secretos y el certificado CA permanecen fuera de Git.
