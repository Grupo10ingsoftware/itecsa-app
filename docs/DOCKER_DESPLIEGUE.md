# Docker y despliegue ITECSA

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
Compose inyecta `NODE_ENV=development`, el origen local y la ruta de CA del
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

- PR a `main`: pruebas backend/frontend y del despliegue, build y smoke Docker.
  No publica imagenes y no recibe credenciales de despliegue.
- Push a `main`: mismas verificaciones, publicacion en GHCR de **las imagenes
  probadas** y actualizacion de Northflank si todo pasa.
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

Solo hay un despliegue activo a la vez; no se cancela durante escrituras.
Las versiones de `main` obsoletas se omiten antes de actualizar. La API se actualiza
primero, luego web; estos despliegues no son atomicos. Los cambios de API deben
seguir siendo compatibles con el frontend anterior durante esa transicion.

El script usa GET de servicio y PATCH del servicio de despliegue, preserva la
credencial de registro y no toca variables, archivos, puertos ni base de datos.
Comprueba SHA por `/api/health/live` y `/version.json`, ademas de `/api/health/db`.
Una respuesta de la version anterior no confirma el despliegue. Ante fallo intenta
restaurar **ambos** servicios y verificar sus versiones anteriores. Si esa
restauracion falla, el workflow tambien falla e identifica el servicio afectado.
Restaurar imagenes **no restaura datos** ni deshace migraciones.

Cada ejecucion guarda `release.json` (SHA y digests). Los despliegues guardan
`previous.json` y el resultado `release.json`, en artifacts retenidos 90 dias.
No contienen credenciales. Mantener las imagenes necesarias para rollback en GHCR.
Guardar estas referencias junto a cada entrega al cliente.

## Primera activacion de Northflank

1. Revisar/mergear esta rama con las pruebas aprobadas. El primer push puede
   publicar imagenes aunque el job de despliegue falle por configuracion faltante.
   Alternativamente ejecutar `operation=publish` desde `main` para bootstrap.
2. Northflank: completar su requisito de metodo de pago y mantener el plan
   **Sandbox**. Usar dos servicios **deployment**, una instancia cada uno, sin
   servicios adicionales de build ni volumenes de pago. Confirmar el costo
   mostrado antes de crearlos. El proyecto existente es `itecsa-app`.
3. Crear una credencial de GHCR para `ghcr.io`, usuario GitHub y PAT classic con
   `read:packages`, cuyo titular tenga acceso a ambos paquetes privados. El token
   temporal `GITHUB_TOKEN` del workflow no sirve como credencial permanente de
   Northflank. No ampliar a `write:packages` para descargar imagenes.
4. Crear API y web desde los **dos digests de la misma release**. Dejar command y
   entrypoint Docker en modo default. No configurar CI/CD desde Git en Northflank.
5. API: puerto HTTP publico 3000, `PORT=3000`, `NODE_ENV=production`, variables
   backend actuales y CA montada en `/run/secrets/aiven-ca.pem`. Establecer
   `DB_SSL_CA_PATH` a esa ruta, `FRONTEND_ORIGIN` al origen HTTPS de web.
   No sobreescribir `APP_VERSION`: viene grabada en la imagen.
6. Web: puerto HTTP publico 8080 y las cuatro variables publicas. Usar como
   `VITE_API_BASE_URL` el origen HTTPS publico de API terminado en `/api`.
   Healthcheck web: `/version.json`; liveness API: `/api/health/live`;
   readiness API: `/api/health/db`, timeout al menos 15s por conexion externa.
7. En Auth0 añadir el origen HTTPS web a callbacks, logout y web origins de la
   SPA, conservando localhost. Actualizar el enlace de recuperacion del template
   de Universal Login a `/recuperar-contrasena` de la demo. No cambiar audience,
   roles ni permisos por dockerizar. Verificar login/logout con una cuenta de prueba.
8. Detras del ingreso publico de Northflank, establecer `TRUST_PROXY_HOPS=1`
   **solo si hay un unico salto y no hay acceso directo/bypass al puerto**. Verificar
   el encabezado/IP de cliente en ese ingreso. No usar `trust proxy=true` ni confiar
   en el primer valor arbitrario de `X-Forwarded-For`. En local usar 0.
9. Crear token API de Northflank restringido al proyecto y los dos servicios, con
   lectura general y actualizacion general. No necesita permisos para secretos,
   usuarios, bases, creacion/eliminacion de servicios ni billing.
10. En GitHub crear el Environment `northflank-demo` sin aprobacion manual para la
    demo automatica. Guardar `NORTHFLANK_API_TOKEN` como secret. Configurar las
    variables de la tabla siguiente (tambien se permiten variables de repositorio).
11. Ejecutar `operation=deploy` y comprobar version y logs. Luego demostrar que un
    merge real a `main` actualiza ambas capas. Configurar checks de PR como
    obligatorios si el plan de GitHub permite proteger este repositorio privado.

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
curl --fail http://localhost:3000/api/health/db
curl --fail http://localhost:8080/version.json
```

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

La BD actual contiene datos de prueba y es compartida por desarrollo y demo.
Dockerizar no corrige el historial de migraciones ni habilita nuevas tablas.
Mantener [procedimiento Orders](ORDERS_MIGRACION.md) como trabajo independiente.
Las notas de venta siguen en fixture; el envio de recuperacion PIN no esta
configurado con `NODE_ENV=production`. No usar modo development en demo para
habilitar un flujo de debug. El lint previo tenia 7 errores y 1 advertencia;
no se agrego como nuevo bloqueo del pipeline ni se deshabilitaron sus reglas.

Una restauracion de contenedores requiere compatibilidad del esquema con la
version anterior. La migracion futura de Aiven a la BD del cliente necesita
respaldo probado, conciliacion de esquema/historial y un procedimiento separado.
