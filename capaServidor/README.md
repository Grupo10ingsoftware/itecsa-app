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

Para ejecutar pruebas backend:

```bash
npm test
```

Comandos disponibles:

```bash
npm start
npm run dev
npm test
npm run repair:payment-demo
npm run sync:dummy-sales-notes
npm run prisma:pull
npm run prisma:generate
npm run prisma:validate
npm run prisma:migrate:dev
npm run prisma:migrate:status
npm run prisma:studio
```

## Variables De Entorno

Crear un archivo `.env` local a partir de `env.example`:

```dotenv
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
AUTH0_DOMAIN=<tenant-auth0>
AUTH0_AUDIENCE=https://api.itecsa.local
AUTH0_MANAGEMENT_CLIENT_ID=<client-id-m2m>
AUTH0_MANAGEMENT_CLIENT_SECRET=
AUTH0_DATABASE_CONNECTION=Username-Password-Authentication
AUTH0_PASSWORD_RESET_CLIENT_ID=<client-id-spa>
DB_HOST=<host-aiven>
DB_PORT=<puerto-aiven>
DB_USER=<usuario-aiven>
DB_PASSWORD=
DB_NAME=<nombre-bd>
DB_SSL_CA_PATH=./certs/aiven-ca.pem
DATABASE_URL=mysql://<usuario-aiven>:<password-aiven>@<host-aiven>:<puerto-aiven>/<nombre-bd>?sslcert=./certs/aiven-ca.pem&sslaccept=strict
```

- `PORT`: puerto HTTP del servidor.
- `FRONTEND_ORIGIN`: unico origen permitido por CORS para la SPA local.
- `AUTH0_DOMAIN`: tenant usado para construir el issuer validado.
- `AUTH0_AUDIENCE`: identificador de la API que debe contener el access token.
- `AUTH0_MANAGEMENT_CLIENT_ID`: identificador de la aplicacion M2M que debe estar autorizada con `create:users`, `read:roles`, `read:users` y `update:users`.
- `AUTH0_MANAGEMENT_CLIENT_SECRET`: secret M2M local; debe mantenerse fuera del repositorio.
- `AUTH0_DATABASE_CONNECTION`: conexion Database donde Auth0 crea usuarios.
- `AUTH0_PASSWORD_RESET_CLIENT_ID`: identificador publico de la SPA habilitada en la conexion Database para solicitar correos de cambio de contrasena.
- `DB_HOST`: host MySQL entregado por Aiven.
- `DB_PORT`: puerto MySQL entregado por Aiven.
- `DB_USER`: usuario MySQL entregado por Aiven.
- `DB_PASSWORD`: password MySQL local; debe mantenerse fuera del repositorio.
- `DB_NAME`: nombre de la base de datos MySQL.
- `DB_SSL_CA_PATH`: ruta local al certificado CA descargado desde Aiven, relativa a `capaServidor`.
- `DATABASE_URL`: URL usada por Prisma para conectar a la misma base MySQL definida en `DB_NAME` y usar SSL con el certificado CA local.

Ningun secret real debe quedar en el repositorio. Las variables Management son consumidas solo por el backend protegido.

## Conexion Aiven MySQL

El backend usa Prisma con `@prisma/adapter-mariadb` y SSL. Descargar el certificado CA desde Aiven y guardarlo localmente, por ejemplo:

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

Prisma es la infraestructura de acceso a datos del backend. La creacion administrativa de usuarios, pedidos, clientes, productos, estados de pedido, estados de pago, detalles, registros de pago y documentos usan repositorios basados en Prisma cuando ejecutan contratos reales.

La base indicada en `DB_NAME` debe existir en Aiven. Con esa precondicion, el flujo correcto es introspeccion y generacion de cliente:

```bash
npm run prisma:pull
npm run prisma:generate
```

Comandos disponibles:

```bash
npm run prisma:pull
npm run prisma:generate
npm run prisma:validate
npm run prisma:migrate:status
npm run prisma:studio
```

`npm run prisma:migrate:dev` existe en `package.json`, pero no debe ejecutarse contra la base existente sin una decision explicita de migraciones. Tampoco ejecutar `prisma migrate reset` ni `prisma db push` sobre esa base sin autorizacion del equipo, porque pueden modificar datos o estructura.

El cliente Prisma se genera en `node_modules/@prisma/client`. Si cambia el esquema real de Aiven, ejecutar `npm run prisma:pull`, revisar `prisma/schema.prisma` y luego `npm run prisma:generate`.

## Override Temporal De Seguridad

`package.json` fuerza temporalmente `@hono/node-server` a `1.19.14` mediante `overrides` por el advisory `GHSA-92pp-h63x-v22m`.

La cadena afectada es `prisma -> @prisma/dev -> @hono/node-server`. No ejecutar `npm audit fix --force` para este caso, porque npm propone bajar Prisma a una version mayor anterior. Mantener Prisma 7 y retirar el override solo cuando Prisma publique una version que resuelva `@hono/node-server >=1.19.13` sin override y `npm audit` quede limpio.

## Recursos Auth0 Esperados

- SPA: `ITECSA Frontend Local`.
- API: `ITECSA API`, con audience `https://api.itecsa.local`, firma `RS256` y scopes declarados `view:main-navigation`, `view:kanban-module`, `view:payments-module`, `view:own-profile`, `view:orders-module`, `create:users-visually`, `manage:users-visually`, `update:payment-status` y `move:kanban-to-production`.
- M2M backend: `ITECSA Backend Management`, autorizada contra Auth0 Management API. El token M2M validado contiene `create:users`, `read:roles`, `read:users` y `update:users`.
- Action Post Login: `ITECSA Add Claims`, enlazada al flujo Post Login.
- Conexion Database: `Username-Password-Authentication`, administrada por Auth0.
- Roles permitidos: `Administrador`, `Gerencia`, `Producción`, `Ventas` y `Cobranzas`.

La autorizacion de roles se basa en Auth0 RBAC. El backend valida los roles emitidos en el access token y expone `rolUsuario` como respuesta simplificada para la SPA. Cualquier `app_metadata.rolUsuario` heredado en usuarios existentes es auxiliar y no reemplaza RBAC.

## Servicio Interno Auth0

`src/modules/users/service/auth0Management.service.js` prepara dos operaciones backend:

- `createAuth0User(...)` obtiene un token M2M, resuelve el rol Auth0 existente, crea un usuario Database solo con correo y contrasena temporal, asigna RBAC y mantiene la contrasena temporal aleatoria solo durante la llamada a Auth0.
- `updateAuth0User(...)` actualiza correo, estado de bloqueo y rol RBAC del usuario Auth0 durante la edicion administrativa.
- `setAuth0UserStatus(...)` vincula o desvincula una cuenta Auth0 sin modificar datos personales internos.
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

### `POST /api/auth/password-reset/request`

Endpoint publico usado por la pantalla `/recuperar-contrasena`. Acepta solo:

```json
{
  "email": "correo.controlado@example.cl"
}
```

El backend normaliza el correo, consulta la tabla interna `Usuario` y decide si corresponde solicitar a Auth0 el correo de cambio de contrasena mediante `requestPasswordSetupEmail(...)`.

Reglas:

- Usuario no registrado: no llama Auth0 y devuelve mensaje controlado.
- Usuario `Desvinculado` o distinto de `Activo`: no llama Auth0 y devuelve mensaje de cuenta desactivada.
- Usuario `Activo`: solicita a Auth0 el correo de cambio de contrasena.

Respuesta de usuario no registrado:

```json
{
  "status": "not_registered",
  "message": "No encontramos una cuenta asociada a este correo. Si crees que esto es un error, comunicate con el administrador."
}
```

Respuesta de usuario desactivado:

```json
{
  "status": "disabled",
  "message": "Tu cuenta se encuentra desactivada. Comunicate con el administrador."
}
```

Respuesta de usuario activo:

```json
{
  "status": "sent",
  "message": "Si la cuenta esta activa, enviaremos las instrucciones de recuperacion al correo indicado."
}
```

Este endpoint no devuelve tickets, enlaces, tokens ni contrasenas. Aplica limite simple en memoria por IP y correo para reducir abuso local.

## Endpoint Administrativo

### `POST /api/admin/users`

Requiere un access token cuyo unico rol sea `Administrador`. Acepta JSON con:

```json
{
  "nombreUsuario": "Ana",
  "apellidoUsuario": "Perez",
  "rutUsuario": "12.345.678-9",
  "correoUsuario": "correo.controlado@example.cl",
  "rolUsuario": "Ventas"
}
```

Los roles permitidos son `Administrador`, `Gerencia`, `Producción`, `Ventas` y `Cobranzas`. El backend valida duplicados internos, crea la cuenta Auth0, le asigna el rol RBAC existente, registra la entidad interna `Usuario` y solicita el correo de establecimiento de contrasena; nunca recibe ni retorna una contrasena.

La contrasena no forma parte del cuerpo aceptado. Auth0 la gestiona mediante el correo de establecimiento/cambio de contrasena.

Respuesta exitosa:

```json
{
  "idUsuario": 1,
  "idUsuarioAutenticacionExterna": "auth0|abc123",
  "nombreUsuario": "Ana",
  "apellidoUsuario": "Perez",
  "rutUsuario": "12.345.678-9",
  "correoUsuario": "correo.controlado@example.cl",
  "rolUsuario": "Ventas",
  "rutaFirma": "itecsa-app\\data\\Firmas\\firma-123.pdf",
  "passwordSetupEmailRequested": true
}
```

Respuestas:

- `201`: usuario creado, con `passwordSetupEmailRequested: true` si se solicito el correo.
- `201` recuperable: cuenta Auth0 creada pero fallo la asignacion de rol, el registro interno o la solicitud de correo; no debe repetirse la creacion.
- `400`: cuerpo invalido, firma ausente, tipo de firma no permitido, rol no permitido o campos adicionales.
- `401`: access token ausente o invalido.
- `403`: usuario autenticado sin rol `Administrador`.
- `409`: correo ya existente en Auth0 o en la tabla interna `Usuario`.
- `500`: error controlado anterior a la creacion, sin detalles Auth0.

### `GET /api/admin/users`

Requiere un access token cuyo unico rol sea `Administrador`. Lista usuarios desde la tabla interna `Usuario`, con filtros opcionales `page`, `perPage`, `search`, `estadoUsuario` y `rolUsuario`.

Respuesta exitosa:

```json
{
  "usuarios": [
    {
      "idUsuario": 1,
      "idUsuarioAutenticacionExterna": "auth0|abc123",
      "nombreUsuario": "Ana",
      "apellidoUsuario": "Perez",
      "rutUsuario": "12.345.678-9",
      "correoUsuario": "correo.controlado@example.cl",
      "rolUsuario": "Ventas",
      "estadoUsuario": "Activo",
      "rutaFirma": "itecsa-app\\data\\Firmas\\firma-123.pdf"
    }
  ],
  "total": 1,
  "page": 1,
  "perPage": 10
}
```

### `GET /api/admin/users/summary`

Requiere rol `Administrador`. Devuelve contadores internos de usuarios totales, vinculados y desvinculados.

### `PATCH /api/admin/users/:userId`

Requiere rol `Administrador`. Actualiza datos editables del usuario en Auth0 y en la tabla interna `Usuario`. Acepta JSON con `nombreUsuario`, `apellidoUsuario`, `correoUsuario`, `rolUsuario` y `estadoUsuario`; no acepta firma ni campos legacy como `primerNombre` o `apellidoPaterno`.

### `PATCH /api/admin/users/:userId/status`

Requiere rol `Administrador`. Actualiza solo `estadoUsuario`, usado por la SPA para desvincular usuarios.

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
  -d '{"nombreUsuario":"Ana","apellidoUsuario":"Perez","rutUsuario":"12.345.678-9","correoUsuario":"correo.controlado@example.cl","rolUsuario":"Ventas"}'
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

Solicitud publica de recuperacion con un correo controlado:

```bash
curl -i -X POST http://localhost:3000/api/auth/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"email":"correo.controlado@example.cl"}'
```

Probar con tres casos controlados: correo inexistente, usuario `Desvinculado` y usuario `Activo`. Solo el usuario `Activo` debe disparar correo Auth0.

No registrar tokens reales, contrasenas ni datos personales en archivos o documentacion.

Antes de abrir una solicitud de cambios, ejecutar al menos:

```bash
npm test
```

Consulta el flujo completo en [docs/ARQUITECTURA.md](../docs/ARQUITECTURA.md).

## Endpoints De Pedidos, Pagos Y Kanban

Estos endpoints usan datos reales desde MySQL/Aiven mediante Prisma. Todos requieren access token Auth0 valido, salvo las rutas publicas indicadas en autenticacion y documentos.

### `GET /api/orders` y `GET /api/orders/kanban`

Devuelven pedidos con cliente, productos agregados, estado Kanban, estado de pago y Nota de Venta. `GET /api/orders/kanban` monta el mismo controlador para compatibilidad.

Campos relevantes de respuesta:

```json
{
  "id_pedido": 1,
  "nombre_cliente": "Cliente",
  "rut_cliente": "12.345.678-9",
  "nombre_producto": "Lanyards",
  "cantidad": 100,
  "id_etapa_general": 1,
  "nombre_etapa_general": "Listo para produccion",
  "id_estado_pago": 2,
  "estado_pago": "Confirmado",
  "ruta_pdf": "/api/documents/nvs/Pedido1.pdf",
  "numero_nota_venta": "Pedido1"
}
```

### `GET /api/orders/:orderId`

Devuelve un pedido real por ID. Responde `404` si no existe.

### `POST /api/orders`

Crea un pedido real con cliente y detalles de producto. La pantalla frontend `/ordenes/nuevo` no consume este contrato todavia.

Payload JSON esperado:

```json
{
  "rut_cliente": "12.345.678-9",
  "nombre_cliente": "Cliente",
  "razon_social": "Cliente SpA",
  "estado_cliente": "Activo",
  "id_usuario": 1,
  "id_etiqueta": null,
  "productos": [
    {
      "nombre_producto": "Lanyards",
      "cantidad": 100,
      "fecha_estimada_termino": "2026-06-30"
    }
  ]
}
```

`productos[]` debe contener al menos un producto con `nombre_producto` y `cantidad`. El backend crea o reutiliza el cliente por RUT, crea el pedido, resuelve el tipo de producto por nombre y crea los detalles dentro de una transaccion.

### `GET /api/payment-status`

Lista estados reales de pago. IDs usados por la base actual:

- `1`: `Pendiente`
- `2`: `Confirmado`
- `3`: `Rechazado`

### `PATCH /api/orders/:orderId/payment-status`

Requiere permiso `update:payment-status`.

```json
{
  "paymentStatusId": 2,
  "observacion": "Cambio de estado a Confirmado desde modulo de pagos."
}
```

El backend resuelve `Registro_Pago.id_usuario` desde `req.auth.payload.sub` contra `Usuario.id_auth0`; el frontend no debe enviar `id_usuario`.

- Si queda `Confirmado`, registra auditoria y mueve la orden a `Listo para produccion`.
- Si queda `Pendiente` o `Rechazado`, registra auditoria y devuelve la orden a `Confirmacion de pago`.
- Si el pago ya estaba `Confirmado`, no permite devolverlo a `Pendiente` ni `Rechazado`.
- Sin permiso `update:payment-status`, responde `403`.

### `GET /api/orders/:orderId/payment-records`

Lista registros de auditoria de pago asociados al pedido.

### `PATCH /api/orders/:orderId/move`

Mueve un pedido entre etapas Kanban.

```json
{
  "generalStepId": 1
}
```

Etapas reales por `orden_kanban`: `0` Confirmacion de pago, `1` Listo para produccion, `2` En produccion y `3` Listo para entrega.

- No permite retroceder etapas.
- No permite saltar etapas.
- No permite avanzar si el pago no esta `Confirmado`.
- Para mover a `En produccion`, exige permiso `move:kanban-to-production`.

Si se intenta mover un pedido con pago distinto de `Confirmado`, responde `409`:

```json
{
  "message": "Pedido en espera de confirmacion de pago"
}
```

Los permisos de cada rol se administran en Auth0 RBAC. Para probar cambios de permisos, cerrar sesion y volver a iniciar sesion con usuarios controlados para emitir access tokens nuevos.

## Otros Endpoints De Negocio

- `GET /api/order-status` y `POST /api/order-status`: estados Kanban.
- `GET /api/orders/:orderId/details`, `GET /api/orders/:orderId/details/:detailId` y `POST /api/orders/:orderId/details`: detalles de pedido.
- `GET /api/clients/:clientId`, `GET /api/clients/rut/:rutCliente` y `POST /api/clients`: clientes.
- `GET /api/products`, `GET /api/products/:productTypeId`, `GET /api/products/name/:nombreProducto` y `POST /api/products`: tipos de producto.
- `GET /api/documents/nvs/:filename`: PDF de Nota de Venta local, publico para renderizar documentos; rechaza path traversal y archivos no PDF.
