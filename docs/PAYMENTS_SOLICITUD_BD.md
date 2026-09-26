# Solicitud a responsables de base de datos: pruebas aisladas de Payments

Esta solicitud prepara la validación de PAY-ACT-002, PAY-ACT-003 y la dependencia de esquema de PAY-ACT-006. **No autoriza cambios en `mydb` ni despliegue.** La aplicación está en la rama `opt-cobranzas`; el cambio de pago usa `SELECT ... FOR UPDATE`, revalida dentro de `$transaction` y registra el estado anterior prospectivamente.

## Entorno que se solicita

1. Proveer una base **desechable y aislada** con MySQL 8.4, mismo esquema lógico/catálogos de `Pedidos`, `Estado_Pago`, `Estado_Pedido`, `Registros`, `Registro_Pago`, `Usuario`, `Mensaje` y `MENSAJE_USUARIO`. Usar datos sintéticos o anonimizados; no trasladar RUT, correos, PIN ni motivos reales a un entorno sin los controles correspondientes.
2. Entregar las variables de conexión mediante el almacén de secretos o variables de entorno del equipo. Compartir solo nombre del entorno, host identificador y procedimiento de acceso; no pegar claves en tickets, chats ni repositorio.
3. Recuperar los archivos originales de las tres migraciones aplicadas en agosto que faltan localmente: `20260814120000_remove_electronic_signatures`, `20260830100000_reconcile_aiven_pin_prerequisite` y `20260830103000_add_personal_pins`. Revisar checksums e historial contra `_prisma_migrations`. No marcar migraciones como aplicadas ni ejecutar `migrate deploy` por inferencia.
4. Comparar esquema físico, FKs, índices y tipos con `schema.prisma`; registrar las cinco columnas de snapshot faltantes en `Detalle_pedido` y el índice único ausente en `Pedidos.numero_nota_venta`. Preparar respaldo verificable y ensayar cualquier DDL **solo en la copia**. El plan de Orders está en [ORDERS_MIGRACION.md](ORDERS_MIGRACION.md).

## Pruebas de aceptación en la copia

- Dos solicitudes simultáneas `Pendiente→Confirmado` y `Pendiente→Rechazado` sobre el mismo pedido: una transición efectiva, la otra 409; exactamente un `Registro_Pago` y solo la notificación correspondiente al estado final.
- Dos confirmaciones simultáneas del mismo pedido: ambas pueden devolver 200, pero hay un solo registro y un solo aviso.
- `Confirmado→Rechazado` con actor y motivo autorizados: nuevo evento con `id_estado_pago_anterior=2` e `id_estado_pago_nuevo=3`; verificar que el historial muestra ambos nombres. Repetir `Pendiente→Confirmado` con `1→2`.
- Provocar un fallo después de actualizar `Pedidos` y antes de terminar `Registro_Pago`; verificar rollback de pedido, registro y avisos. No borrar ni reescribir eventos históricos con estado anterior NULL.
- Medir p95 de PATCH y espera de bloqueo con la misma carga antes/después; conservar `EXPLAIN` y evidencia de deadlocks o timeouts. No concluir una mejora con una sola ejecución.
- Para PAY-ACT-006, probar por separado dos SKU con mismo tipo/cantidad y una Nota de Venta cuyo orden de líneas cambie. No inferir identidad histórica por posición.

Entregar resultado por caso (200/409/error), conteo de filas antes/después, plan de ejecución, tiempo de bloqueo y resultado de rollback **sin datos personales ni secretos**. Si la copia no refleja la deriva de esquema/migraciones de `mydb`, señalar esa diferencia antes de aprobar el despliegue. La ejecución en producción requiere una revisión y autorización de despliegue aparte.
