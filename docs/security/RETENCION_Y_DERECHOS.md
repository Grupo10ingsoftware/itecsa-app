# Runbook de retención y derechos de titulares

El soporte técnico actual de P18 es [Documentos y canal de solicitudes](../modulos/PRIVACY.md). Las bases, responsables, plazos y conservación siguen pendientes de validación organizacional; el canal no ejecuta derechos ni habilita una purga.

## Retención

La limpieza automática implementada se limita a cuotas vencidas y caché temporal de notas. No hay purga automática de retos PIN; su conservación y eliminación requieren definición y validación operativa. Consultar [el estado PIN](H06-pin-lifecycle.md) y [la integración](../INTEGRACION_FIX_21709.md), sin interpretar la propuesta histórica delegada como implementación vigente. Usuarios, pedidos, documentos, pagos, mensajes, bitácoras de negocio y auditoría de seguridad no se eliminan automáticamente.

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
