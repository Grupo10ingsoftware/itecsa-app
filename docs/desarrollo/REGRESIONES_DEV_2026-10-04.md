# Verificación de regresiones en desarrollo, 04-10-2026

Rama: `fix/regresiones-dev`. Referencia informada como funcional: merge `eeea565`.

## Causas comprobadas

- El DTO canónico de pedidos incorporado después de la referencia (`a2e88e8`) entrega etiquetas `{ id, name }`. `KanbanOrderSummary` aún intentaba mostrar `nombre_etiqueta` o el objeto completo. Una orden etiquetada podía provocar el error de React y dejar la página en blanco.
- El filtro mensual de `calendar-summary` solo devolvía fechas dentro del rango. Los pedidos con fecha `NULL` quedaban fuera de la bandeja. La bandeja de traslado guardaba IDs y los resolvía contra la lista del mes actual, por lo que desaparecían al navegar.
- La fuente sintética de Notas de Venta estaba acoplada al flag de rutas demo. Al desactivar dicho flag, Ventas y los previews históricos de Cobranzas perdían la fuente. `23923` existe como nota sintética, pero no como pedido registrado en la base consultada.
- El alta administrativa marcaba un usuario con rol asignado como `Activo` antes de su primer acceso. El nuevo estado `Pendiente` se promueve al validar el primer JWT con rol coincidente.

No se atribuye toda la serie a un solo commit: algunos comportamientos existían antes del merge de referencia y se hicieron visibles por cambios posteriores de configuración, datos o contratos.

## Evidencia de lectura en la base compartida

- Kanban: el detalle `24072` abrió con «Prioridad por contrato»; `24057` abrió sin etiquetas. El panel mostró la carga inmediatamente y el tablero siguió visible.
- Calendario: tres pedidos sin fecha aparecieron en la bandeja. Un pedido colocado en la bandeja de traslado siguió allí al cambiar de octubre a noviembre, sin guardar una fecha.
- Ventas: la búsqueda de `23923` devolvió la nota sintética. Cobranzas mostró cero pedidos para `23923`; el preview de `25168` mostró sus datos de producto. No se confirmó pago ni se registró pedido.
- Una muestra de carga visible en esta sesión fue de aproximadamente 2,9 s para Kanban y 3,2 s para Calendario con ambas listas. Incluye navegación, render y API; no separa la latencia de la conexión MySQL remota. La consulta individual de detalle mostró un indicador antes del resultado. Estas muestras no son una prueba de rendimiento estable.

## Verificación automatizada y límites

`npm test --prefix capaServidor`: 852 pruebas aprobadas, 2 omitidas. `npm test --prefix capaVista`, lint, build y `prisma:validate`: aprobados. Se conservan los 86 archivos de pruebas anteriores y se añadió uno para Kanban.

No se hicieron escrituras en la base compartida ni cambios de tenant. En esa primera verificación aún no había acceso a un daemon Docker, por lo que las escrituras físicas estaban pendientes. La fuente fixture permite desarrollo y tests; no reemplaza la integración futura con Manager ni corrige las limitaciones del esquema MySQL actual.

## Integración posterior con `dev`

Se fusionó `origin/dev` (`322e12e`) conservando su contrato canónico de DTO para etiquetas, comentarios, detalles, cantidades y estados, junto con las correcciones de esta rama. Los cinco conflictos de contenido se resolvieron sin retirar los tests de ninguna rama. La reevaluación de una Nota de Venta ya no copia su fecha tentativa de origen a la programación productiva: conserva la fecha del pedido y las fechas de los detalles existentes, y asigna a las líneas nuevas la fecha productiva del pedido o `NULL` si aún no se programó. La fecha de origen permanece visible en la vista previa comercial.

Tras la integración, la búsqueda de la nota sintética `24226` mostró cliente, producto, etiquetas disponibles y campo de observaciones. Kanban abrió el detalle `24072` con «Prioridad por contrato» y `24057` sin etiquetas; el indicador apareció mientras cargaba. En Calendario, el pedido sin programar `24886` mostró «Por definir» para pedido y producto, y los tres pendientes siguieron visibles al pasar de octubre a noviembre. Estas comprobaciones fueron solo de lectura.

`npm test --prefix capaServidor`: 855 aprobadas, 2 omitidas; incluye dos casos nuevos de reevaluación con fechas de origen distintas. `npm test --prefix capaVista`, lint, build y `prisma:validate`: aprobados. Ninguna prueba de navegador registró pedidos ni modificó fechas en la base compartida.

## Prueba física posterior en MySQL aislada

Se inició `mysql:8.4` en un contenedor desechable, con el puerto `33307` publicado **solo en `127.0.0.1`**, sin volumen persistente, usuario y contraseñas temporales, y base vacía `itecsa_physical_test`. Antes de cada comando con escrituras se comprobó el host, puerto, nombre de base, URL de Prisma e identidad y publicación de puertos del contenedor. `prisma migrate deploy` aplicó correctamente las 14 migraciones a esa base vacía.

La prueba [mysql.regressions.integration.test.js](../../capaServidor/test/mysql.regressions.integration.test.js) quedó deshabilitada por defecto y exige `RUN_PHYSICAL_REGRESSIONS=true`, `APP_ENV=test`, `NODE_ENV=test`, `DB_SSL_MODE=disabled`, `SALES_NOTE_SOURCE=fixture` y la dirección local/base de prueba exactas. Sembró solo estados, tipos, una etiqueta y dos usuarios sintéticos. Con Prisma conectado a MySQL real comprobó mediante relecturas:

- Vista previa de la nota fixture `24226`, registro único del pedido, rechazo `409` del duplicado y etiqueta persistida.
- Pedido y detalle inicialmente sin fecha y presentes en la consulta `calendar-summary` de no programados; asignación de `2026-10-12` a ambos.
- Confirmación de pago persistida con un `Registro_Pago` y etapa «Listo para produccion».
- Envío a revisión y reevaluación con fecha de origen `2026-11-20` y una línea sintética nueva: el pedido y ambas líneas conservaron la fecha productiva `2026-10-12`.
- Usuario «Pendiente» sin activación por rol incorrecto y activación persistida a «Activo» ante dos primeros accesos concurrentes con el rol correcto.

La prueba física pasó (1/1). Tras añadirla, la suite de servidor dio **855 aprobadas, 3 omitidas** (la prueba física se omite en ejecuciones normales); la suite de vista dio **37 aprobadas**. Lint, build y `prisma:validate` también pasaron. Estas comprobaciones ejercitan servicios y repositorios contra MySQL; no sustituyen una prueba de extremo a extremo con Auth0 ni la integración futura con Manager. La base compartida y el tenant permanecieron sin cambios. Al terminar se detuvo el contenedor `--rm`, se confirmó su ausencia y se borraron las credenciales temporales.
