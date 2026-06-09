# Capa Servidor - ITECSA

API Express responsable de exponer servicios backend y validar access tokens Auth0 destinados a la API ITECSA.

## Ejecucion

```bash
npm install
npm start
```

Para desarrollo con reinicio automatico:

```bash
npm run dev
```

## Variables De Entorno

Crear un archivo `.env` local a partir de `env.example`:

```dotenv
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
AUTH0_DOMAIN=<dominio-auth0>
AUTH0_AUDIENCE=<audience-api>
AUTH0_MANAGEMENT_CLIENT_ID=<client-id-m2m>
AUTH0_MANAGEMENT_CLIENT_SECRET=
AUTH0_DATABASE_CONNECTION=Username-Password-Authentication
AUTH0_PASSWORD_RESET_CLIENT_ID=<client-id-publico-spa>
DB_HOST=<host-aiven>
DB_PORT=<puerto-aiven>
DB_USER=<usuario-aiven>
DB_PASSWORD=<password-aiven>
DB_NAME=<nombre-bd>
DB_SSL_CA_PATH=./certs/aiven-ca.pem
DATABASE_URL=mysql://<usuario-aiven>:<password-aiven>@<host-aiven>:<puerto-aiven>/<nombre-bd>?sslcert=./certs/aiven-ca.pem&sslaccept=strict
```

- `PORT`: puerto HTTP del servidor.
- `FRONTEND_ORIGIN`: unico origen permitido por CORS para la SPA local.
- `AUTH0_DOMAIN`: tenant usado para construir el issuer validado.
- `AUTH0_AUDIENCE`: identificador de la API que debe contener el access token.
- `AUTH0_MANAGEMENT_CLIENT_ID`: identificador de la aplicacion M2M que debe estar autorizada con `create:users`, `read:roles` y `update:users`.
- `AUTH0_MANAGEMENT_CLIENT_SECRET`: secret M2M local; debe mantenerse fuera del repositorio.
- `AUTH0_DATABASE_CONNECTION`: conexion Database donde Auth0 crea usuarios.
- `AUTH0_PASSWORD_RESET_CLIENT_ID`: identificador publico de la SPA habilitada en la conexion Database para solicitar correos de cambio de contrasena.
- `DB_HOST`: host MySQL entregado por Aiven.
- `DB_PORT`: puerto MySQL entregado por Aiven.
- `DB_USER`: usuario MySQL entregado por Aiven.
- `DB_PASSWORD`: password MySQL local; debe mantenerse fuera del repositorio.
- `DB_NAME`: nombre de la base de datos MySQL.
- `DB_SSL_CA_PATH`: ruta local al certificado CA descargado desde Aiven, relativa a `capaServidor`.
- `DATABASE_URL`: URL usada por Prisma para conectar a la misma base MySQL. Debe apuntar a `mydb` y usar SSL con el certificado CA local.

Ningun secret real debe quedar en el repositorio. Las variables Management son consumidas solo por el backend protegido.

## Conexion Aiven MySQL

El backend usa `mysql2/promise` con pool y SSL. Descargar el certificado CA desde Aiven y guardarlo localmente, por ejemplo:

```txt
capaServidor/certs/aiven-ca.pem
```

El archivo `.gitignore` evita versionar certificados `.pem` dentro de `capaServidor/certs/`. Para verificar la conexion sin consultar datos de negocio:

```bash
curl http://localhost:3000/api/health/db
```

Respuesta esperada:

```json
{
  "status": "ok",
  "database": "mysql"
}
```

Si faltan variables, el certificado no existe o Aiven rechaza la conexion, el endpoint responde `500` con un mensaje generico sin exponer credenciales.

## Prisma ORM

Prisma esta instalado como infraestructura de acceso a datos, pero la logica de negocio actual sigue funcionando con `mysql2/promise` y mocks en memoria donde corresponde. No reemplazar repositorios ni servicios hasta planificar esa migracion por modulo.

La base `mydb` ya existe en Aiven, por lo que el flujo correcto es introspeccion y generacion de cliente:

```bash
npm run prisma:pull
npm run prisma:generate
```

Comandos disponibles:

```bash
npm run prisma:pull
npm run prisma:generate
npm run prisma:validate
npm run prisma:studio
```

No ejecutar `prisma migrate dev`, `prisma migrate reset` ni `prisma db push` sobre `mydb` en esta etapa. Esas acciones pueden modificar una base existente y deben quedar para una decision de migraciones posterior.

El cliente generado queda en `src/generated/prisma` y no se versiona. Si cambia el esquema real de Aiven, ejecutar `npm run prisma:pull`, revisar `prisma/schema.prisma` y luego `npm run prisma:generate`.

## Recursos Auth0 Esperados

- SPA: `ITECSA Frontend Local`.
- API: `ITECSA API`, con audience `https://api.itecsa.local` y firma `RS256`.
- M2M backend: `ITECSA Backend Management`, autorizada contra Auth0 Management API con `create:users`, `read:roles` y `update:users`.
- Action Post Login: `ITECSA Add Role Claim`, enlazada al flujo Post Login.
- Conexion Database: `Username-Password-Authentication`, administrada por Auth0.
- Roles permitidos: `Administrador`, `Gerencia`, `Operario`, `Ventas` y `Cobranzas`.

La autorizacion de roles se basa en Auth0 RBAC. El backend valida los roles emitidos en el access token y expone `rolUsuario` como respuesta simplificada para la SPA. Cualquier `app_metadata.rolUsuario` heredado en usuarios existentes es auxiliar y no reemplaza RBAC.

## Servicio Interno Auth0

`src/modules/users/service/auth0Management.service.js` prepara dos operaciones backend:

- `createAuth0User(...)` obtiene un token M2M, resuelve el rol Auth0 existente, crea un usuario Database solo con correo y contrasena temporal, asigna RBAC y mantiene la contrasena temporal aleatoria solo durante la llamada a Auth0.
- `requestPasswordSetupEmail(...)` solicita a Auth0 el envio del correo de establecimiento/cambio de contrasena mediante `/dbconnections/change_password`.

El servicio no devuelve contrasenas temporales, tokens, tickets ni enlaces de cambio de contrasena. Tampoco persiste nombre, apellido ni `app_metadata.rolUsuario` en Auth0; la autorizacion efectiva utiliza el rol Auth0 RBAC asignado y el claim `https://itecsa.local/roles`.

ITECSA no recibe, almacena ni persiste contrasenas de usuarios. La contrasena temporal generada por el backend existe solo en memoria durante la llamada de creacion Auth0 y luego se solicita el correo de establecimiento/cambio de contrasena administrado por Auth0.

## Endpoint De Autenticacion

### `GET /api/auth/verify`

Requiere:

```http
Authorization: Bearer <access_token>
```

Valida el JWT con Auth0 y devuelve la identidad proyectada cuando el token contiene email y exactamente un rol oficial:

```json
{
  "sub": "auth0|abc123",
  "email": "usuario@ejemplo.cl",
  "rolUsuario": "Administrador",
  "isAdministrador": true,
  "permissions": ["view:main-navigation"]
}
```

Respuestas:

- `200`: token valido con `https://itecsa.local/email` y un unico rol permitido en `https://itecsa.local/roles`.
- `401`: bearer token ausente o invalido.
- `403`: token autenticado sin email requerido, sin rol oficial unico, con multiples roles o con `permissions` malformado.

## Endpoint Administrativo

### `POST /api/admin/users`

Requiere un access token cuyo unico rol sea `Administrador`. Acepta solo:

```json
{
  "correoUsuario": "correo.controlado@example.cl",
  "rolUsuario": "Ventas"
}
```

Los roles permitidos son `Administrador`, `Gerencia`, `Operario`, `Ventas` y `Cobranzas`. El backend crea la cuenta Auth0, le asigna el rol RBAC existente y solicita el correo de establecimiento de contrasena; nunca recibe ni retorna una contrasena.

El cuerpo aceptado no incluye RUT, firma electronica ni contrasena. Esos datos no deben agregarse a este endpoint en la integracion Auth0 inicial.

Respuestas:

- `201`: usuario creado, con `passwordSetupEmailRequested: true` si se solicito el correo.
- `201` recuperable: cuenta creada pero fallo la asignacion de rol o la solicitud de correo; no debe repetirse la creacion.
- `400`: cuerpo invalido, rol no permitido o campos adicionales.
- `401`: access token ausente o invalido.
- `403`: usuario autenticado sin rol `Administrador`.
- `409`: correo ya existente en Auth0.
- `500`: error controlado anterior a la creacion, sin detalles Auth0.

### `POST /api/admin/users/password-setup-email`

Requiere un access token cuyo unico rol sea `Administrador`. Acepta solo:

```json
{
  "correoUsuario": "correo.controlado@example.cl"
}
```

El backend solicita a Auth0 el correo de establecimiento/cambio de contrasena mediante `/dbconnections/change_password`. Este endpoint no crea usuarios, no asigna roles, no devuelve tickets, no devuelve enlaces y no retorna contrasenas.

Respuesta exitosa:

```json
{
  "correoUsuario": "correo.controlado@example.cl",
  "passwordSetupEmailRequested": true
}
```

Respuestas:

- `200`: solicitud de correo aceptada por Auth0.
- `400`: cuerpo invalido, correo invalido o campos adicionales.
- `401`: access token ausente o invalido.
- `403`: usuario autenticado sin rol `Administrador`.
- `500`: error controlado al solicitar el correo, sin detalles Auth0.

## Pruebas Manuales

Login:

1. Levantar backend con variables Auth0 locales y `FRONTEND_ORIGIN=http://localhost:5173`.
2. Levantar frontend con `VITE_API_BASE_URL=http://localhost:3000/api`.
3. Iniciar sesion desde la SPA mediante Universal Login con un usuario controlado.
4. Verificar que la SPA vuelva a `http://localhost:5173` y no registre tokens, contrasenas ni datos personales en archivos.

Sin token:

```bash
curl -i http://localhost:3000/api/auth/verify
```

Con token invalido:

```bash
curl -i -H "Authorization: Bearer <token-invalido>" http://localhost:3000/api/auth/verify
```

Con un access token obtenido mediante login controlado:

```bash
curl -i -H "Authorization: Bearer <access_token>" http://localhost:3000/api/auth/verify
```

Creacion administrativa con token Administrador y un correo controlado nuevo:

```bash
curl -i -X POST http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"correoUsuario":"correo.controlado@example.cl","rolUsuario":"Ventas"}'
```

Repetir la misma solicitud permite verificar la respuesta `409`. Los casos recuperables se verifican mediante tests simulados para no causar cuentas o correos no deseados.

Reenvio del correo de establecimiento/cambio de contrasena con token Administrador y un correo controlado:

```bash
curl -i -X POST http://localhost:3000/api/admin/users/password-setup-email \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"correoUsuario":"correo.controlado@example.cl"}'
```

Caso `400` del reenvio:

```bash
curl -i -X POST http://localhost:3000/api/admin/users/password-setup-email \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"correoUsuario":"no-es-correo"}'
```

Caso `401` del reenvio:

```bash
curl -i -X POST http://localhost:3000/api/admin/users/password-setup-email \
  -H "Content-Type: application/json" \
  -d '{"correoUsuario":"correo.controlado@example.cl"}'
```

Caso `403` del reenvio: repetir la solicitud valida con un access token autenticado cuyo unico rol no sea `Administrador`.

No registrar tokens reales, contrasenas ni datos personales en archivos o documentacion.

Consulta el flujo completo en [docs/ARQUITECTURA.md](../docs/ARQUITECTURA.md).

## Endpoints RF32 - Pago Y Kanban

Estos endpoints cubren el cierre backend de `UR 3.1`, `UR 3.3` y `UR 3.7` usando datos mock en memoria.

### `GET /api/kanban`

Requiere access token Auth0 valido. Devuelve columnas fijas y ordenes mock:

```json
{
  "columns": [
    "Confirmacion de pago",
    "Listo para produccion",
    "En produccion",
    "Listo para entrega"
  ],
  "orders": []
}
```

### `PATCH /api/orders/:id/payment-status`

Requiere access token Auth0 valido con permiso `update:payment-status`.

```json
{
  "paymentStatus": "Confirmado"
}
```

Estados permitidos: `Pendiente`, `Confirmado`, `Rechazado`.

- Si queda `Confirmado`, el backend mueve la orden a `Listo para produccion`.
- Si queda `Pendiente` o `Rechazado`, el backend devuelve la orden a `Confirmacion de pago`.
- Sin permiso `update:payment-status`, responde `403`.

### `PATCH /api/kanban/orders/:id/move`

Requiere access token Auth0 valido.

```json
{
  "targetStatus": "Listo para produccion"
}
```

Si se intenta mover manualmente a `Listo para produccion` con pago distinto de `Confirmado`, responde:

```json
{
  "message": "Pedido en espera de confirmacion de pago"
}
```

Trabajo manual pendiente en Auth0 Dashboard:

- Rol `Cobranzas`: asignar `view:payments-module` y `update:payment-status`.
- Rol `Administrador`: asignar `view:payments-module`, sin `update:payment-status`.
- Cerrar sesion y volver a iniciar sesion con usuarios de prueba para emitir tokens nuevos.
