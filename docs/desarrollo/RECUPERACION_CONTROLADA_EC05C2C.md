# Recuperación controlada desde `ec05c2c`

Fecha: 2026-10-04. Baseline funcional indicada por el equipo: `ec05c2c589be100a0ae7ac2a35f81a0486989ef4` (PR #76). `origin/dev` inspeccionado: `322e12e`. Rama de recuperación ya abierta: `fix/regresiones-dev` (PR #79). La baseline entró el 3 de octubre; varios commits posteriores en la topología tienen fecha de autoría anterior porque llegaron por merges tardíos. La clasificación se refiere a su incorporación posterior a la baseline, no a la fecha en que se escribió cada commit.

## Arquitectura y contratos que se preservan

- Ventas, Kanban, Calendario y Cobranzas consumen vistas de `/api/orders`. La API mantiene una fuente intercambiable de Notas de Venta: el fixture JSON habilitado expresamente en desarrollo/tests y, en el futuro, la consulta de Manager/ITECSA. El JSON no es el servidor `/api/demo-orders` retirado.
- El registro de una Nota de Venta crea `Pedidos`, detalles y registros de actividad en una transacción. La fecha tentativa comercial del origen no programa producción: `fecha_estimada_termino` de pedido y detalles nace `NULL`; el Administrador la asigna desde Calendario. La reevaluación debe conservar la fecha productiva.
- `Registros` es una bitácora común. Las relaciones `Registro_Etapas`, `Registro_Pago` y `registro_subprocesos` identifican eventos de proceso; `Comentario_Produccion`, `observacion_origen` y `observacion_interna` son texto de comentario. La observación de un registro de subproceso puede incluir a la vez un comentario humano y metadatos de avance Lanyard. Historial presenta el evento; Kanban debe presentar sólo el texto de comentario.
- El PIN personal se verifica por `requirePin` y se recupera mediante `/auth/pin-recovery/*`, `pin.service`, `pinDelivery.service` y un adaptador de entrega configurado. La ruta demo antigua importaba `requirePin`, pero el flujo real de recuperación no importa `demoOrders`. Retirar `/api/demo-orders` no retira `requirePin` ni la entrega de códigos. Una entrega real sigue requiriendo configuración de Resend y dominio remitente del equipo.
- Calendario actual usa `calendar-summary` de Orders. La antigua ruta de carga operacional y el mock de días coloreados eran consumidores separados; el tablero vigente usa la API compartida. No hay import activo del mock eliminado en la vista vigente.

## Cronología y decisión por cambio incorporado después de la baseline

| Incorporación / PR | Propósito y alcance | Relación causal, riesgo y decisión |
| --- | --- | --- |
| `fd45903`, merge `10cd8de` | Retira `/api/demo-orders`, su store y rutas. | **CONSERVAR CON AJUSTES.** La ruta demo no abastece Orders, PIN ni Calendario real; sí coexistía con la fuente fixture de Ventas. La fuente quedó acoplada a un flag demo y el PR #79 la desacopla. No restaurar la ruta demo. |
| `499f0c9`, merge `10cd8de` | Retira mock de Calendario y endpoint de carga operacional; mueve constantes. | **CONSERVAR CON AJUSTES.** El calendario productivo consulta Orders; la bandeja sin fecha quedó fuera del filtro mensual. El PR #79 consulta pendientes por separado y conserva la bandeja al cambiar de mes. La pantalla de carga operacional de Kanban merece validación funcional específica: la retirada del endpoint no demuestra por sí sola equivalencia. |
| `a2e88e8`, merge `10cd8de` | DTO canónico de Orders y adaptación de Kanban, Calendario y Pagos. | **CONSERVAR CON AJUSTES.** Centraliza el contrato, pero Kanban seguía leyendo nombres antiguos de etiquetas y podía fallar al renderizar. El PR #79 adaptó el detalle y añadió pruebas. También cambió el contrato usado por varias vistas; mantener pruebas de cada consumidor. |
| `2266a99`, `94220be`, merge `10cd8de` | Búsqueda P14 y limpieza de métricas P24. | **CONSERVAR.** Sin causa demostrada de los cuatro síntomas; verificar búsqueda y métricas antes de dar estabilidad completa. |
| `63a012f`, `d3c64f9`, `c9bbad7`, `a1c0022`, `fc368f0`, `458e9ad`, `b3cf2b8`, merge interno `ab76310`, PR #77 `eeea565` | Seguridad P8, privacidad P18, incidentes P19, perfil, navegación y limpieza documental. | **CONSERVAR CON AJUSTES.** Son funciones posteriores válidas. El merge de integración `3e44bf3` combinó cambios de ramas divergentes; revisar rutas, entorno y errores en ejecución. La limpieza documental no se usa como evidencia de que una función sea obsoleta. |
| Merges `99bec61`, `10cd8de`, `3e44bf3` | Incorporación tardía y resolución de conflictos. | **INVESTIGAR** por su resolución semántica, sobre todo contratos Orders y frontends. La prueba de compilación no cubre la interfaz ni datos reales. |
| `dd3bba9`, PR #78 `07ae31a`, con `3078466`, `1bf5799`, `b50a5b8`, `5b91162` | Prepara y reconcilia esquema/migraciones P21 y excepciones históricas documentadas. | **CONSERVAR CON AJUSTES.** La cadena de migraciones es necesaria; PR #79 aplicó las 14 en MySQL 8.4 aislado. Aún falta confrontar una BD de despliegue autorizada antes de migrarla; no editar migraciones ya aplicadas allí. |
| `8947f66` | Documenta cierre P05 tras la baseline. | **CONSERVAR.** Evidencia documental sin cambio de ejecución. |
| `322e12e` | Resuelve conflictos y amplía DTO con etiquetas, comentarios, vendedor, cantidades y estados. | **CONSERVAR CON AJUSTES.** Restituye datos necesarios, pero mezcla `Registros.observacion` de subproceso con comentarios en Kanban; el historial ya distingue metadatos de avance. Se debe proyectar sólo comentario humano y probar el caso mixto. |
| PR #79 `49ef560`, `7389c6c`, `7c229a9` | Repara render de Kanban, fuente fixture, pendientes de Calendario, fechas productivas y primer acceso de usuarios; integra `dev` y prueba escrituras en MySQL aislado. | **CONSERVAR CON AJUSTES.** Sus comprobaciones son reproducibles en `REGRESIONES_DEV_2026-10-04.md`. Falta separar comentario de evento y verificar integración real con Auth0/Manager y despliegue. |

## Mapa de síntomas y causa

| Síntoma | Causa observada | Estado de recuperación |
| --- | --- | --- |
| Calendario omite pedidos sin fecha | Filtro mensual por `fecha_estimada_termino`; los `NULL` no entran. | PR #79 consulta pendientes aparte y mantiene la bandeja. |
| Fecha de Manager aparece como término | Copia indebida de fecha comercial durante creación o reevaluación. | PR #79 deja fecha productiva `NULL` al crear y la conserva al reevaluar; prueba física aislada. |
| Registro de pedidos falla | La fuente fixture compartía flag con rutas demo; desactivar demo podía dejar Ventas sin fuente. | PR #79 desacopla fixture y verifica registro/duplicado en MySQL aislado. El proveedor Manager real sigue pendiente. |
| Kanban muestra cambios de proceso entre comentarios | La proyección añadida en `322e12e` trata toda observación de subproceso como comentario, incluso un marcador de avance. | Separar el marcador mediante la función existente y conservar el evento en Historial. |
| Recuperación de PIN y demo | La ruta demo dependía del middleware real `requirePin`, en dirección demo → infraestructura real. No se encontró dependencia inversa de recuperación hacia demo. | La ruta demo permanece retirada; el flujo de recuperación real conserva su adaptador y tests. Validación de entrega real pendiente. |

## Alcance de la recuperación y límites

Se continúa en `fix/regresiones-dev`; `main` y `dev` no se modifican. Se mantienen el DTO canónico, la fuente intercambiable y las funciones posteriores de privacidad, seguridad y perfil. Se corrige en la proyección común cualquier separación comentario/evento demostrada y se evita una limpieza adicional. Las pruebas MySQL aisladas del PR #79 cubren creación, fecha, pago, reevaluación y usuario pendiente; no prueban sesión Auth0, proveedor Manager, correo real, interfaz completa de Cobranzas/Producción ni datos de producción. Esas áreas no pueden declararse estables todavía.

## Resultado de esta intervención

La proyección de Kanban quita el marcador estructurado `Avance Lanyard` antes de crear un comentario. Un registro que sólo contiene avance queda en Historial y no aparece como comentario; si contiene texto humano y avance, conserva el texto humano en Kanban. Historial usa la misma función de limpieza para su descripción y mantiene porcentaje/cantidad como datos del evento. No se borraron datos ni se retiró código demo adicional. Los retiros posteriores a la baseline que se conservan son `/api/demo-orders`, la carga operacional y el mock visual de Calendario; el proveedor JSON provisional de Orders permanece.

Validación actual: servidor `npm test` **855 aprobadas, 3 omitidas, 0 fallos** (incluye el caso mixto comentario/avance); vista `npm test` **10 archivos Node aprobados** y verificaciones de interfaz del runner; ESLint y build de vista aprobados; `prisma:validate` aprobado; `git diff --check` sin errores. La prueba MySQL física del PR #79 no se repitió en esta intervención porque este ajuste sólo cambia una proyección de lectura y se cubre con la prueba focalizada y suite completa. Las 3 omitidas incluyen la prueba física opt-in. No se ejecutó una nueva prueba manual de navegador ni se inspeccionaron logs de un despliegue.
