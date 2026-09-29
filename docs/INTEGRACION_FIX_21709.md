# Integración de fix/21709 con dev

Fecha: 29-09-2026. Bases: `fix/21709` en `3edfa80` y `dev` en `921767e`.

## Resoluciones

- Se conservan las transacciones, snapshots y validaciones autoritativas de pedidos,
  las transiciones de pagos y la gestión de usuarios e historial de `dev`.
- Se integran hashes PIN versionados, validación serializada, invalidación de retos
  anteriores y consumo único con rollback de `fix/21709`.
- Resend requiere configuración explícita. Sin proveedor la recuperación falla
  cerrada. `fake` queda limitado a tests; `console` solo se admite explícitamente
  en desarrollo. El remitente real sigue pendiente de configuración y validación.
- `APP_ENV` y `NODE_ENV` deben coincidir. Las rutas y fixtures demo necesitan
  opt-in y permanecen prohibidas en producción.
- Las cuotas de recuperación de contraseña usan el servicio de `dev`, persistente
  en producción. La variante en memoria conserva claves resumidas, capacidad
  limitada y purga de entradas vencidas.
- Los controladores integrados usan errores públicos controlados y correlación
  generada por el backend. Se conservan las respuestas de indisponibilidad de Auth0.
- Se mantiene la reorganización de documentación de `dev`.

## Verificación y límites

Validación: 789 pruebas backend correctas y 2 omitidas; pruebas frontend, lint
y build de la SPA correctos. Prisma Client 7.10 generado y schema validado. Las pruebas de
PIN usan persistencia y proveedores simulados; no acreditan una prueba concurrente
sobre MySQL real ni un envío real por Resend. Los tests de integración de base
que requieren un entorno autorizado siguen omitidos.

No se aplican migraciones, no se modifican datos ni configuración de Auth0 y no
se rotan secretos. La configuración de despliegue debe incluir ambos entornos,
los secretos de seguridad requeridos por `dev` y el proveedor PIN elegido.
