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

No se hicieron escrituras en la base compartida ni cambios de tenant. Docker no dispone de daemon y no hay un servidor MySQL local instalado en este equipo, por lo que no se ejecutaron pruebas físicas de registro de pedido, pago, usuarios o PATCH de fecha en una base desechable. Esas pruebas siguen pendientes de una instancia aislada. La fuente fixture permite desarrollo y tests; no reemplaza la integración futura con Manager ni corrige las limitaciones del esquema MySQL actual.

## Integración posterior con `dev`

Se fusionó `origin/dev` (`322e12e`) conservando su contrato canónico de DTO para etiquetas, comentarios, detalles, cantidades y estados, junto con las correcciones de esta rama. Los cinco conflictos de contenido se resolvieron sin retirar los tests de ninguna rama. La reevaluación de una Nota de Venta ya no copia su fecha tentativa de origen a la programación productiva: conserva la fecha del pedido y las fechas de los detalles existentes, y asigna a las líneas nuevas la fecha productiva del pedido o `NULL` si aún no se programó. La fecha de origen permanece visible en la vista previa comercial.

Tras la integración, la búsqueda de la nota sintética `24226` mostró cliente, producto, etiquetas disponibles y campo de observaciones. Kanban abrió el detalle `24072` con «Prioridad por contrato» y `24057` sin etiquetas; el indicador apareció mientras cargaba. En Calendario, el pedido sin programar `24886` mostró «Por definir» para pedido y producto, y los tres pendientes siguieron visibles al pasar de octubre a noviembre. Estas comprobaciones fueron solo de lectura.

`npm test --prefix capaServidor`: 855 aprobadas, 2 omitidas; incluye dos casos nuevos de reevaluación con fechas de origen distintas. `npm test --prefix capaVista`, lint, build y `prisma:validate`: aprobados. Las escrituras físicas en MySQL desechable continúan pendientes; ninguna prueba de navegador registró pedidos ni modificó fechas en la base compartida.
