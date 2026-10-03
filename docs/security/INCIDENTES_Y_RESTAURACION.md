# Runbook de incidentes y restauración

El [canal técnico P19](../modulos/INCIDENT_REPORTS.md) permite a usuarios activos reportar sospechas desde `/reportar-incidente`, con remisión al contacto que Itecsa configure y evidencia mínima. No reemplaza este procedimiento, el registro operativo externo ni confirma incidentes. Su configuración, migración y recepción efectiva deben comprobarse antes de habilitarlo. No se notifican autoridades/titulares desde el formulario.

Itecsa debe definir y distribuir un canal alternativo para caída de la aplicación, fallo de autenticación o personas sin acceso. No se debe depender exclusivamente del formulario autenticado.

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

1. Seleccionar el respaldo por identificador y fecha; nunca restaurar directamente sobre producción como primera prueba.
2. Restaurar en una red aislada con credenciales temporales.
3. Ejecutar validación de esquema, historial de migraciones, conteos de control y pruebas funcionales sin exportar datos.
4. Verificar RPO/RTO, integridad de auditoría y consistencia de pedidos/pagos.
5. Autorizar el corte, rotar credenciales temporales y documentar evidencia.

- [ ] Política real de backups, RPO y RTO suministrada por infraestructura.
- [ ] Prueba de restauración ejecutada y fechada.
- [ ] Propietario de aprobación del retorno definido.
