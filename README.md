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
Para trabajar con contenedores, seguir la [guía Docker y despliegue](docs/operacion/DOCKER_DESPLIEGUE.md).

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
| `deploy/`, `scripts/`, `.github/` | Configuración de contenedores, utilidades y CI/CD |

Orders registra pedidos por API y Payments gestiona pagos con PIN. Mi perfil y la bandeja muestran información propia; Documentos/Solicitudes (P18) y Reportar incidente (P19) remiten comunicaciones al contacto configurado por Itecsa. Las notas de venta todavía proceden de un fixture local; Manager no está integrado. La compatibilidad con el esquema antiguo permite omitir snapshots, pero no sustituye la [migración pendiente](docs/operacion/ORDERS_MIGRACION.md) ni el índice único de NV.

No versionar secretos, tokens ni datos personales reales. Las migraciones y verificaciones que escriben en una base compartida requieren el procedimiento y autorización del entorno. Esta documentación no acredita por sí sola un despliegue, la configuración actual de Auth0 ni cumplimiento legal.
