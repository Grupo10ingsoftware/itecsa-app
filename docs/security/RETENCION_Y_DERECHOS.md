# Runbook de retención y derechos de titulares

El soporte técnico actual de P18 es [Documentos y canal de solicitudes](../modulos/PRIVACY.md). Las bases, responsables, plazos y conservación siguen pendientes de validación organizacional; el canal no ejecuta derechos ni habilita una purga.

## Retención

La limpieza automática conserva la purga de cuotas vencidas y caché temporal de notas. Incorpora una opción para registros de recuperación PIN vencidos, desactivada por defecto: `PIN_RECOVERY_RETENTION_MODE=disabled`. Tras aprobar el plazo, `PIN_RECOVERY_RETENTION_DAYS` indica los días de conservación posteriores al vencimiento; `dry-run` sólo informa y `delete` elimina hasta 100 registros por ejecución de la tarea existente en producción. La selección y el borrado comprueban el vencimiento; no se modifican PIN vigentes ni usuarios. Los logs incluyen fecha, modo y conteos sin códigos ni destinatarios. Para simular manualmente desde `capaServidor`, usar `npm run pin:retention:preview -- --days PLAZO_APROBADO`; ese comando nunca borra datos. No requiere tablas nuevas ni migraciones. Los PIN vigentes, usuarios, pedidos y documentos se conservan. Suspender la limpieza de retos PIN con `disabled` y reiniciar el backend si existe una obligación de conservación.

Se definió un plazo de **seis meses calendario en UTC** para mensajes, comentarios de producción, historial de pedidos/pagos y auditoría de seguridad. `BUSINESS_RETENTION_MODE` acepta `disabled`, `dry-run` y `delete`; sin variable permanece desactivado y `env.example` propone simulación. El plazo se calcula desde la fecha de cada registro; una fecha exactamente en el límite se conserva. Las fechas principales desconocidas no son candidatas.

Desde `capaServidor`, `npm run retention:preview` simula las cuatro categorías sin escribir, incluso si el entorno indica `delete`. Devuelve hasta 100 candidatos por categoría y `hasMore` indica que existen más. Para la tarea automática de producción, configurar `BUSINESS_RETENTION_MODE=dry-run` y reiniciar; después de revisar la simulación, `delete` habilita lotes de hasta 100 por categoría en cada ejecución del intervalo existente. `disabled` y reinicio suspenden la tarea de negocio, por ejemplo durante una investigación. La retención PIN mantiene su configuración independiente.

Mensajes ligados a pedidos, comentarios e historial requieren un pedido en estado `Terminado`, `Finalizado` o `Cancelado`, creado hace más de seis meses, sin registros de actividad recientes y con todos sus detalles terminados hace más de seis meses. Pedidos activos, estados desconocidos o detalles sin fecha de término se conservan. Mensajes sin pedido se evalúan por fecha de publicación. El historial conserva etapas/subprocesos abiertos y registros vinculados a avances de lanyard. Los pedidos cancelados con detalles sin terminar también se conservan. Estas excepciones pueden prolongar la conservación más de seis meses.

El borrado de mensajes elimina primero sus asignaciones a usuarios. El historial elimina primero sus filas de etapas, pagos y subprocesos. Cada lote se selecciona y elimina en una transacción serializable: un error revierte ese lote; categorías ya completadas permanecen confirmadas. No hay nuevas tablas ni migraciones. No se borran pedidos, detalles, avances, clientes ni usuarios. La eliminación de historial también retira sus comprobantes históricos de pago y afecta métricas basadas en esos eventos: reportes antiguos pueden quedar incompletos. Los registros de auditoría se evalúan por `occurred_at`; esta tarea no limpia archivos de logs ni respaldos. Los logs de limpieza contienen solo categoría, modo, corte y conteos.

Antes de habilitar cualquier purga de negocio:

1. Legal y el responsable de datos deben aprobar finalidad, plazo, causal de suspensión y método de eliminación por categoría.
2. Operaciones debe identificar respaldos y réplicas afectados y documentar el plazo de propagación.
3. Seguridad debe preservar eventos sujetos a investigación o retención legal.
4. La ejecución debe producir una evidencia sin datos personales claros: lote, conteos, responsable, fecha y resultado.

- [ ] Matriz organizacional de retención aprobada.
- [ ] Plazos de conservación y bloqueo legal aprobados.
- [ ] Procedimiento de borrado en respaldos validado.

## Solicitudes de titulares

1. Registrar la solicitud con identificador interno y verificar identidad por un canal aprobado; no pedir secretos ni PIN por correo.
2. Determinar si corresponde acceso, rectificación, supresión, oposición, portabilidad o bloqueo según el análisis legal vigente.
3. Localizar datos por identificadores internos en sistemas autorizados; no exportar tablas completas.
4. Obtener revisión del responsable de datos antes de entregar o mutar información.
5. Entregar por canal seguro y registrar fecha, alcance, excepciones y responsable en auditoría.
6. Para supresión, aplicar primero bloqueo cuando exista retención legal o integridad contable pendiente.

- [ ] Responsable, SLA y canal oficial aprobados.
- [ ] Plantillas de respuesta revisadas por Legal.
- [ ] Inventario definitivo de sistemas y encargados aprobado.
