# Pendientes vigentes y condiciones de cierre

Revisión de coherencia documental del código: 03-10-2026. La evidencia externa conserva su fecha original. Esta lista consolida el seguimiento disponible; no constituye una nueva auditoría de seguridad ni una consulta a la base, Auth0 o infraestructura. **Implementado** se refiere al repositorio; **validación pendiente** requiere evidencia del entorno; **decisión pendiente** requiere definición funcional u organizacional. No se asignan responsables ni fechas que no estén acordados.

Las suites automatizadas se retiraron el 03-10-2026 por decisión de entrega. Las menciones a pruebas locales describen evidencia histórica; ver [comprobaciones disponibles](desarrollo/PRUEBAS.md).

## Orders e integración de notas de venta

Evidencia: [guía Orders](modulos/ORDERS.md), [reauditoría del 26-09](archivo/auditorias/ORDERS_REAUDITORIA_2026-09-26.md) e [implementación](archivo/implementaciones/ORDERS_IMPLEMENTACION.md).

| Identificador / tema | Estado documentado | Condición de cierre |
| --- | --- | --- |
| DB-01 / migración e integridad de NV | DDL preparado; compatibilidad sin snapshots implementada; base pendiente de validación | Reconciliar migraciones y esquema, verificar los archivos recuperados de agosto y acordar la reconciliación o baseline, probar copia aislada, aplicar DDL autorizado y comprobar preflight. Índice único y snapshots deben existir físicamente. Seguir [procedimiento Orders](operacion/ORDERS_MIGRACION.md). |
| DATA-02 / OBS-ORD-002 | Algoritmo productivo de reevaluación por posición pendiente | Acordar identidad estable de líneas, tratamiento de líneas retiradas y conservación del progreso con Producción/Kanban. Probar reordenamiento, eliminación y dos SKU del mismo tipo sin atribuir progreso a otra línea. |
| INT-01 / Manager | No implementado; fuente fixture | Incorporar contrato y acceso autorizado, control de versión/fallos y pruebas de fuente autoritativa. No presentar consultas al JSON como integración productiva. |
| RF44 / fecha productiva | Revisión funcional pendiente | Confirmar el alcance de fecha de origen versus programación productiva y validar el flujo de Calendario. No declarar cobertura completa solo por mostrar la fecha de la NV. |
| PERF-01 / PERF-02 | Medición e índice/paginación pendientes | Separar lookup de NV sin índice de crecimiento de lista sin paginación; medir plan, bytes y latencias con datos representativos y revisar consumidores antes de cambiar contratos. |
| Concurrencia y rollback del alta | Código transaccional y evidencia histórica de tests; MySQL aislado pendiente | Dos altas de una NV canónica generan un pedido y un 409; fallos en detalle, auditoría o mensajes revierten toda la unidad. Verificar históricos NULL y snapshots de líneas distintas. |
| Compatibilidad de clientes / respuesta del POST | Campos comerciales heredados se ignoran; respuesta hidratada conservada | Inventariar consumidores antes de rechazar campos heredados o reducir respuesta. No cambiar compatibilidad por la limpieza documental. |
| QA autenticada y accesibilidad | Evidencia histórica de hooks/SSR; entorno real pendiente | Verificar búsqueda, cancelación, confirmación, foco y teclado en navegador autenticado con el esquema y Auth0 del entorno. |

FUNC-01 (catálogo que ocultaba errores) y SEC-01 (errores 5xx de Orders/Detalles) tienen correcciones y pruebas locales registradas en la reauditoría. Ese estado no cierra DB-01 ni valida su despliegue.

## Payments

Evidencia: [guía Payments](modulos/PAYMENTS.md), [auditoría inicial](archivo/auditorias/PAYMENTS_AUDITORIA_PLAN_ACCION.md) y [seguimiento al 26-09](archivo/implementaciones/PAYMENTS_IMPLEMENTACION_ESTADO.md). La ejecución MySQL requiere la [copia aislada](operacion/PAYMENTS_SOLICITUD_BD.md).

| Acción | Estado documentado | Condición de cierre |
| --- | --- | --- |
| PAY-ACT-001 | Manejo de errores implementado; validación externa pendiente | Probar respuestas HTTP con autenticación real y confirmar que fallos internos no exponen detalles, conservando 4xx. |
| PAY-ACT-002 | Bloqueo/relectura transaccional implementados; MySQL pendiente | Dos decisiones distintas simultáneas: una transición y un 409; destinos iguales no duplican evento/aviso. Verificar rollback físico, locks y deadlocks en copia. |
| PAY-ACT-003 | Estado anterior prospectivo implementado; MySQL pendiente | Comprobar historial `1→2` y `2→3` en copia; conservar NULL histórico como desconocido, sin inventar ni sobrescribir eventos. |
| PAY-ACT-004 | Decisión de negocio pendiente | Acordar matriz pago × etapa con Cobranzas/Producción y probar revisiones durante producción/entrega. Rechazado→Confirmado todavía puede forzar etapa 1. |
| PAY-ACT-005 | Limpieza de PIN y prueba local de navegador implementadas; QA pendiente | Verificar cierre, cambio de pedido, fallo, éxito, motivo, foco y envío duplicado en la pantalla autenticada desplegada. |
| PAY-ACT-006 | Integración/identidad histórica bloqueadas | Reconciliar esquema, disponer de copia y contrato Manager, acordar política de identidad de líneas/históricos; probar dos SKU equivalentes y fuente reordenada. |
| PAY-ACT-007 | Política de acceso pendiente | Definir visibilidad de actor/motivo por rol y cubrir tanto registros de Payments como historial general, hoy protegidos por `read:orders`. |
| PAY-ACT-008 | Baseline exploratorio de lectura disponible; presupuesto pendiente | Medir con N representativo, HTTP/Auth0/frontend y presupuesto acordado. Las diez muestras de servicio/repositorio del 26-09 no prueban una mejora ni un SLA. |
| PAY-ACT-009 | Documentación alineada en el repositorio | Guía actual describe `req.pinActor`, fixture y ausencia de Manager; mantenerla actualizada al cambiar esos contratos. No requiere otra implementación funcional. |

## Auth0 y operación

- **Sesiones y permisos efectivos:** probar una sesión nueva representativa de cada rol y revisar usuarios con permisos directos, sin rol o con varios roles. La [auditoría del 25-09](archivo/auditorias/AUDITORIA-2026-09-25.md) cubrió asociaciones de roles; el snapshot JSON del 06-09 es anterior e incompleto. Cierre: evidencia fechada y sin tokens de claims, capacidades permitidas/denegadas y correspondencia con el catálogo.
- **Correos:** la lectura del tenant de desarrollo mostró desactivado el proveedor de correo propio. Confirmar la entrega efectiva y las plantillas que se usan antes de depender de correos de alta o recuperación; el HTML en Git no acredita que Auth0 lo use. Referencia: [Auth0](auth0/README.md).
- **Despliegue:** Docker/Northflank y CI/CD se trabajan por separado en [migration/docker](https://github.com/Grupo10ingsoftware/itecsa-app/tree/migration/docker); no están integrados en esta base de `dev`. Revisar esa integración y comprobar el entorno, publicación y rollback antes de documentarlos como operación vigente. La restauración de datos requiere su propia evidencia.
- **P26 / proveedores:** el [inventario](security/data-processors.md) distingue integraciones de servicios habilitados y contratos verificados. Auth0 usa un tenant de desarrollo revisado en solo lectura. Aiven apoya temporalmente el desarrollo; Itecsa decidió eliminar todos los registros de esa BD al desplegar y conservar sólo la estructura. Ese borrado no se ha ejecutado y requiere verificar qué ocurre con copias y logs. Aún no existe hosting para SPA/API ni se ha elegido la BD definitiva. Revisar región, subencargados, retención, incidentes y salida según los proveedores y datos que efectivamente se utilicen.

## Seguimiento de la auditoría de protección de datos

Evidencia original: [auditoría del 25-09-2026](archivo/auditorias/AUDITORIA_PREVIA_PROTECCION_DATOS_21719.md). Los identificadores H01–H19 se conservan para evitar perder trazabilidad. Los puntos sin cierre independiente se mantienen como pendientes de seguimiento; no se reafirman sus severidades o versiones vulnerables sin una nueva revisión.

| Hallazgo | Seguimiento disponible / condición de cierre |
| --- | --- |
| H01 / DTO y minimización | Revisar campos y consumidores por rol; verificar listas permitidas y ausencia de datos internos innecesarios en respuestas. |
| H02 / acceso a documentos y registros | PDF retirado del árbol actual; permanece pendiente la política de acceso a registros/historial (PAY-ACT-007). Validar todas las vías de lectura. |
| H03 / Soporte y demo | Mantener separación funcional y verificar restricciones de ambiente y asignaciones productivas; el rol técnico no es una prueba de separación operativa. |
| H04 / recuperación pública | Respuesta válida uniforme HTTP 202 y cuotas IP+correo implementadas; verificar tiempos reales, configuración persistente y operación. Ver [plan P08](security/PLAN-P08-P11-P18-P19-P28.md). |
| H05 / contadores PIN y consumo de recuperación | Serialización, consumo único y pruebas concurrentes implementados; validar locks y rollback en MySQL del entorno. Ver [integración](INTEGRACION_FIX_21709.md). |
| H06 / PIN pendiente | Definir expiración de copia reversible y revisar coste de hashing/ciclo de entrega; comprobar borrado tras aceptación y recuperación por reemplazo. |
| H07 / proveedor de recuperación | Resend requiere selección y configuración explícitas; sin proveedor no hay entrega. Console solo con opt-in de desarrollo. Validar remitente, recepción y controles del despliegue. |
| H08 / errores internos | Política HTTP centralizada implementada y probada; validar respuestas/logs en despliegue. Ver [H08](security/H08-http-errors.md). |
| H09 / autoridad de NV | Alta actual recupera y valida la fuente en servidor; validar integración/versionado real y condiciones de despliegue antes de cerrar la evidencia del entorno. |
| H10 / dependencias | Repetir revisión de manifiestos/lockfiles y avisos vigentes; no tratar el listado de CVE del informe como inventario actual. Conservar contexto del override Prisma/Hono al revisarlo. |
| H11 / secretos locales | Verificar permisos, almacenamiento y procedimiento de rotación en el entorno correspondiente; esta limpieza no inspecciona secretos locales. |
| H12 / procedencia e historial | PDFs/firmas retirados del árbol actual no purgan Git. Revisar procedencia del fixture y tratamiento del historial si contenía datos reales. |
| H13 / retención y derechos | Definir políticas y flujo organizacional/técnico, finalidades, plazos y excepciones, con evidencia revisada por responsables. |
| H14 / auditoría transversal | Acordar catálogo de eventos de seguridad/negocio y verificar cobertura, acceso y protección de registros. |
| H15 / perímetro y almacenamiento | Obtener evidencia del entorno sobre HTTPS, aislamiento, cifrado y gestión de llaves; archivos de despliegue no acreditan la operación. |
| H16 / backups; P25 | [Procedimiento P25](operacion/BACKUP_RESTORE.md) preparado. Los registros de Aiven temporal no se migrarán; verificar reconstrucción de estructura y catálogos necesarios sin copiarlos. Para el futuro entorno con datos persistentes, acreditar RPO/RTO aprobados, respaldos, retención y prueba aislada de restauración. Rollback de imágenes no restaura datos. |
| H17 / documentación y utilidades | Limpieza documental preparada en esta rama. Quedan revalidación de utilidades legadas, controles de dependencias/secretos e integración de CI; no cerrar todo el hallazgo por ordenar guías. |
| H18 / health de BD | `/api/health/live` no consulta BD; `/internal/ready` es opcional y requiere token. Validar restricción de red/configuración del entorno. |
| H19 / límites de lectura | Revisar paginación y límites de consultas/cálculos, con consumidores y mediciones (PERF-01/PERF-02, PAY-ACT-008). |

La revisión legal, contractual y organizacional conserva los límites del informe original. La limpieza de documentación no certifica cumplimiento ni resuelve automáticamente esos hallazgos.
