# Documentación técnica de ITECSA

Punto de entrada para el equipo técnico. Las guías describen el código del repositorio revisado el 27-09-2026; los hechos de infraestructura y bases externas conservan la fecha de su evidencia, sin presumir una nueva verificación.

## Recorridos recomendados

| Necesidad | Referencia |
| --- | --- |
| Incorporarse y ejecutar el proyecto | [Desarrollo local y configuración](desarrollo/README.md) |
| Comprender componentes y flujos | [Arquitectura](arquitectura/ARQUITECTURA.md) |
| Consultar rutas, permisos y cuerpos | [Referencia API](desarrollo/API.md) |
| Ejecutar comprobaciones | [Pruebas y validación](desarrollo/PRUEBAS.md) |
| Construir pantallas consistentes | [Convenciones UI](desarrollo/CONVENCIONES_UI_FRONTEND.md) |
| Registrar pedidos y consultar notas de venta | [Orders / Ventas](modulos/ORDERS.md) |
| Gestionar pagos y su historial | [Payments / Cobranzas](modulos/PAYMENTS.md) |
| Configurar autenticación y autorización | [Auth0](auth0/README.md) y [matriz generada de permisos](auth0/RBAC-PERMISOS-POR-ROL.md) |
| Usar Docker, publicar o desplegar | [Docker y Northflank](operacion/DOCKER_DESPLIEGUE.md) |
| Preparar el esquema de Orders | [Migración de Orders](operacion/ORDERS_MIGRACION.md) |
| Validar Payments en una copia MySQL | [Pruebas aisladas de Payments](operacion/PAYMENTS_SOLICITUD_BD.md) |
| Revisar lo que falta y sus condiciones de cierre | [Pendientes](PENDIENTES.md) |
| Consultar evidencia de fases anteriores | [Archivo histórico](archivo/README.md) |

Entradas de código: [frontend](../capaVista/README.md), [backend](../capaServidor/README.md), [Orders](../capaVista/src/modules/orders/README.md), [Payments](../capaVista/src/modules/payments/README.md), [datos de desarrollo](../data/README.md) y [mockups de muestras](../mockups-muestras/README.md).

## Mantenimiento

- Mantener una referencia por tema. Los README locales orientan y enlazan; evitar copiar contratos, matrices o variables entre guías.
- Actualizar la guía correspondiente cuando cambien rutas, comandos, configuración o comportamiento. Contrastar con el código, las plantillas de entorno y las pruebas, no con un informe histórico.
- Registrar pendientes con evidencia, identificador existente y condición de cierre. No marcar una integración o validación externa como terminada por tener código o pruebas con dobles.
- Archivar auditorías en `archivo/auditorias/` e informes de implementación en `archivo/implementaciones/`. Conservar el cuerpo original y anteponer fecha/commit disponibles, ubicación original y enlaces vigentes. Añadirlos al índice histórico.
- Generar la matriz RBAC mediante `node scripts/rbac.mjs --generate`; no editar manualmente sus listas. Generar no consulta ni modifica Auth0.
- Usar enlaces relativos Markdown a documentación y archivos. Ejecutar `node scripts/check-docs.mjs` antes de entregar cambios. Comprueba destinos locales; no verifica URLs externas ni encabezados.
- Los informes archivados conservan referencias a código de su revisión original y se excluyen del control de enlaces. Sus índices sí se comprueban. Evitar referencias absolutas al equipo, secretos y ejemplos con datos reales.
