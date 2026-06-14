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
- [Trazabilidad Incremento 1](docs/TRAZABILIDAD_INCREMENTO_1.md)
- [Convenciones UI Frontend](docs/CONVENCIONES_UI_FRONTEND.md)

## Requisitos

- Node.js `20.19+`, `22.12+` o `>=24`, y npm. Prisma 7 y Vite 8 requieren esos rangos de Node.js.
- Una SPA y una API configuradas en Auth0 para desarrollo local.
- Una base MySQL/Aiven accesible desde el backend, con certificado CA local para SSL.
- Variables de entorno locales basadas en las plantillas `env.example`.

## Ejecucion Local

Frontend:

```bash
cd capaVista
npm install
npm run dev
```

Comandos frontend disponibles:

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

Backend:

```bash
cd capaServidor
npm install
npm start
```

Comandos backend disponibles:

```bash
npm start
npm run dev
npm test
npm run prisma:pull
npm run prisma:generate
npm run prisma:validate
npm run prisma:studio
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
- El link de recuperacion en Classic Universal Login apunta a la ruta publica propia `/recuperar-contrasena`.
- La SPA muestra un mensaje controlado cuando Auth0 rechaza el login por cuenta bloqueada/desvinculada.
- La API expone `GET /api/auth/verify`, protegido por bearer access token Auth0.
- La API expone `POST /api/auth/password-reset/request`, publico, para validar el estado interno del correo antes de solicitar a Auth0 el correo de cambio de contrasena.
- La validacion backend comprueba issuer y audience configurados.
- La SPA consume `GET /api/auth/verify` mediante `authApi.verify()` para restaurar sesion, rol y permisos visuales.
- La API proyecta un unico rol RBAC emitido en el claim `https://itecsa.local/roles` a `rolUsuario`.
- Los permisos visuales provienen del claim estandar `permissions` emitido por Auth0 para `ITECSA API`.
- La creacion administrativa de usuarios se realiza desde el backend mediante Auth0 Management API; el frontend solo llama endpoints propios protegidos.
- La entidad interna `Usuario` se persiste en MySQL mediante Prisma. Los endpoints backend de pedidos/Kanban usan datos mock/en memoria; el backend expone reglas RF32 para estado de pago y movimiento Kanban. La vista de pagos conserva datos locales/mock y no consume todavia el endpoint backend de cambio de estado.

Recursos Auth0 esperados/configurados para esta rama:

- SPA: `ITECSA Frontend Local`.
- API: `ITECSA API`, audience `https://api.itecsa.local`.
- API `ITECSA API`: scopes declarados `view:main-navigation`, `view:kanban-module`, `view:payments-module`, `view:own-profile`, `view:orders-module`, `create:users-visually`, `manage:users-visually` y `update:payment-status`.
- M2M backend: `ITECSA Backend Management`, con token Management validado para `create:users`, `read:roles`, `read:users` y `update:users`.
- Action Post Login: `ITECSA Add Claims`.
- Conexion Database: `Username-Password-Authentication`.
- Roles permitidos: `Administrador`, `Gerencia`, `Producción`, `Ventas` y `Cobranzas`.

La autorizacion de roles se basa en Auth0 RBAC. Si una cuenta heredada contiene `app_metadata.rolUsuario`, ese dato es auxiliar y no reemplaza los roles RBAC ni debe usarse como fuente de autorizacion.

El tenant usa Classic Universal Login con template personalizado. En desarrollo, el template debe mantener `forgotPasswordLink` apuntando a `http://localhost:5173/recuperar-contrasena`; en produccion debe cambiarse al dominio HTTPS de la SPA. Los usuarios desvinculados se sincronizan como `blocked` en Auth0 y no deben recibir correos de recuperacion desde el flujo publico.

## Restricciones Vigentes

- No persistir contrasenas, tokens, tickets ni enlaces de recuperacion.
- No usar Prisma/MySQL todavia para pedidos, pagos ni Kanban real. Pedidos/Kanban se resuelven con datos backend mock/en memoria; pagos tiene regla backend protegida para estado de pago, pero la pantalla actual sigue usando datos locales/mock.
- No exponer credenciales Auth0 Management en frontend.
- No incluir secretos reales ni tokens en documentacion o plantillas.
- ITECSA no recibe, almacena ni persiste contrasenas: Universal Login y los correos de establecimiento/cambio de contrasena pertenecen a Auth0.
