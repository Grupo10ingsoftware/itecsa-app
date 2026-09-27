# ITECSA

Aplicacion web para apoyar procesos internos de ITECSA. Integra una SPA React con Auth0, una API Express protegida por access tokens y persistencia MySQL/Aiven mediante Prisma.

## Estructura

- `capaVista/`: SPA React + Vite, con Universal Login/Logout de Auth0.
- `capaServidor/`: API Express, con validacion JWT y endpoint de verificacion de sesion.
- `docs/`: documentacion tecnica transversal.
- `data/`: archivos locales de desarrollo usados por flujos documentales del backend.

Documentacion especifica:

- [Frontend](capaVista/README.md)
- [Backend](capaServidor/README.md)
- [Arquitectura](docs/ARQUITECTURA.md)
- [Docker, Northflank y entrega al cliente](docs/DOCKER_DESPLIEGUE.md)
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
npm run prisma:migrate:dev
npm run prisma:migrate:status
npm run prisma:studio
```

El frontend usa `http://localhost:5173` y el backend usa `http://localhost:3000` con las plantillas actuales.
`prisma:migrate:dev` esta disponible por `package.json`, pero no debe ejecutarse sobre la base existente sin una decision explicita de migraciones.

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
- La entidad interna `Usuario`, pedidos, clientes, detalles, productos, estados de pago, registros de pago y reglas Kanban se resuelven desde MySQL/Aiven mediante Prisma y el adaptador MariaDB.
- La vista `/pagos` consume backend real para listar pedidos, consultar estados de pago, cambiar estado con PIN y revisar una vista previa de datos del pedido.
- Kanban consume pedidos y estados reales desde backend, mueve etapas mediante `PATCH /api/orders/:orderId/move` y exige `move:kanban-to-production` para pasar a `En produccion`.
- La pantalla `/ordenes/nuevo` consulta notas de venta mediante la API y registra pedidos con `POST /api/orders`; la fuente de notas sigue siendo un fixture local.
- Orders valida y recupera la fuente en servidor, registra historial inicial y conserva snapshots comerciales de las líneas. Antes de desplegar estos cambios debe aplicarse el [procedimiento de migración pendiente](docs/ORDERS_MIGRACION.md); el DDL está preparado, no ejecutado. [Contrato y pruebas](capaVista/src/modules/orders/README.md).

Recursos Auth0 esperados/configurados para esta rama:

- SPA: `ITECSA Frontend Local`.
- API: `ITECSA API`, audience `https://api.itecsa.local`.
- API `ITECSA API`: audience `https://api.itecsa.local`, firma `RS256` y RBAC con permisos en el access token. Catálogo y asignaciones: [matriz vigente](docs/auth0/RBAC-PERMISOS-POR-ROL.md), generada desde `shared/authorization.js`.
- M2M backend: `ITECSA Backend Management`, con token Management validado para `create:users`, `read:roles`, `read:users` y `update:users`.
- Action Post Login: `ITECSA Add Claims`.
- Conexion Database: `Username-Password-Authentication`.
- Roles permitidos: `Administrador Produccion`, `Soporte`, `Gerencia`, `Operario Produccion`, `Operario Ventas` y `Operario Cobranzas`.

La autorizacion de roles se basa en Auth0 RBAC. Si una cuenta heredada contiene `app_metadata.rolUsuario`, ese dato es auxiliar y no reemplaza los roles RBAC ni debe usarse como fuente de autorizacion.

El tenant usa Classic Universal Login con template personalizado. En desarrollo, el template debe mantener `forgotPasswordLink` apuntando a `http://localhost:5173/recuperar-contrasena`; en produccion debe cambiarse al dominio HTTPS de la SPA. Los usuarios desvinculados se sincronizan como `blocked` en Auth0 y no deben recibir correos de recuperacion desde el flujo publico.

## Restricciones Vigentes

- No persistir contrasenas, tokens, tickets ni enlaces de recuperacion.
- No ejecutar migraciones destructivas, `prisma migrate dev`, `prisma migrate reset` ni `prisma db push` contra la base existente sin una decision explicita del equipo.
- `/ordenes/nuevo` ya llama a `POST /api/orders`, pero la fuente de Nota de Venta es un fixture. No usarlo como alta real hasta integrar Manager y conciliar/aplicar la migracion de Orders segun [el procedimiento](docs/ORDERS_MIGRACION.md). El flujo documental de archivos no forma parte del alta vigente.
- No exponer credenciales Auth0 Management en frontend.
- No incluir secretos reales ni tokens en documentacion o plantillas.
- ITECSA no recibe, almacena ni persiste contrasenas: Universal Login y los correos de establecimiento/cambio de contrasena pertenecen a Auth0.

### Despliegue del renombre de roles

Los nombres oficiales son `Administrador Produccion`, `Operario Produccion`,
`Operario Ventas`, `Operario Cobranzas`, `Gerencia` y `Soporte`. Soporte conserva
los accesos administrativos del equipo de desarrollo. No se incorporan todavía
`Administración Cobranzas` ni `Administrador Ventas`.

Antes de desplegar, coordinar el renombre de los cuatro roles existentes en Auth0,
conservando sus permisos y asignaciones. Este cambio de código no modifica Auth0.
Aplicar durante el despliegue la migración
`capaServidor/prisma/migrations/20260905120000_rename_existing_roles/migration.sql`
para actualizar los nombres almacenados en `Usuario.rol_usuario`.
Después, renovar los tokens de sesión: los nombres anteriores se rechazan sin alias
de compatibilidad. `rolUsuario` devuelve el nuevo nombre e `isAdministrador` sigue
identificando exclusivamente a `Administrador Produccion`.

El valor oficial del administrador en Auth0, API y base de datos es
`Administrador Produccion` (sin tilde). La interfaz muestra la etiqueta
`Administrador Producción` mediante `getRoleLabel`; nunca envía esa etiqueta
como valor del rol. `Operario Produccion` también usa un valor oficial sin tilde y se muestra como
`Operario Producción` mediante la misma función.

Después de la migración de renombre, aplicar la migración adicional
`capaServidor/prisma/migrations/20260905130000_normalize_administrator_role_value/migration.sql`.
Convierte tanto `Administrador` como `Administrador Producción` al valor sin tilde,
incluso si el primer renombre ya se aplicó. Estas migraciones se preparan en el
repositorio y no se ejecutan automáticamente al iniciar la aplicación.

Aplicar luego
`capaServidor/prisma/migrations/20260905140000_normalize_production_operator_role_value/migration.sql`
para convertir `Producción` y `Operario Producción` a `Operario Produccion`.
El rol en Auth0 debe coincidir exactamente con el valor sin tilde; renovar los
tokens tras el cambio. La etiqueta con tilde no se acepta como valor de API.
