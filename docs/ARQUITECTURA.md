# Arquitectura - ITECSA

## Vision General

ITECSA utiliza una SPA React para la experiencia de usuario y una API Express para validar autenticacion, rol y permisos. Auth0 autentica al usuario, administra las contrasenas y emite access tokens destinados a la API ITECSA. La API persiste datos de negocio en MySQL/Aiven mediante Prisma y el adaptador MariaDB.

```mermaid
flowchart LR
    SPA["SPA React (capaVista)"] -->|"Universal Login"| AUTH0["Auth0"]
    AUTH0 -->|"Forgot password custom link"| RESET_PAGE["/recuperar-contrasena"]
    RESET_PAGE -->|"POST /api/auth/password-reset/request"| API
    AUTH0 -->|"Access token audience https://api.itecsa.local"| SPA
    SPA -->|"Bearer access token"| API["API Express (capaServidor)"]
    API --> JWT["checkJwt"]
    JWT --> VERIFY["GET /api/auth/verify"]
    VERIFY --> SPA_PERMS["rolUsuario + permissions"]
    SPA_PERMS --> GUARDS["ProtectedRoute / RoleGuard / hasPermission"]
```

## Recursos Auth0

- SPA: `ITECSA Frontend Local`.
- API: `ITECSA API`, con audience `https://api.itecsa.local`.
- API `ITECSA API`: scopes declarados `view:main-navigation`, `view:kanban-module`, `view:payments-module`, `view:own-profile`, `view:orders-module`, `create:users-visually`, `manage:users-visually`, `update:payment-status` y `move:kanban-to-production`.
- M2M backend: `ITECSA Backend Management`, usada solo por Express para Auth0 Management API con token validado para `create:users`, `read:roles`, `read:users` y `update:users`.
- Action Post Login: `ITECSA Add Claims`.
- Conexion Database: `Username-Password-Authentication`.
- Roles permitidos: `Administrador`, `Gerencia`, `Producción`, `Ventas` y `Cobranzas`.

No se documentan secretos reales. Los `client_id` son identificadores publicos; el secret M2M queda fuera del repositorio y no se expone al frontend.

El tenant usa Classic Universal Login con template personalizado gratuito. El template mantiene `allowSignUp: false`, limita la conexion a `Username-Password-Authentication` y reemplaza el link nativo de recuperacion por `/recuperar-contrasena` en la SPA. Los mensajes de Lock para `unauthorized`, `lock.unauthorized`, `blocked_user` y `too_many_attempts` se personalizan para evitar una experiencia ambigua en cuentas bloqueadas.

## Flujo De Autenticacion

1. `Auth0Provider` configura la SPA con dominio, client ID, audience de la API y URL de retorno.
2. El usuario inicia sesion mediante Universal Login; la SPA no captura ni persiste contrasenas.
3. Auth0 emite un access token destinado a `https://api.itecsa.local`.
4. La Action Post Login agrega claims namespaced al access token:
   - `https://itecsa.local/roles`: roles oficiales obtenidos desde Auth0 RBAC.
   - `https://itecsa.local/email`: correo provisto por Auth0 para identificar la sesion en la respuesta de verificacion.
5. Auth0 agrega el claim estandar `permissions` cuando RBAC y `Add Permissions in the Access Token` estan activos para `ITECSA API`.
6. La SPA llama `GET /api/auth/verify` mediante `authApi.verify()` y bearer token Auth0.
7. El backend valida issuer, audience, email, rol unico permitido y formato de permisos.
8. La API devuelve `rolUsuario`, `isAdministrador` y `permissions` para que la SPA controle navegacion y experiencia visual.

Si Auth0 rechaza el inicio de sesion por cuenta `blocked`, la SPA conserva el error del SDK Auth0 React, no relanza automaticamente `loginWithRedirect()` y muestra el mensaje de cuenta desactivada. Esto evita un bucle visual de retorno al Universal Login.

## Recuperacion Publica De Contrasena

El usuario inicia la recuperacion desde el link personalizado de Classic Universal Login hacia `/recuperar-contrasena`. La SPA no consulta Auth0 directamente; envia el correo al backend mediante `POST /api/auth/password-reset/request`.

El backend aplica estas reglas:

- Si el correo no existe en la tabla interna `Usuario`, responde el mensaje de cuenta no encontrada y no llama Auth0.
- Si el usuario existe pero su `estadoUsuario` no es `Activo`, responde el mensaje de cuenta desactivada y no llama Auth0.
- Si el usuario existe y esta `Activo`, solicita a Auth0 el correo de cambio de contrasena mediante `/dbconnections/change_password`.

El flujo nunca retorna tickets, enlaces, tokens ni contrasenas a la SPA. La distincion de mensajes entre cuenta inexistente y desactivada es una decision funcional del sistema y debe mantenerse con rate limiting, logs y monitoreo para reducir enumeracion abusiva.

## Autorizacion

- La fuente vigente de roles es Auth0 RBAC.
- El backend no confia en roles calculados por el frontend.
- La API recibe un arreglo en `https://itecsa.local/roles` y acepta exactamente un rol oficial.
- `rolUsuario` es la proyeccion singular que la API devuelve a partir del unico rol valido.
- Cualquier `app_metadata.rolUsuario` heredado en usuarios existentes es auxiliar y no reemplaza RBAC ni debe usarse como fuente de autorizacion.
- `ProtectedRoute`, `RoleGuard`, `hasPermission(...)` y `/access-denied` son controles de experiencia visual.
- Toda accion sensible debe validarse en backend con `checkJwt` y un middleware o regla de autorizacion propia.

Flujo de permisos visuales:

```mermaid
flowchart LR
    RBAC["Auth0 RBAC"] --> API_PERMS["Permisos en ITECSA API"]
    API_PERMS --> TOKEN["Access token permissions"]
    TOKEN --> VERIFY["GET /api/auth/verify"]
    VERIFY --> AUTH_PROVIDER["AuthProvider"]
    AUTH_PROVIDER --> HAS_PERMISSION["hasPermission(...)"]
    HAS_PERMISSION --> UI["Rutas y acciones visuales"]
```

## Creacion Administrativa De Usuarios

Los endpoints bajo `/api/admin/users` estan protegidos con `checkJwt` y rol `Administrador`. La creacion acepta JSON con nombre, apellido, RUT, correo y rol. No recibe contrasenas.

El backend usa `ITECSA Backend Management` para:

- Obtener un token M2M solo en servidor.
- Resolver el rol Auth0 RBAC existente.
- Crear el usuario en `Username-Password-Authentication`.
- Asignar el rol RBAC al usuario.
- Registrar la entidad interna `Usuario` con datos personales de negocio.
- Solicitar el correo de establecimiento/cambio de contrasena mediante Auth0.

La contrasena temporal generada para la creacion Database existe solo en memoria durante la llamada a Auth0. ITECSA no recibe, almacena ni persiste contrasenas, tickets ni enlaces de cambio de contrasena.

La gestion administrativa usa la tabla interna `Usuario` para listar, resumir, editar y desvincular usuarios. Las ediciones de correo, rol y estado se sincronizan con Auth0 Management API, mientras nombre, apellido y RUT siguen siendo datos internos de negocio.

## Persistencia Y Modulos De Negocio

El backend usa Prisma con `@prisma/adapter-mariadb` para conectar a MySQL/Aiven. Los repositorios de usuarios, pedidos, clientes, productos, estados de pedido, estados de pago, detalles, registros de pago y documentos consultan o actualizan la base real cuando el endpoint correspondiente se ejecuta.

Estado funcional actual:

- `/pagos` consume `GET /api/orders`, `GET /api/payment-status` y `PATCH /api/orders/:orderId/payment-status`.
- Al confirmar un pago, el backend resuelve `Registro_Pago.id_usuario` desde `req.auth.payload.sub`, registra auditoria y mueve el pedido a `Listo para produccion`.
- Un pago ya confirmado no puede devolverse a `Pendiente` ni `Rechazado`; el backend responde conflicto y no genera auditoria nueva.
- Kanban consume `GET /api/orders` y `GET /api/order-status`, mueve etapas con `PATCH /api/orders/:orderId/move`, bloquea saltos o retrocesos y exige `move:kanban-to-production` para mover a `En produccion`.
- El backend expone `POST /api/orders` para crear pedidos JSON con cliente y productos, pero la pantalla frontend `/ordenes/nuevo` sigue siendo visual/mock y guarda una copia temporal en `sessionStorage`.
- `data/NVS` es almacenamiento local de desarrollo para PDFs de Nota de Venta; no debe contener documentos reales ni datos sensibles.

## Variables De Entorno

Frontend:

```dotenv
VITE_AUTH0_DOMAIN=<tenant-auth0>
VITE_AUTH0_CLIENT_ID=<client-id-spa>
VITE_AUTH0_AUDIENCE=https://api.itecsa.local
VITE_API_BASE_URL=http://localhost:3000/api
```

Backend:

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

El frontend solo usa variables `VITE_*`, que son visibles en navegador. Ninguna credencial Auth0 Management debe agregarse a `capaVista`.
Las variables `DB_*` alimentan el adaptador Prisma MariaDB usado en runtime; `DATABASE_URL` se usa por Prisma CLI para introspeccion, validacion y generacion.

## Limites Vigentes

- Prisma y MySQL/Aiven estan integrados en `capaServidor` para la entidad interna `Usuario` y para modulos de pedidos, pagos, clientes, productos, estados, detalles y documentos.
- No se persisten contrasenas. RUT y ruta de firma se persisten en la entidad interna `Usuario`.
- No se documentan tokens, contrasenas, correos reales ni secrets.
- La matriz rol-permiso funcional vive en Auth0 RBAC; si se agrega una nueva vista, se debe crear el permiso en `ITECSA API`, asignarlo al rol correspondiente y consumirlo desde `hasPermission(...)`.
- La pantalla `/ordenes/nuevo` no crea pedidos reales todavia; conserva mocks y `sessionStorage` hasta que exista contrato aprobado para Nota de Venta y archivos.
- No ejecutar `prisma migrate dev`, `prisma migrate reset` ni `prisma db push` sobre la base existente sin una decision explicita de migraciones.

Para ejecutar cada capa, consultar [README raiz](../README.md), [README frontend](../capaVista/README.md) y [README backend](../capaServidor/README.md).
