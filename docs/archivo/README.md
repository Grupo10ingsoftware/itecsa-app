# Archivo histórico

Estos informes conservan resultados y referencias de revisiones anteriores. No son instrucciones de operación ni prueban el estado actual de la base, de Auth0 o de un despliegue. El aviso inicial de cada archivo identifica su ubicación original: los hechos del cuerpo se interpretan en el contexto de esa revisión. Los enlaces se adaptaron a ubicaciones existentes; los destinos actuales no convierten el diagnóstico histórico en una evaluación vigente.

Las suites de tests se retiraron el 03-10-2026. Los comandos y recuentos aquí registrados son históricos; los enlaces a tests apuntan a una revisión conservada en Git. Ver [validación de entrega](../desarrollo/PRUEBAS.md).

Consultar primero el [índice vigente](../README.md) y los [pendientes](../PENDIENTES.md). Los cuerpos originales se preservan sin corregir sus afirmaciones retrospectivamente.

## Auditorías

| Informe | Contexto registrado | Referencia actual |
| --- | --- | --- |
| [Hallazgos de septiembre](auditorias/AUDITORIA_HALLAZGOS_2026-09-26.md) | 26-09-2026, revisión `bd6c71c2`; antes titulada “vigente” | [Pendientes](../PENDIENTES.md) |
| [Users y plan de acción](auditorias/USERS_AUDITORIA_PLAN_ACCION.md) | 27-09-2026, revisión `d7645ab`; incluye avance posterior | [Auth0](../auth0/README.md) |
| [Protección de datos](auditorias/AUDITORIA_PREVIA_PROTECCION_DATOS_21719.md) | 25-09-2026, revisión `166593b` | [Pendientes y evidencia](../PENDIENTES.md) |
| [Payments y plan de acción](auditorias/PAYMENTS_AUDITORIA_PLAN_ACCION.md) | 26-09-2026, commit inicial `0b3d83e` | [Payments](../modulos/PAYMENTS.md) |
| [Reauditoría de Orders](auditorias/ORDERS_REAUDITORIA_2026-09-26.md) | 26-09-2026 | [Orders](../modulos/ORDERS.md) |
| [Auth0](auditorias/AUDITORIA-2026-09-25.md) | 25-09-2026, código auditado `0e6fb0a` | [Auth0](../auth0/README.md) |

## Implementaciones

| Informe | Contexto registrado | Referencia actual |
| --- | --- | --- |
| [Orders](implementaciones/ORDERS_IMPLEMENTACION.md) | Rama `opt-ventas`, fase previa a la reauditoría del 26-09-2026 | [Orders](../modulos/ORDERS.md) |
| [Payments](implementaciones/PAYMENTS_IMPLEMENTACION_ESTADO.md) | Seguimiento al 26-09-2026; implementación desde `103eab8` | [Payments](../modulos/PAYMENTS.md) |
| [RBAC](implementaciones/RBAC-IMPLEMENTACION-Y-PENDIENTES.md) | 05-09-2026; observaciones del 06 y 25-09-2026 | [Auth0](../auth0/README.md) |

Los snapshots y las plantillas de Auth0 permanecen en su [carpeta original](../auth0/README.md), porque las utilidades dependen de esas rutas. El snapshot observado es evidencia histórica, no una consulta en tiempo real.
