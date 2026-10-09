# Reportes y estadísticas: RF70

En `/metricas`, la sección desplegable **Rendimiento de producción** permite generar el reporte con el período de la pantalla. No consulta el reporte hasta presionar **Generar reporte**. Cambiar el período descarta el resultado anterior; los errores permiten reintentar.

## Criterio de cumplimiento

- Se usa el ingreso a **Listo para entrega**, según la definición acordada para RF70; no el término de los productos ni una recepción del cliente.
- Cada pedido cuenta una vez, usando su último ingreso registrado a esa etapa. Si vuelve a ingresar, se considera el ingreso más reciente.
- El período incluye ambos días y filtra el ingreso a la etapa, no la creación del pedido.
- Las fechas del ingreso se interpretan en `America/Santiago`, con horario de verano/invierno. El plazo solicitado es `Pedidos.fecha_estimada_termino` (SQL DATE) y comprende todo ese día.
- Ingreso en el día solicitado o antes: a tiempo. Ingreso posterior: fuera de plazo.
- Pedidos sin plazo se informan por separado. Pedidos sin ingreso registrado no se cuentan. Sin ingresos en el período se muestra el mensaje de datos no disponibles.

## API y seguridad

`GET /api/metrics/production-performance?from=YYYY-MM-DD&to=YYYY-MM-DD`

Reutiliza `checkJwt` (token, identidad vinculada, sincronización de rol y límite de solicitudes) y `view:metrics`. Acceso funcional para Gerencia y Administrador Producción, conservando la excepción técnica vigente de Soporte. No requiere nuevos permisos Auth0 ni migraciones.

Valida fechas reales, orden del intervalo y máximo de 366 días antes de consultar Prisma. Devuelve únicamente `period`, `totalOrders`, `deliveredOnTime`, `deliveredLate` y `missingDeadline`, con `Cache-Control: no-store`. La consulta selecciona solo plazo y último ingreso; no expone nombres, clientes ni detalles de pedidos.

La consulta usa límites UTC amplios y luego aplica el día chileno para no perder ingresos cercanos a medianoche. El reporte no cambia los cálculos anteriores de cumplimiento por vendedor.

## Verificación

- `cd capaServidor && npm test`: cálculo, intervalos, consulta, sesión vinculada y matriz de roles/permisos.
- `cd capaVista && npm test`: renderizado de resultados y contrato API.
- `cd capaVista && npm run test:metrics:browser`: desplegable, generación, errores, período y solicitudes pendientes.
- `cd capaVista && npm run build`.
