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
```

- `PORT`: puerto HTTP del servidor.
- `FRONTEND_ORIGIN`: unico origen permitido por CORS para la SPA local.
- `AUTH0_DOMAIN`: tenant usado para construir el issuer validado.
- `AUTH0_AUDIENCE`: identificador de la API que debe contener el access token.
- `AUTH0_MANAGEMENT_CLIENT_ID`: identificador de la aplicacion M2M que debe estar autorizada con `create:users`, `read:roles` y `update:users`.
- `AUTH0_MANAGEMENT_CLIENT_SECRET`: secret M2M local; debe mantenerse fuera del repositorio.
- `AUTH0_DATABASE_CONNECTION`: conexion Database donde Auth0 crea usuarios.
- `AUTH0_PASSWORD_RESET_CLIENT_ID`: identificador publico de la SPA habilitada en la conexion Database para solicitar correos de cambio de contrasena.

Ningun secret real debe quedar en el repositorio. Las variables Management son consumidas solo por el backend protegido.

## Servicio Interno Auth0

`src/services/auth0Management.service.js` prepara dos operaciones backend:

- `createAuth0User(...)` obtiene un token M2M, resuelve el rol Auth0 existente, crea un usuario Database con nombre y `app_metadata.rolUsuario`, asigna RBAC y mantiene la contrasena temporal aleatoria solo durante la llamada a Auth0.
- `requestPasswordSetupEmail(...)` solicita a Auth0 el envio del correo de establecimiento/cambio de contrasena mediante `/dbconnections/change_password`.

El servicio no devuelve contrasenas temporales, tokens, tickets ni enlaces de cambio de contrasena. `app_metadata.rolUsuario` acompana la cuenta como metadata; la autorizacion efectiva utiliza el rol Auth0 RBAC asignado y el claim `https://itecsa.local/roles`.

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
  "isAdministrador": true
}
```

Respuestas:

- `200`: token valido con `https://itecsa.local/email` y un unico rol permitido en `https://itecsa.local/roles`.
- `401`: bearer token ausente o invalido.
- `403`: token autenticado sin email requerido, sin rol oficial unico o con multiples roles.

## Endpoint Administrativo

### `POST /api/admin/users`

Requiere un access token cuyo unico rol sea `Administrador`. Acepta solo:

```json
{
  "primerNombre": "Ana",
  "apellidoPaterno": "Perez",
  "correoUsuario": "ana.perez@itecsa.cl",
  "rolUsuario": "Ventas"
}
```

Los roles permitidos son `Administrador`, `Gerencia`, `Operario`, `Ventas` y `Cobranzas`. El backend crea la cuenta Auth0, le asigna el rol RBAC existente y solicita el correo de establecimiento de contrasena; nunca recibe ni retorna una contrasena.

Respuestas:

- `201`: usuario creado, con `passwordSetupEmailRequested: true` si se solicito el correo.
- `201` recuperable: cuenta creada pero fallo la asignacion de rol o la solicitud de correo; no debe repetirse la creacion.
- `400`: cuerpo invalido, rol no permitido o campos adicionales.
- `401`: access token ausente o invalido.
- `403`: usuario autenticado sin rol `Administrador`.
- `409`: correo ya existente en Auth0.
- `500`: error controlado anterior a la creacion, sin detalles Auth0.

## Pruebas Manuales

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
  -d '{"primerNombre":"Ana","apellidoPaterno":"Perez","correoUsuario":"correo.controlado@example.cl","rolUsuario":"Ventas"}'
```

Repetir la misma solicitud permite verificar la respuesta `409`. Los casos recuperables se verifican mediante tests simulados para no causar cuentas o correos no deseados.

No registrar tokens reales, contrasenas ni datos personales en archivos o documentacion.

Consulta el flujo completo en [docs/ARQUITECTURA.md](../docs/ARQUITECTURA.md).
