# Runbook de migraciones y despliegue seguro

1. Crear MySQL desechable y ejecutar `npm ci` en `tooling/prisma` y `capaServidor`.
2. Ejecutar `npm run prisma:validate --prefix capaServidor`. Debido a la divergencia histórica ya detectada, CI materializa en MySQL desechable el DDL completo generado con `prisma migrate diff --from-empty`, lo compara nuevamente contra `schema.prisma` y prueba allí las operaciones concurrentes. No ejecutar aún `migrate deploy` sobre la base compartida.
3. Ejecutar tests backend, concurrencia MySQL, frontend, lint, build y auditorías runtime.
4. Ejecutar `npm run orders:preflight --prefix capaServidor` contra la base objetivo en modo lectura. Revisar drift físico, migraciones locales pendientes, desconocidas, fallidas o revertidas.
5. Tomar respaldo verificable y obtener aprobación de ventana.
6. Reconciliar `_prisma_migrations` y validar la cadena histórica completa sólo si el preflight demuestra divergencia conocida y un operador DBA aprueba el procedimiento. No editar filas manualmente como automatismo. Este gate permanece abierto: la validación del DDL final no equivale a declarar reconciliada la cadena histórica.
7. Aplicar DDL, verificar índices y permisos append-only de auditoría y desplegar aplicación con `APP_ENV=production`.
8. Confirmar que `/api/demo-orders` responde 404, `/api/health/live` no consulta BD y `/internal/ready` sólo funciona desde red interna con token.

La migración `202609260002_security_hardening` no fue aplicada a la base compartida durante esta entrega.
