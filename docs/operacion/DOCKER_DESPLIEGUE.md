# Docker y despliegue ITECSA

Guía del flujo versionado en [docker.yml](../../.github/workflows/docker.yml). Consultar [configuración local](../desarrollo/README.md), [pruebas](../desarrollo/PRUEBAS.md) y [pendientes](../PENDIENTES.md). Las comprobaciones del ensayo en Northflank se registran abajo; no acreditan la futura instalación en el cliente.

Dos imagenes Linux/amd64: API Express con Node 22 y cliente Prisma generado,
y SPA compilada servida por Nginx sin privilegios. Ambas incluyen `shared/`.
Aiven y Auth0 permanecen externos. Construir o iniciar contenedores **no ejecuta migraciones**.

## Desarrollo local

Requisitos: Docker con Compose >=2.32 (Watch con `initial_sync`), acceso a Aiven y
Auth0, los dos `.env` existentes y la CA local. No necesitas cambiar esos `.env`.

Desde la raiz:

```bash
docker compose --env-file capaServidor/.env up --build --watch
```

Abrir `http://localhost:5173`. API: `http://localhost:3000/api`.
Compose inyecta `APP_ENV=development`, `NODE_ENV=development`,
`SALES_NOTE_SOURCE=fixture` (salvo que se configure otro valor), el origen local y la ruta de CA del
contenedor. El navegador usa URLs publicas/locales, nunca nombres internos como
`http://api:3000`. Vite y nodemon reciben cambios de fuentes, fixture y `shared/`.
Cambios de dependencias o schema Prisma reconstruyen la imagen correspondiente.
Los `node_modules` del equipo no se montan. Cambios de `.env` requieren recrear
servicios; no contienen cambios de codigo.

```bash
docker compose --env-file capaServidor/.env logs -f api web
docker compose --env-file capaServidor/.env down
```

El comando toma la ruta relativa de CA del `.env` actual. Si es una ruta absoluta
del equipo o esta fuera de `capaServidor`, exportar `DB_CA_FILE` antes de iniciar.
El archivo debe ser legible por el usuario no privilegiado del contenedor.
La CA se monta en `/run/secrets/aiven-ca.pem`; nunca se copia a la imagen.

## Configuracion y secretos

| Configuracion | Destino |
| --- | --- |
| `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`, `VITE_API_BASE_URL` | Solo web, publicas |
| `AUTH0_*` Management, `DB_*`, `PIN_SECRET` | Solo API, en runtime |
| Certificado CA | Archivo montado solo en API |
| `NORTHFLANK_API_TOKEN` | Secret de GitHub Environment `northflank-demo` |
| Credencial GHCR de lectura | Northflank y servidor que descargue imagenes |

En desarrollo la SPA utiliza Vite. En produccion el entrypoint Nginx genera
`/runtime-config.js` con una lista cerrada de cuatro valores publicos, serializados
con jq. Se carga antes de React y no tiene cache. Cambiar estos valores al iniciar
no requiere compilar la imagen. No colocar secretos en variables `VITE_*`.

Conservar el **mismo `PIN_SECRET` al usar la misma base**, incluidos despliegues y
rollback: participa en cifrado y huellas de PIN. Generarlo solo para una base nueva
aislada, no para cada contenedor. Mantener coherencia entre `DB_NAME` y la URL de
Prisma CLI (`DATABASE_URL`); esta ultima no es necesaria para el runtime Docker.

Compose `secrets` monta archivos locales; **no es un servidor de secretos ni cifra
el archivo del equipo**. Northflank guarda los secretos e inyecta variables y
archivos. Un gestor como Vault puede integrarse despues si el cliente lo requiere.
Aiven actualmente se conecta por TLS. Una BD privada del cliente puede requerir
VPN o tunel; eso depende de su red y no reemplaza credenciales ni validacion TLS.

## GitHub: pruebas, publicacion y despliegue

Workflow: `.github/workflows/docker.yml`.

- PR a `dev` o `main`: enlaces documentales, pruebas backend/frontend y de scripts/despliegue, build y smoke Docker.
  No publica imagenes y no recibe credenciales de despliegue.
- Push a `main`: mismas verificaciones y publicacion en GHCR de **las imagenes
  probadas**. La actualizacion de Northflank requiere completar antes el
  Environment `northflank-demo` con un token API.
- `workflow_dispatch`, `operation=publish`: bootstrap, publica sin desplegar.
- `workflow_dispatch`, `operation=deploy`: verifica y publica el main actual,
  despues despliega.
- `workflow_dispatch`, `operation=rollback`, `release_sha=<SHA completo>`: resuelve
  una pareja ya publicada y la despliega, sin reconstruir.

Las operaciones manuales se ejecutan desde `main`. Los nombres son
`ghcr.io/grupo10ingsoftware/itecsa-app-api:sha-<SHA>` y
`ghcr.io/grupo10ingsoftware/itecsa-app-web:sha-<SHA>`.
El despliegue utiliza `@sha256:<digest>`, no `latest`. Las imagenes permanecen
privadas: no cambiar la visibilidad para resolver problemas de acceso.

El recorrido de integración previsto para la dockerización es `migration/docker` → `dev` → `main`; esa rama identifica la entrega original, no una condición de uso de la guía.
Primero revisar la dockerizacion en un PR hacia `dev`; cuando esa integracion
este validada, preparar el PR de `dev` hacia `main`. Integrar en `dev` verifica
codigo, pero no publica imagenes ni despliega Northflank. El ensayo externo se
activo manualmente desde `migration/docker`; el despliegue automatico empieza
solo despues de configurar el token y llevar los commits a `main`.

Solo hay un despliegue activo a la vez; no se cancela durante escrituras.
Las versiones de `main` obsoletas se omiten antes de actualizar. La API se actualiza
primero, luego web; estos despliegues no son atomicos. Los cambios de API deben
seguir siendo compatibles con el frontend anterior durante esa transicion.

El script usa GET de servicio y PATCH del servicio de despliegue, preserva la
credencial de registro y no toca variables, archivos, puertos ni base de datos.
Comprueba SHA por `/api/health/live` y `/version.json`. La conexion con BD se
comprueba por separado desde la red interna mediante `/internal/ready` con token;
el workflow no publica ese token ni accede a esa ruta privada.
Una respuesta de la version anterior no confirma el despliegue. Ante fallo intenta
restaurar **ambos** servicios y verificar sus versiones anteriores. Si esa
restauracion falla, el workflow tambien falla e identifica el servicio afectado.
Restaurar imagenes **no restaura datos** ni deshace migraciones.

Cada ejecucion guarda `release.json` (SHA y digests). Los despliegues guardan
`previous.json` y el resultado `release.json`, en artifacts retenidos 90 dias.
No contienen credenciales. Mantener las imagenes necesarias para rollback en GHCR.
Guardar estas referencias junto a cada entrega al cliente.

## Ensayo actual en Northflank (6 de octubre de 2026)

El proyecto `itecsa-app` del plan gratuito tiene dos servicios **deployment**,
una instancia cada uno, sin build desde Git en Northflank. Las imagenes privadas
de GHCR se publicaron manualmente desde `migration/docker` y estan fijadas por
digest, ambas con version `b54ebd2e3ebf5fb907f8cf05f7c016952cfb7222`:

| Servicio | Imagen | URL HTTPS |
| --- | --- | --- |
| API | `ghcr.io/grupo10ingsoftware/itecsa-app-api@sha256:0d5ba69891e0bec7aeb7d5f58755e7ab8850feb7c13e8cfbb9fcd02b84faac38` | `https://p01--itecsa-api--rqcl72xtx82w.code.run` |
| Web | `ghcr.io/grupo10ingsoftware/itecsa-app-web@sha256:353e4caef7eb05063804870be33eb970df2b63c6ffa38f474d7c95f6111bab1b` | `https://p01--itecsa-web--rqcl72xtx82w.code.run` |

La API usa `APP_ENV=development`, `NODE_ENV=development`,
`SALES_NOTE_SOURCE=fixture`, `ENABLE_DEMO_ROUTES=false` y `TRUST_PROXY=0`.
Conserva la Aiven compartida y el `PIN_SECRET` correspondiente. Sus credenciales
se inyectan solo en la API; la CA se monta en `/run/secrets/aiven-ca.pem` con
modo `0644`. La web recibe solo dominio, client ID, audience de Auth0 y URL de
API mediante `/runtime-config.js`. La integracion `itecsa-ghcr-read` solo lee
los paquetes privados. No se han ejecutado migraciones ni escrituras en Aiven
durante esta activacion.

Se comprobo por HTTPS que `/api/health/live` y `/version.json` muestran el SHA
anterior, `/kanban` abre directamente, `/runtime-config.js` se sirve con
`Cache-Control: no-store` y la API permite por CORS el origen web exacto. La
consulta interna `SELECT 1` con Prisma desde el contenedor confirmo TLS con
Aiven. Una cuenta de prueba completo login, consulta de una nota del JSON y
logout. Northflank tiene readiness HTTP de API en `/api/health/live` (puerto
3000) y de web en `/version.json` (puerto 8080); ambas instancias volvieron a
estar disponibles tras guardar las pruebas. Estas comprobaciones no sustituyen
una prueba de carga ni un periodo de observacion prolongado.

Auth0 conserva localhost y admite la URL web de Northflank en callback, logout,
Web Origins y CORS. El maximo de access token de ITECSA API, incluido el limite
implicito, se ajusto a 3600 segundos. Falta observar su renovacion en una sesion
de mas de una hora. No se cambio el ID token ni el enlace de recuperacion del
template de Universal Login.

**Pendientes del ensayo:** verificar como llega la IP del cliente antes de
cambiar `TRUST_PROXY=0`; comprobar el enlace de recuperacion del template;
observar estabilidad, memoria y latencia con uso real; demostrar rollback de
ambas imagenes. `/api/health/db` ya no existe en el codigo actual; la ruta
`/internal/ready` requiere habilitacion y token, y no se expuso publicamente.

## Activacion posterior del despliegue automatico desde `main`

El Environment de GitHub `northflank-demo` ya contiene las URLs e IDs publicos
de la tabla siguiente. **No tiene `NORTHFLANK_API_TOKEN`**, por lo que el job de
despliegue automatico aun no puede actualizar Northflank. No hacer merge a
`main` esperando un despliegue exitoso hasta completar esta configuracion.

1. Mantener el flujo acordado de PR a `dev` y despues a `main` cuando el equipo
   lo apruebe. No se configuro disparador de Actions para `migration/docker`.
2. Definir el alcance RBAC y crear un token API de Northflank para el workflow.
   Northflank restringe roles por **proyecto**, no por servicio individual: un
   permiso de lectura/actualizacion de servicios en `Itecsa-app` abarcaria los
   dos actuales y cualquiera que se agregue despues. Esta ampliacion respecto
   del plan inicial requiere decision del equipo. El token no debe poder leer
   secretos, administrar usuarios o billing, ni crear/eliminar recursos.
3. Guardar ese token como secret `NORTHFLANK_API_TOKEN` del Environment. No
   pegarlo en Git, issues o chat. La credencial `read:packages` de Northflank
   para GHCR es independiente y debe seguir vigente.
4. Ejecutar `operation=deploy` con el SHA ya publicado y comprobar release,
   logs y restauracion. Despues verificar un merge real a `main`. Configurar
   checks de PR obligatorios si el plan de GitHub lo permite.

| Variable GitHub | Valor |
| --- | --- |
| `NORTHFLANK_PROJECT_ID` | ID del proyecto |
| `NORTHFLANK_API_SERVICE_ID` | ID del servicio deployment API |
| `NORTHFLANK_WEB_SERVICE_ID` | ID del servicio deployment web |
| `API_URL` | Origen publico HTTPS API, sin `/api` ni barra final |
| `WEB_URL` | Origen publico HTTPS web |

No crear tokens ni pegar secretos en issues, comentarios, Git o chat. La API de
Northflank usada es [PATCH deployment service](https://northflank.com/docs/v1/api/project/services/patch-deployment-service),
en lugar del antiguo POST de deployment deprecado. Referencias:
[GHCR](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry),
[Sandbox y costos](https://northflank.com/pricing),
[archivos secretos](https://northflank.com/docs/v1/application/secure/upload-secret-files).

## Instalacion y actualizacion en el cliente

El servidor necesita Docker/Compose, arquitectura amd64, acceso al registro (o
imagenes importadas), conectividad a Auth0/BD y un proxy HTTPS configurado por el
responsable del entorno. Entregar `compose.production.yaml`, esta guia,
`deploy/production.env.example`, los dos `env.example` y el manifiesto de release.
No es necesario instalar Node/npm ni construir desde fuentes en ese servidor.

1. Preparar archivos de entorno de API/web fuera de Git y copiar el certificado.
   Usar URLs publicas HTTPS en web y CORS, no DNS internos de Compose. Configurar
   Auth0 para el dominio del cliente y validar MySQL, collation, TLS y esquema.
2. Copiar `deploy/production.env.example` a `deploy/production.env`; completar los
   **dos digests y el SHA de la misma release**, rutas de archivos y origen web.
   Las rutas Compose son relativas al directorio del archivo Compose.
   `APP_VERSION` en ese archivo es informativo: cada contenedor usa el SHA grabado
   en su imagen.
3. Autenticar Docker en GHCR con acceso de lectura mediante `--password-stdin`.
   No introducir tokens como argumentos ni guardarlos en el archivo de release.

```bash
docker compose --env-file deploy/production.env -f compose.production.yaml config --quiet
docker compose --env-file deploy/production.env -f compose.production.yaml pull
docker compose --env-file deploy/production.env -f compose.production.yaml up -d --wait
docker compose --env-file deploy/production.env -f compose.production.yaml logs -f
curl --fail http://localhost:3000/api/health/live
curl --fail http://localhost:8080/version.json
```

Si se habilito readiness interna, comprobarla desde el servidor o la red privada
con `curl --fail -H "X-Health-Token: $INTERNAL_HEALTH_TOKEN" http://localhost:3000/internal/ready`.
Verificar que la respuesta es `{"status":"ok","database":"mysql"}`; esto
requiere las credenciales y la CA de la base, y no sustituye validar el esquema.

Los puertos se publican en loopback por defecto para quedar detras del proxy del
cliente. Ajustar `BIND_ADDRESS` solo con una decision explicita de red.
Al actualizar, guardar el archivo de release anterior, sustituir ambos digests
y SHA, y repetir pull/up. Para rollback restaurar el archivo anterior y repetir
los comandos; verificar versiones. No ejecutar `down` para una actualizacion normal.

### Entrega sin acceso a GHCR

En un equipo con las imagenes descargadas, sustituir las referencias por los
digests de la release y crear etiquetas locales estables:

```bash
docker tag ghcr.io/grupo10ingsoftware/itecsa-app-api@sha256:<digest-api> itecsa-api:<SHA>
docker tag ghcr.io/grupo10ingsoftware/itecsa-app-web@sha256:<digest-web> itecsa-web:<SHA>
docker image save -o itecsa-<SHA>.tar itecsa-api:<SHA> itecsa-web:<SHA>
sha256sum itecsa-<SHA>.tar > itecsa-<SHA>.tar.sha256
```

En el cliente verificar checksum, ejecutar `docker image load -i itecsa-<SHA>.tar`,
usar `API_IMAGE=itecsa-api:<SHA>` y `WEB_IMAGE=itecsa-web:<SHA>` en el archivo de
despliegue y ejecutar `up -d --wait --pull never`. Guardar el manifiesto de los
digests originales junto al tar. Auth0 y una BD externa siguen requiriendo red.

## Verificacion y limites conocidos

Smoke local (con imagenes de prueba ya construidas):

```bash
API_IMAGE=itecsa-api:docker-test WEB_IMAGE=itecsa-web:docker-test node scripts/docker-smoke.mjs
node --test scripts/*.test.mjs
```

Comprueba Prisma generado, usuario no root, ausencia de archivos secretos, vida
sin BD, dos configuraciones de la misma imagen web, serializacion segura, rutas
directas SPA y SIGTERM. Los tests de despliegue simulan exito, commit obsoleto,
version antigua, timeout ambiguo y restauracion de ambos servicios.

La guía de dockerización se preparó usando una BD compartida por desarrollo y demo; confirmar la clasificación y los datos del entorno antes de operarlo.
Dockerizar no corrige el historial de migraciones ni habilita nuevas tablas.
Mantener [procedimiento Orders](ORDERS_MIGRACION.md) como trabajo independiente.
Las notas de venta siguen en fixture; el envio de recuperacion PIN no esta
configurado con `NODE_ENV=production`. No usar modo development en demo para
habilitar un flujo de debug. Los recuentos de lint de fases anteriores permanecen en los informes archivados; ejecutar `npm run lint` para conocer el estado actual. El lint no forma parte del bloqueo del pipeline existente y sus reglas no se deshabilitaron.

Una restauracion de contenedores requiere compatibilidad del esquema con la
version anterior. La migracion futura de Aiven a la BD del cliente necesita
respaldo probado, conciliacion de esquema/historial y un procedimiento separado.
