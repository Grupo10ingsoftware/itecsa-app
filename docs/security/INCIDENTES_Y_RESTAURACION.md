# Runbook de incidentes y restauración

## Incidente de datos o credenciales

1. Contener: deshabilitar la credencial o integración afectada, preservar evidencias y limitar accesos sin borrar registros.
2. Clasificar: sistemas, titulares, categorías, ventana temporal y capacidad de explotación. No copiar RUT, correos, tokens ni cuerpos a chats o tickets generales.
3. Rotar secretos comprometidos siguiendo `SECRETOS.md`; invalidar sesiones o PIN pendientes cuando corresponda.
4. Investigar mediante `requestId`, IDs internos y `SecurityAuditEvent`. Los logs no deben ser enriquecidos con datos personales.
5. Recuperar en un entorno aislado, verificar integridad y autorizar el retorno mediante doble control.
6. El responsable legal determina notificaciones, plazos y contenido; ingeniería no cierra por sí sola esa decisión.

- [ ] Equipo de respuesta, teléfonos y suplentes aprobados.
- [ ] Umbrales y procedimiento de notificación legal aprobados.
- [ ] Canal seguro de evidencias disponible.

## Restauración

El alcance, las dependencias, los controles pendientes y la plantilla de acta están en [P25: continuidad, respaldo y restauración](../operacion/BACKUP_RESTORE.md). Los pasos siguientes no acreditan una prueba realizada ni autorizan una restauración productiva.

1. Seleccionar el respaldo por identificador y fecha; nunca restaurar directamente sobre producción como primera prueba.
2. Restaurar en una red aislada con credenciales temporales.
3. Ejecutar validación de esquema, historial de migraciones, conteos de control y pruebas funcionales sin exportar datos.
4. Verificar RPO/RTO, integridad de auditoría y consistencia de pedidos/pagos.
5. Autorizar el corte, rotar credenciales temporales y documentar evidencia.

- [ ] Política real de backups, RPO y RTO suministrada por infraestructura.
- [ ] Prueba de restauración ejecutada y fechada.
- [ ] Propietario de aprobación del retorno definido.
