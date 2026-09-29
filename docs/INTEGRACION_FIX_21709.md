# Integraci?n de fix/21709 con dev

Fecha: 29-09-2026. Bases: `fix/21709` en `3edfa80` y `dev` en `921767e`.

## Resoluciones

- Se conservan las transacciones, snapshots y validaciones autoritativas de pedidos,
  las transiciones de pagos y la gesti?n de usuarios e historial de `dev`.
- Se integran hashes PIN versionados, validaci?n serializada, invalidaci?n de retos
  anteriores y consumo ?nico con rollback de `fix/21709`.
- Resend requiere configuraci?n expl?cita. Sin proveedor la recuperaci?n falla
  cerrada. `fake` queda limitado a tests; `console` solo se admite expl?citamente
  en desarrollo. El remitente real sigue pendiente de configuraci?n y validaci?n.
- `APP_ENV` y `NODE_ENV` deben coincidir. Las rutas y fixtures demo necesitan
  opt-in y permanecen prohibidas en producci?n.
- Las cuotas de recuperaci?n de contrase?a usan el servicio de `dev`, persistente
  en producci?n. La variante en memoria conserva claves resumidas, capacidad
  limitada y purga de entradas vencidas.
- Los controladores integrados usan errores p?blicos controlados y correlaci?n
  generada por el backend. Se conservan las respuestas de indisponibilidad de Auth0.
- Se mantiene la reorganizaci?n de documentaci?n de `dev`.

## Verificaci?n y l?mites

Validaci?n: 789 pruebas backend correctas y 2 omitidas; pruebas frontend, lint
y build de la SPA correctos. Prisma Client 7.10 generado y schema validado. Las pruebas de
PIN usan persistencia y proveedores simulados; no acreditan una prueba concurrente
sobre MySQL real ni un env?o real por Resend. Los tests de integraci?n de base
que requieren un entorno autorizado siguen omitidos.

No se aplican migraciones, no se modifican datos ni configuraci?n de Auth0 y no
se rotan secretos. La configuraci?n de despliegue debe incluir ambos entornos,
los secretos de seguridad requeridos por `dev` y el proveedor PIN elegido.
