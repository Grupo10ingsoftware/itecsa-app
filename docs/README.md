# Documentación técnica de Itecsa

Punto de entrada para el equipo técnico. Las guías describen el código del repositorio revisado el 03-10-2026; los hechos de infraestructura y bases externas conservan la fecha de su evidencia, sin presumir una nueva verificación.

## Recorridos recomendados

| Necesidad | Referencia |
| --- | --- |
| Incorporarse y ejecutar el proyecto | [Desarrollo local y configuración](desarrollo/README.md) |
| Comprender componentes y flujos | [Arquitectura](arquitectura/ARQUITECTURA.md) |
| Consultar rutas, permisos y cuerpos | [Referencia API](desarrollo/API.md) |
| Ejecutar comprobaciones | [Validación de la entrega](desarrollo/PRUEBAS.md) |
| Comparar y mejorar la carga de P18/P19 | [Carga de formularios](desarrollo/CARGA_FORMULARIOS_P18_P19.md) |
| Construir pantallas consistentes | [Convenciones UI](desarrollo/CONVENCIONES_UI_FRONTEND.md) |
| Registrar pedidos y consultar notas de venta | [Orders / Ventas](modulos/ORDERS.md) |
| Gestionar pagos y su historial | [Payments / Cobranzas](modulos/PAYMENTS.md) |
| Configurar autenticación y autorización | [Auth0](auth0/README.md) y [matriz generada de permisos](auth0/RBAC-PERMISOS-POR-ROL.md) |
| Preparar el esquema de Orders | [Migración de Orders](operacion/ORDERS_MIGRACION.md) |
| Validar Payments en una copia MySQL | [Pruebas aisladas de Payments](operacion/PAYMENTS_SOLICITUD_BD.md) |
| Preparar continuidad y restauración | [P25: respaldos y restauración](operacion/BACKUP_RESTORE.md) |
| Revisar proveedores y tratamiento de datos | [P26: inventario de proveedores](security/data-processors.md) |
| Revisar lo que falta y sus condiciones de cierre | [Pendientes](PENDIENTES.md) |
| Consultar evidencia de fases anteriores | [Archivo histórico](archivo/README.md) |

Entradas de código: [frontend](../capaVista/README.md), [backend](../capaServidor/README.md), [Orders](../capaVista/src/modules/orders/README.md), [Payments](../capaVista/src/modules/payments/README.md) y [datos de desarrollo](../data/README.md).

- [Integración de fix/21709 con dev](INTEGRACION_FIX_21709.md): decisiones de resolución, configuración y límites de validación.
- [Aplicación progresiva P08/P11/P18/P19/P28](security/PLAN-P08-P11-P18-P19-P28.md): orden, dependencias, estado actual y evidencia de la primera iteración.
- [Documentos y canal de solicitudes](modulos/PRIVACY.md): alcance técnico actual de P18, configuración, evidencia y límites operativos.
- [Canal de reporte de posibles incidentes](modulos/INCIDENT_REPORTS.md): alcance técnico de P19, API, configuración, evidencia mínima y responsabilidad empresarial.

## Mantenimiento

- Mantener una referencia por tema. Los README locales orientan y enlazan; evitar copiar contratos, matrices o variables entre guías.
- Actualizar la guía correspondiente cuando cambien rutas, comandos, configuración o comportamiento. Contrastar con el código, las plantillas de entorno y las comprobaciones disponibles, no con un informe histórico.
- Registrar pendientes con evidencia, identificador existente y condición de cierre. No marcar una integración o validación externa como terminada por tener código o pruebas con dobles.
- Archivar auditorías en `archivo/auditorias/` e informes de implementación en `archivo/implementaciones/`. Conservar el cuerpo original y anteponer fecha/commit disponibles, ubicación original y enlaces vigentes. Añadirlos al índice histórico.
- Generar la matriz RBAC mediante `node scripts/rbac.mjs --generate`; no editar manualmente sus listas. Generar no consulta ni modifica Auth0.
- Usar enlaces relativos Markdown a documentación y archivos. Revisar sus destinos y el recorrido desde este índice al mover o actualizar guías.
- Los informes archivados conservan referencias al código de su revisión original. Mantener vigentes el índice histórico y los avisos de contexto; no reescribir la evidencia. Evitar referencias absolutas al equipo, secretos y ejemplos con datos reales.
