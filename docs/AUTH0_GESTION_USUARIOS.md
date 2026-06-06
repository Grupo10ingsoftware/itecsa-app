# Auth0 - Checklist De Gestion De Usuarios

Este registro resume la configuracion oficial necesaria para autenticar la SPA y gestionar usuarios desde Express sin exponer credenciales Auth0 Management en el navegador.

## 1. Aplicacion SPA

- Tipo: Single Page Application.
- Allowed Callback URLs: `http://localhost:5173`.
- Allowed Logout URLs: `http://localhost:5173`.
- Allowed Web Origins: `http://localhost:5173`.
- La SPA configura `Auth0Provider` con dominio, client ID, `redirect_uri` y audience `https://api.itecsa.local`.
- `getAccessTokenSilently` solicita un access token para la API ITECSA, no para Auth0 Management API.

## 2. API ITECSA

- Audience: `https://api.itecsa.local`.
- Firma esperada: RS256.
- RBAC habilitado.
- `Add Permissions in the Access Token` habilitado cuando la interfaz use el claim `permissions`.
- Express valida issuer y audience mediante `express-oauth2-jwt-bearer`.

## 3. Aplicacion M2M

`ITECSA Backend Management` debe estar autorizada para Auth0 Management API con:

- `read:users`: listar y consultar usuarios.
- `create:users`: crear usuarios Database.
- `update:users`: actualizar, bloquear y asignar o retirar roles.
- `read:roles`: resolver roles y consultar roles de usuarios.

El backend obtiene el token con Client Credentials usando como audience:

```text
https://<AUTH0_DOMAIN>/api/v2/
```

`AUTH0_MANAGEMENT_CLIENT_SECRET` es obligatorio, vive solo en `capaServidor/.env` y nunca debe agregarse a variables `VITE_*`, codigo, documentacion o Git.

## 4. Claims Y Roles

- La Action Post Login agrega `https://itecsa.local/roles`.
- La Action Post Login agrega `https://itecsa.local/email`.
- Los roles permitidos son `Administrador`, `Gerencia`, `Operario`, `Ventas` y `Cobranzas`.
- Los endpoints `/api/admin/users` exigen exactamente el rol `Administrador`.
- `app_metadata.rolUsuario` es auxiliar; Auth0 RBAC sigue siendo la fuente de autorizacion.
- La creacion administrativa valida el RUT chileno y lo persiste en `user_metadata.rut`.

## 5. Flujo Del Listado

1. La SPA obtiene un token para `https://api.itecsa.local`.
2. La SPA llama `GET /api/admin/users`.
3. Express valida el JWT y el rol `Administrador`.
4. Express obtiene un token M2M para Auth0 Management API.
5. Express llama `GET /api/v2/users` con `include_totals=true`.
6. Express consulta los roles de cada usuario y normaliza la respuesta.
7. La SPA recibe `usuarios`, `total`, `page` y `perPage`.

## 6. Diagnostico

| Sintoma | Causa probable | Revision |
| --- | --- | --- |
| Backend no inicia | Falta una variable obligatoria | Completar `AUTH0_MANAGEMENT_CLIENT_SECRET` en `capaServidor/.env` |
| `401` desde API ITECSA | Token ausente, expirado, issuer o audience incorrectos | Comparar `VITE_AUTH0_AUDIENCE` con `AUTH0_AUDIENCE` |
| `403` desde API ITECSA | El usuario no tiene exactamente el rol `Administrador` | Revisar RBAC y el claim namespaced |
| `AUTH0_INSUFFICIENT_SCOPE` | La M2M no tiene todos los scopes | Autorizar `read:users`, `create:users`, `update:users`, `read:roles` |
| Error de red | Backend detenido o base URL incorrecta | Verificar puerto `3000` y `VITE_API_BASE_URL=http://localhost:3000/api` |

## Fuentes Oficiales

- Auth0 React SDK: https://github.com/auth0/auth0-react
- Llamadas a APIs protegidas: https://github.com/auth0/auth0-react/blob/main/EXAMPLES.md
- Auth0 Management API - usuarios: https://auth0.com/docs/manage-users/user-search
- Auth0 Management API - roles: https://auth0.com/docs/manage-users/access-control/configure-core-rbac/rbac-users/assign-roles-to-users
