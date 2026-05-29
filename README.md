# ITECSA

Aplicacion web para apoyar procesos internos de ITECSA. Esta rama incorpora autenticacion inicial con Auth0 en una SPA React y validacion de access tokens en una API Express.

## Estructura

- `capaVista/`: SPA React + Vite, con Universal Login/Logout de Auth0.
- `capaServidor/`: API Express, con validacion JWT y endpoint de verificacion de sesion.
- `docs/`: documentacion tecnica transversal.
- `Mockups/`: material de referencia visual del proyecto.

Documentacion especifica:

- [Frontend](capaVista/README.md)
- [Backend](capaServidor/README.md)
- [Arquitectura](docs/ARQUITECTURA.md)
- [Convenciones UI Frontend](docs/CONVENCIONES_UI_FRONTEND.md)

## Requisitos

- Node.js y npm.
- Una SPA y una API configuradas en Auth0 para desarrollo local.
- Variables de entorno locales basadas en las plantillas `env.example`.

## Ejecucion Local

Frontend:

```bash
cd capaVista
npm install
npm run dev
```

Backend:

```bash
cd capaServidor
npm install
npm start
```

El frontend usa `http://localhost:5173` y el backend usa `http://localhost:3000` con las plantillas actuales.

## Configuracion

- Copiar `capaVista/env.example` a un archivo `.env` local de la SPA y ajustar los identificadores publicos de Auth0 cuando corresponda.
- Copiar `capaServidor/env.example` a un archivo `.env` local del backend.
- No registrar archivos `.env`, client secrets, access tokens ni contrasenas en Git.
- Las variables de Auth0 Management son exclusivas del backend; la SPA nunca debe recibir esas credenciales.
- Los `client_id` de Auth0 son identificadores publicos. El `AUTH0_MANAGEMENT_CLIENT_SECRET` no debe documentarse ni versionarse.

## Estado Actual De Auth0

- La SPA inicia y cierra sesion mediante Auth0 Universal Login/Logout.
- La API expone `GET /api/auth/verify`, protegido por bearer access token Auth0.
- La validacion backend comprueba issuer y audience configurados.
- La SPA consume `GET /api/auth/verify` mediante `authApi.verify()` para restaurar sesion, rol y permisos visuales.
- La API proyecta un unico rol RBAC emitido en el claim `https://itecsa.local/roles` a `rolUsuario`.
- Los permisos visuales provienen del claim estandar `permissions` emitido por Auth0 para `ITECSA API`.
- La creacion administrativa de usuarios se realiza desde el backend mediante Auth0 Management API; el frontend solo llama endpoints propios protegidos.

Recursos Auth0 esperados/configurados para esta rama:

- SPA: `ITECSA Frontend Local`.
- API: `ITECSA API`, audience `https://api.itecsa.local`.
- M2M backend: `ITECSA Backend Management`.
- Action Post Login: `ITECSA Add Role Claim`.
- Conexion Database: `Username-Password-Authentication`.
- Roles permitidos: `Administrador`, `Gerencia`, `Operario`, `Ventas` y `Cobranzas`.

La autorizacion de roles se basa en Auth0 RBAC. Si una cuenta contiene `app_metadata.rolUsuario`, ese dato es auxiliar y no reemplaza los roles RBAC ni debe usarse como fuente de autorizacion.

## Restricciones Vigentes

- No implementar Prisma ni MySQL en esta integracion inicial.
- No persistir RUT, firma electronica ni contrasenas.
- No exponer credenciales Auth0 Management en frontend.
- No incluir secretos reales ni tokens en documentacion o plantillas.
- ITECSA no recibe, almacena ni persiste contrasenas: Universal Login y los correos de establecimiento/cambio de contrasena pertenecen a Auth0.
