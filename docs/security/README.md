# Cierre técnico Ley 21.719

Este directorio contiene los procedimientos operativos que acompañan las defensas implementadas. Ninguna instrucción aplica DDL a Aiven, modifica Auth0 ni conecta una fuente externa: esas acciones requieren una ventana supervisada y credenciales fuera del repositorio.

Para P26, consultar el [inventario de proveedores y vacíos de evidencia](data-processors.md). Para P25, consultar el [procedimiento propuesto de continuidad](../operacion/BACKUP_RESTORE.md). Ambos hallazgos siguen pendientes de verificaciones y decisiones externas.

## Estado de gates externos

- [ ] Rotar el secreto M2M de Auth0 expuesto previamente y revocar el anterior.
- [ ] Rotar la contraseña de base de datos y verificar que el usuario de la aplicación tenga privilegios mínimos.
- [ ] Rotar el secreto PIN previamente expuesto y coordinar el tratamiento de pendientes; la integración conserva el secreto y no ejecuta rotaciones.
- [ ] Aprobar legalmente la matriz de retención, derechos de titulares y procedencia histórica de PDF.
- [ ] Validar y aplicar las migraciones en la base objetivo; reconciliar `_prisma_migrations` sólo con supervisión.
- [ ] Crear un usuario append-only para `SecurityAuditEvent` y denegar UPDATE/DELETE a la identidad runtime.
- [ ] Configurar red interna y token de `/internal/ready`, o mantener el endpoint deshabilitado.
- [ ] Validar el proveedor Resend en el entorno autorizado y completar rotación y retención de PIN. La integración aporta hashes versionados, transacciones y pruebas de concurrencia; consultar [estado integrado](../INTEGRACION_FIX_21709.md).
- [ ] Aprobar TLS, usuario read-only, vistas y contrato de la futura fuente externa de notas de venta.

## Riesgo residual H03

Soporte conserva deliberadamente capacidades funcionales amplias en producción. No recibe scopes de Auth0 Management en su token de usuario y cada solicitud ejecutada con ese rol genera un evento reforzado. El riesgo de concentración de privilegios se acepta parcialmente hasta que la organización apruebe una separación de funciones. Las rutas demo sí quedan ausentes en producción.
