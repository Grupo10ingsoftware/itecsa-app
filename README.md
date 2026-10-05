# ITECSA

Aplicación web para gestionar pedidos, producción y cobranzas. Usa una SPA React/Vite, una API Express con Auth0 y persistencia MySQL/Aiven mediante Prisma.

## Empezar

1. Consultar la [guía de desarrollo](docs/desarrollo/README.md) para requisitos, variables e instalación local.
2. Preparar las plantillas de entorno de cada capa y el certificado CA de la base autorizada.
3. Iniciar API y SPA en terminales independientes:

```bash
npm run dev --prefix capaServidor
npm run dev --prefix capaVista
```

SPA: `http://localhost:5173`. API: `http://localhost:3000/api`.

## Documentación

- [Índice técnico](docs/README.md): arquitectura, desarrollo, módulos, operación y Auth0.
- [Pendientes vigentes](docs/PENDIENTES.md): migraciones, integraciones, validaciones y decisiones de negocio.
- [Archivo histórico](docs/archivo/README.md): auditorías e informes de implementación con su contexto original.
- [Frontend](capaVista/README.md) y [backend](capaServidor/README.md): entradas a cada capa.

## Estructura y límites actuales

| Directorio | Contenido |
| --- | --- |
| `capaVista/` | SPA y módulos visuales |
| `capaServidor/` | API, servicios, repositorios, schema y migraciones preparadas |
| `shared/` | Catálogo compartido de roles y permisos |
| `docs/` | Referencias vigentes e informes archivados |
| `scripts/` | Utilidad de configuración y comparación RBAC |

Orders registra pedidos por API y Payments gestiona pagos con PIN. Mi perfil y la bandeja muestran información propia; Documentos/Solicitudes (P18) y Reportar incidente (P19) remiten comunicaciones al contacto configurado por Itecsa. En desarrollo y tests, las notas de venta sintéticas requieren `SALES_NOTE_SOURCE=fixture`; sin esa opción la fuente responde 503. Manager no está integrado. La compatibilidad con el esquema antiguo permite omitir snapshots, pero no sustituye la [migración pendiente](docs/operacion/ORDERS_MIGRACION.md) ni el índice único de NV.

Las suites vigentes se ejecutan con `npm test --prefix capaServidor` y `npm test --prefix capaVista`; consultar la [guía de pruebas](docs/desarrollo/PRUEBAS.md). Las pruebas que escriben pedidos, pagos o usuarios deben apuntar a una base MySQL desechable y aislada.

No versionar secretos, tokens ni datos personales reales. Las migraciones y verificaciones que escriben en una base compartida requieren el procedimiento y autorización del entorno. Esta documentación no acredita por sí sola un despliegue, la configuración actual de Auth0 ni cumplimiento legal.
