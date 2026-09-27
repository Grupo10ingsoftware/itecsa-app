# Desarrollo local y configuración

Referencia para instalar y arrancar el código versionado. Consultar también [arquitectura](../arquitectura/ARQUITECTURA.md), [API](API.md), [pruebas](PRUEBAS.md) y [Docker](../operacion/DOCKER_DESPLIEGUE.md).

## Requisitos e instalación

Usar Node.js 22.12 o posterior de la rama 22, coherente con las imágenes y CI, y npm. Se necesita acceso autorizado a Auth0, a la base MySQL/Aiven y a su certificado CA.

Desde la raíz:

```bash
cp -n capaServidor/env.example capaServidor/.env
cp -n capaVista/env.example capaVista/.env
npm ci --prefix capaServidor
npm ci --prefix capaVista
```

Completar los archivos locales y después generar el cliente con `npm run prisma:generate --prefix capaServidor`; los placeholders no son valores operativos. Las copias anteriores conservan los `.env` existentes. Las fuentes de variables son [backend/env.example](../../capaServidor/env.example), [frontend/env.example](../../capaVista/env.example) y, para producción, [production.env.example](../../deploy/production.env.example). No sobrescribir un `.env` existente ni versionarlo.

Iniciar en terminales independientes:

```bash
npm run dev --prefix capaServidor
npm run dev --prefix capaVista
```

SPA: `http://localhost:5173`; API: `http://localhost:3000/api`. Auth0 debe permitir el origin y las URLs de retorno del ambiente correspondiente. `npm start --prefix capaServidor` inicia la API sin reinicio automático.

## Variables

| Capa / variables | Uso |
| --- | --- |
| SPA: `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`, `VITE_API_BASE_URL` | Configuración pública de login y API; visible en navegador |
| API: `PORT`, `FRONTEND_ORIGIN`, `TRUST_PROXY_HOPS` | HTTP, origen CORS y número de proxies confiables; en local usar 0 hops |
| API: `AUTH0_DOMAIN`, `AUTH0_AUDIENCE` | Issuer y audience del JWT; obligatorios en el arranque |
| API: `AUTH0_MANAGEMENT_CLIENT_ID`, `AUTH0_MANAGEMENT_CLIENT_SECRET`, `AUTH0_DATABASE_CONNECTION`, `AUTH0_PASSWORD_RESET_CLIENT_ID` | Gestión de identidades y solicitud de correos; exclusivos del servidor |
| API: `PIN_SECRET` | Obligatorio; exactamente 32 bytes en base64 para cifrado y huellas de PIN |
| API: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL_CA_PATH` | Adaptador MariaDB/MySQL con CA y TLS |
| Prisma CLI: `DATABASE_URL` | Conexión definida en `prisma.config.ts`; debe corresponder a la misma base del runtime |

Guardar la CA local, por ejemplo, en `capaServidor/certs/aiven-ca.pem`. El runtime resuelve rutas relativas de `DB_SSL_CA_PATH` respecto de `capaServidor`; usar una ruta válida para el entorno. Docker tiene sus propias rutas de montaje, descritas en su guía.

Conservar el mismo `PIN_SECRET` al usar la misma base, incluidos reinicios y rollback. Generar uno con `openssl rand -base64 32` solo al preparar un entorno nuevo e independiente. No rotarlo como parte de una instalación rutinaria.

La SPA de producción recibe los cuatro valores públicos por `runtime-config.js`; cambiarlos al iniciar el contenedor no requiere recompilar. Ningún valor de Management, base o PIN debe pasar al frontend.

## Prisma y base existente

El [schema](../../capaServidor/prisma/schema.prisma) usa el generador `prisma-client-js`; `prisma:generate` crea el cliente en `node_modules/@prisma/client`. Las opciones CLI se configuran en [prisma.config.ts](../../capaServidor/prisma.config.ts).

| Comando desde `capaServidor` | Efecto / condición |
| --- | --- |
| `npm run prisma:generate` | Genera el cliente local; no cambia la base |
| `npm run prisma:validate` | Valida el schema; no aplica DDL |
| `npm run prisma:migrate:status` | Consulta el historial; puede salir con error si hay divergencia o pendientes |
| `npm run orders:preflight` | Inspecciona el esquema y catálogos sin escribir datos; requiere acceso autorizado |
| `npm run prisma:pull` | Introspecta la base y actualiza `schema.prisma`; revisar el diff antes de conservarlo |
| `npm run prisma:studio` | Abre una interfaz con capacidad de edición; no tratarla como comprobación de solo lectura |
| `npm run prisma:migrate:dev` | Existe en el manifiesto, pero no usarlo sobre la base compartida/existente |

No ejecutar `db push`, `migrate reset` ni aplicar migraciones sobre una base compartida por seguir una guía de arranque. El historial y el esquema requieren [reconciliación de Orders](../operacion/ORDERS_MIGRACION.md) antes de un despliegue con DDL. La generación del cliente y el arranque de Docker no resuelven esa deriva.

Estos efectos se contrastaron con el código del proyecto y la [documentación oficial de Prisma CLI](https://www.prisma.io/docs/orm/reference/prisma-cli-reference). La recomendación de Prisma para producción no sustituye la revisión específica de este historial divergente.

El [manifiesto backend](../../capaServidor/package.json) conserva un override de `@hono/node-server` a `1.19.14` para la cadena de dependencias de Prisma. Revisar el lockfile y los avisos actuales antes de retirarlo; no usar `npm audit fix --force` como sustituto de una actualización revisada. Su presencia no garantiza que todo el árbol de dependencias esté libre de avisos.

## Cambios de permisos o vistas

El catálogo canónico es [shared/authorization.js](../../shared/authorization.js); frontend y backend lo consumen. Una capacidad efectiva debe estar permitida al rol por ese catálogo y presente en el token. Seguir la [guía Auth0](../auth0/README.md), proteger el endpoint en servidor y probar los casos autorizados y denegados. Los controles visuales no sustituyen la autorización del backend.
