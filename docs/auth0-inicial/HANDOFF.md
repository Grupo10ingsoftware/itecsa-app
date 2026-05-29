# Handoff Auth0 Inicial - ITECSA

## Rama y objetivo

- Rama: `auth0-inicial`.
- Objetivo futuro: reemplazar la autenticacion simulada de la SPA React por Auth0 e incorporar validacion de autenticacion/autorizacion en Express.
- Este documento registra el estado encontrado en el repositorio y los recursos Auth0 confirmados o configurados durante los pasos autorizados; no confirma implementaciones pendientes.

## Estado inicial encontrado

- El frontend implementa login mock local; no consume Auth0 ni el backend para autenticar.
- La sesion simulada existe solo en memoria React mediante `AuthProvider`; recargar la pagina o cerrar sesion elimina el usuario activo.
- La proteccion de rutas y permisos actuales es visual: redirige o limita componentes, sin autorizacion de servidor.
- La creacion de usuarios es una pantalla de preparacion/preview y no persiste informacion.
- El backend Express valida configuracion Auth0 minima, restringe CORS al origen frontend configurado y expone `GET /api/auth/verify` protegido por JWT Auth0.
- No se encontraron archivos `.env*`, cliente HTTP del frontend ni dependencias Auth0/JWT en las capas auditadas.

## Frontend relevante

- Entry point y providers: `capaVista/src/main.jsx`, `capaVista/src/app/providers/AppProviders.jsx` y `AuthProvider.jsx`.
- Router: `capaVista/src/app/router.jsx` declara `/login`, rutas protegidas y `/admin/usuarios/nuevo`.
- Login: `modules/auth/pages/LoginPage.jsx` y `components/LoginForm.jsx` mantienen el panel ITECSA e inician Auth0 Universal Login mediante `loginWithRedirect`.
- Sesion/logout: `AuthProvider.jsx` conserva la fachada `useAuth()` sobre `@auth0/auth0-react`; `LogoutButton.jsx` ejecuta Universal Logout y retorna al origin local.
- Guards: `ProtectedRoute.jsx` espera Auth0 y la verificacion backend; `RoleGuard.jsx` usa `permissions` reales devueltos por `GET /api/auth/verify` para permisos visuales y `rolUsuario` para acceso administrativo directo.
- Creacion de usuarios: `modules/users/pages/UserCreatePage.jsx` y `components/UserCreateForm.jsx` consumen `POST /api/admin/users`; el formulario envia solo `primerNombre`, `apellidoPaterno`, `correoUsuario` y `rolUsuario`.
- Cliente HTTP frontend: `services/api/apiClient.js` centraliza llamadas al backend con bearer token Auth0; `modules/auth/api/authApi.js` expone `verify()` y `modules/auth/hooks/useAuthApi.js` conecta Auth0 con esa API sin exponer tokens a componentes.

## Backend relevante

- Arranque: `capaServidor/src/app/app.js` carga `dotenv` e instancia `Server`.
- Servidor: `capaServidor/src/server.js` configura `express`, CORS restringido mediante `FRONTEND_ORIGIN`, `express.json()` y archivos estaticos.
- Arranque: `capaServidor/src/app/app.js` exige `AUTH0_DOMAIN`, `AUTH0_AUDIENCE` y `FRONTEND_ORIGIN` antes de iniciar el servidor.
- Rutas y servicios: `GET /api/auth/verify` valida el access token, lee claims namespaced y devuelve identidad/rol; `POST /api/admin/users` usa `checkJwt` y `requireAdministrador` para crear usuarios Auth0, asignar RBAC y solicitar el correo inicial; `src/services/auth0Management.service.js` encapsula las llamadas Auth0.
- Dependencias observadas: `express`, `cors`, `dotenv` y `express-oauth2-jwt-bearer`.
- Manejo de errores: solo captura de fallo durante el arranque; no existe middleware API de errores.

## Mocks de auth encontrados

- `capaVista/src/modules/auth/mocks/authMocks.js` fue eliminado en el paso 18; `AuthProvider` ya no importa ni expone `MOCK_USERS` o `mockUsers`.
- El fixture `capaVista/src/modules/auth/mocks/authCredentials.js` y el acceso rapido administrativo fueron retirados al reemplazar el login visual por Auth0.
- `LoginPage.jsx` ya no solicita ni expone credenciales locales; Universal Login administra la captura de credenciales.
- `UserCreateForm.jsx` muestra RUT, firma electronica y contrasena deshabilitados; no los valida, no los envia y no los persiste.
- No quedan mocks de autenticacion, sesion o autorizacion en el flujo normal del frontend.

## Auth0 relevante

- Tenant confirmado: `itecsa-sistema.us.auth0.com`, identificado mediante la API interna `Auth0 Management API`.
- Aplicaciones visibles: solo se encontro `All Applications`; no se identifico una SPA equivalente a `ITECSA Frontend Local` ni una aplicacion Machine to Machine equivalente a `ITECSA Backend Management`.
- APIs / Resource Servers: solo se encontro `Auth0 Management API`; la busqueda exacta del audience `https://api.itecsa.local` no devolvio resultados.
- Actions al inicio de la integracion: no se encontraron Actions en el tenant; no existia una Action Post Login visible equivalente a `ITECSA Add Role Claim` antes del paso autorizado de configuracion.
- Conexion Database `Username-Password-Authentication`: existencia confirmada mediante revision manual del Dashboard; usa almacenamiento administrado por Auth0 porque `Use my own database` esta desactivado.
- Aplicaciones habilitadas para la conexion Database: ninguna visible en la revision manual.
- Usuarios: la vista de usuarios se encontraba vacia; no existe un usuario bootstrap Administrador visible.
- Roles: la vista de roles se encontraba vacia; no existe un rol `Administrador` visible.
- Recursos reutilizables: la conexion `Username-Password-Authentication` puede reutilizarse para ITECSA; `Auth0 Management API` no reemplaza la API propia esperada.
- Duplicados o conflictos: no se observaron duplicados entre aplicaciones, APIs, Actions, usuarios o roles visibles; crear una segunda conexion Database con el mismo proposito generaria duplicacion innecesaria.
- Auditoria ejecutada exclusivamente en modo lectura mediante MCP y revision manual del Dashboard. No se crearon, modificaron, eliminaron ni rotaron recursos; no se consultaron ni documentaron secretos o datos personales.

## Recursos Auth0 base configurados

- SPA creada: `ITECSA Frontend Local` (`client_id`: `hBE18LPJgcYqI0WpiZxpLgT9sygDHTHm`), tipo `spa`, OIDC conforme y autenticacion del token endpoint `none`.
- URLs configuradas en la SPA: callback `http://localhost:5173`, logout `http://localhost:5173` y web origin `http://localhost:5173`.
- API creada: `ITECSA API` (`id`: `6a1660a4a0a31d800e5d0509`), audience `https://api.itecsa.local`, algoritmo `RS256`; sus scopes funcionales fueron agregados posteriormente para permisos visuales reales.
- Aplicacion M2M creada: `ITECSA Backend Management` (`client_id`: `b3jWfQOqDUVzavdm5CpgE5fUvwK8N5gT`), tipo `non_interactive`, reservada para el backend Express.
- Grant M2M creado hacia `Auth0 Management API`, audience `https://itecsa-sistema.us.auth0.com/api/v2/`, con scope unico `create:users`.
- Conexion Database reutilizada: `Username-Password-Authentication`, previamente confirmada como administrada por Auth0. El MCP disponible no ofrece lectura o configuracion de conexiones; no se creo ni modifico ninguna conexion durante este paso.
- `create:users` permite al backend crear usuarios indicando `Username-Password-Authentication` como conexion; no se crearon usuarios en este paso.
- No se consultaron, guardaron ni documentaron secretos. El secret de la aplicacion M2M debe obtenerse y copiarse manualmente a un entorno local o seguro cuando se implemente el backend.

## Action Post Login configurada

- Action final: `ITECSA Add Role Claim`.
- Trigger: `Post Login` (`post-login`, version `v3`), runtime `node22`, sin dependencias ni secretos.
- Fuente de roles: `event.authorization.roles` provisto por Auth0 Roles.
- Claims emitidos en access token: `https://itecsa.local/roles`, como arreglo de roles permitidos, y `https://itecsa.local/email`, si Auth0 entrega correo para el usuario autenticado.
- Token donde se emiten: access token solamente; no se agregan al ID token en este paso.
- Valores permitidos: `Administrador`, `Gerencia`, `Operario`, `Ventas` y `Cobranzas`.
- Comportamiento: el claim contiene solamente roles asignados que coinciden con valores permitidos; ante ausencia de roles permitidos se omite sin bloquear el login.
- Estado Auth0: la Action fue actualizada y desplegada mediante MCP; la version `3` desplegada fue verificada con `all_changes_deployed: true`.
- Binding Post Login: se enlazo manualmente en Dashboard bajo `Actions > Triggers > Post Login`, confirmado visualmente con una sola instancia de `ITECSA Add Role Claim` entre `Start` y `Complete`, porque el MCP disponible no expone operaciones de bindings.
- Validacion de token pendiente: un login nuevo que solicite `https://api.itecsa.local` debe generar access token con `https://itecsa.local/roles: ["Administrador"]` y `https://itecsa.local/email`; no se documenta el valor real del correo.

## Variables de entorno configuradas

- Frontend: `capaVista/env.example` documenta `VITE_AUTH0_DOMAIN=itecsa-sistema.us.auth0.com`, `VITE_AUTH0_CLIENT_ID=hBE18LPJgcYqI0WpiZxpLgT9sygDHTHm`, `VITE_AUTH0_AUDIENCE=https://api.itecsa.local` y `VITE_API_BASE_URL=http://localhost:3000/api`.
- Backend: `capaServidor/env.example` documenta `PORT=3000`, `FRONTEND_ORIGIN=http://localhost:5173`, `AUTH0_DOMAIN=itecsa-sistema.us.auth0.com`, `AUTH0_AUDIENCE=https://api.itecsa.local`, `AUTH0_MANAGEMENT_CLIENT_ID=b3jWfQOqDUVzavdm5CpgE5fUvwK8N5gT`, `AUTH0_DATABASE_CONNECTION=Username-Password-Authentication` y `AUTH0_PASSWORD_RESET_CLIENT_ID=hBE18LPJgcYqI0WpiZxpLgT9sygDHTHm`.
- Los `client_id` incluidos son identificadores publicos/no secretos confirmados mediante Auth0 MCP; el client secret de Management no fue consultado ni registrado.
- `AUTH0_MANAGEMENT_CLIENT_SECRET` se suministra al backend mediante una variable de usuario de Windows; no se registra su valor en el repositorio, archivos `.env` ni documentacion.
- Los archivos locales `.env*` quedan excluidos de Git mediante el `.gitignore` raiz; las plantillas versionadas de frontend y backend usan el nombre `env.example`.

## Decisiones tecnicas aplicables

- Mantener `useAuth()` como fachada interna durante la migracion; desde el paso 8 expone identidad, carga, error, login y logout del SDK Auth0.
- Mantener `useAuth()` como fachada interna sin exponer usuarios mock; la sesion y permisos visuales provienen de Auth0/backend.
- Montar `Auth0Provider` por fuera de `AuthProvider` y procesar `onRedirectCallback` con rutas locales sanitizadas.
- Tratar `ProtectedRoute` y `RoleGuard` como controles de experiencia visual, nunca como autorizacion efectiva.
- Usar Auth0 RBAC como fuente vigente de roles; el frontend consume la proyeccion backend `rolUsuario` desde `/api/auth/verify` y no claims Auth0 directamente.
- Toda proteccion de endpoints administrativos futura debe validarse en Express con identidad y rol comprobables.
- El frontend no debe consumir Auth0 Management API ni recibir credenciales de administracion.
- El frontend debe obtener access tokens mediante `getAccessTokenSilently` del SDK Auth0, inyectarlos en `apiClient` y no almacenarlos manualmente en `localStorage` ni `sessionStorage`.
- `apiClient` debe tratar `401` como sesion invalida o acceso no autenticado; `403` sigue representando sesion autenticada sin contrato o rol valido para ITECSA.
- Los roles Auth0 existentes no requieren permisos funcionales configurados para el paso de guards; este paso valida nombres de rol RBAC proyectados por backend.
- Validar al arrancar `AUTH0_DOMAIN`, `AUTH0_AUDIENCE` y `FRONTEND_ORIGIN`; restringir CORS al unico origen configurado.
- Mantener `express.json()` y montar `GET /api/auth/verify` bajo `/api/auth` con `checkJwt` de `express-oauth2-jwt-bearer`.
- Validar JWT con issuer `https://${AUTH0_DOMAIN}/` y audience `AUTH0_AUDIENCE`; proyectar el unico rol oficial de `https://itecsa.local/roles` a `rolUsuario`.
- Responder `403` en `/api/auth/verify` si el token autenticado carece de email namespaced, carece de un rol oficial unico o expone mas de un rol.
- Aplicar `requireAdministrador` despues de `checkJwt` en futuros endpoints administrativos; autoriza solo el claim `https://itecsa.local/roles` exactamente igual a `["Administrador"]` y responde `403` para cualquier otro usuario autenticado.
- Crear usuarios solo desde el servicio backend interno con token M2M y scopes `create:users`, `read:roles` y `update:users`; la contrasena temporal aleatoria existe solo en memoria durante la solicitud Database y no se devuelve ni registra.
- Solicitar el correo de establecimiento/cambio de contrasena con `/dbconnections/change_password` y el client ID publico de la SPA; no generar ni retornar tickets o enlaces sensibles.
- `app_metadata.rolUsuario` se envia al crear usuarios por contrato de datos, pero no reemplaza Auth0 Roles/RBAC; el endpoint resuelve y asigna el rol RBAC existente antes de solicitar correo.
- `POST /api/admin/users` autoriza actualmente mediante el rol Auth0 `Administrador` emitido en `https://itecsa.local/roles`; no exige permisos funcionales de `ITECSA API` en el token.
- Los permisos visuales de la SPA usan el claim estandar `permissions` emitido por Auth0 para `ITECSA API`; cualquier accion sensible sigue requiriendo validacion propia en endpoints backend.
- No cambiar formularios, endpoints ni flujo funcional fuera del alcance autorizado de cada paso.

## Restricciones de seguridad

- No implementar Prisma ni MySQL en esta rama.
- No persistir RUT, firma electronica ni contrasenas.
- No incluir secretos reales, tokens ni credenciales en codigo, documentacion o archivos de ejemplo.
- No exponer credenciales Auth0 Management en el frontend.
- No documentar fixtures de prueba mediante sus valores.
- No asumir recursos Auth0 existentes hasta auditarlos.
- No incluir el rol temporal en el ID token salvo una decision posterior expresamente autorizada para la SPA.

## Orden recomendado de implementacion

1. Auditar recursos Auth0 en modo solo lectura y registrar lo confirmado.
2. Definir variables de entorno de ejemplo sin secretos y la configuracion minima de frontend/backend.
3. Integrar login/logout Auth0 en frontend conservando una fachada de autenticacion coherente.
4. Incorporar validacion JWT y autorizacion administrativa en Express.
5. Integrar creacion administrativa de usuarios sin transportar ni persistir datos prohibidos.
6. Retirar mocks y superficies visuales incompatibles una vez reemplazadas por el flujo real.
7. Ejecutar pruebas finales y actualizar este handoff.

## Estado actual del avance

- Auditoria inicial del repositorio realizada el `2026-05-26`.
- Auditoria Auth0 de solo lectura realizada el `2026-05-26` sobre aplicaciones, Resource Servers y Actions disponibles mediante MCP, complementada con revision manual de conexion Database, usuarios y roles.
- Recursos Auth0 base configurados el `2026-05-26`: SPA local, API propia, aplicacion M2M y grant minimo `create:users`.
- Action Post Login `ITECSA Add Role Claim` migrada y desplegada el `2026-05-26` para emitir roles desde Auth0 Roles; su validacion mediante token real queda pendiente de un login integrado.
- Usuario bootstrap creado manualmente por el equipo el `2026-05-26` en `Username-Password-Authentication`.
- Rol Auth0 `Administrador` creado y asignado manualmente al usuario bootstrap; RBAC y `Add Permissions in the Access Token` habilitados para `ITECSA API`.
- Plantillas `env.example` creadas el `2026-05-27` en frontend y backend, sin secretos reales; regla global `.env*` agregada al `.gitignore` raiz.
- `Auth0Provider` configurado en la SPA el `2026-05-27` mediante `@auth0/auth0-react`, usando variables `VITE_AUTH0_*` y `window.location.origin` como `redirect_uri`.
- Login y logout visibles integrados con Auth0 Universal Login/Logout el `2026-05-27`; la fachada `useAuth()` consume el estado del SDK Auth0.
- `ProtectedRoute` espera la restauracion de sesion Auth0 antes de redirigir; `RoleGuard` y los permisos basados en claims permanecen pendientes.
- Configuracion manual de Universal Login completada por el equipo el `2026-05-27`: auto-registro deshabilitado y acceso con Google no disponible para `ITECSA Frontend Local`.
- Login y logout reales verificados manualmente por el equipo con el usuario bootstrap controlado; no se registran correo ni contrasena.
- Backend preparado el `2026-05-27` para exigir variables Auth0/origen al iniciar y responder CORS solo para `FRONTEND_ORIGIN`, conservando parseo JSON y sin implementar JWT.
- Backend ampliado el `2026-05-27` con `checkJwt` Auth0 y `GET /api/auth/verify`, usando claims namespaced de email y roles sin persistencia ni Management API.
- Action Post Login desplegada en version `3` el `2026-05-27` para conservar roles RBAC y emitir email namespaced en access tokens nuevos.
- Middleware `requireAdministrador` incorporado el `2026-05-27`, consumiendo el claim vigente de roles y sin exponer rutas administrativas temporales.
- Servicio interno Auth0 Management API incorporado el `2026-05-27`, con token M2M, creacion Database, normalizacion de correo duplicado y solicitud de correo de contrasena sin tickets ni endpoints.
- `POST /api/admin/users` implementado el `2026-05-27`, protegido con JWT y rol Administrador, con validacion estricta, asignacion RBAC y resultados recuperables para fallos posteriores a la creacion.
- Roles definitivos confirmados por el equipo para este contrato: `Administrador`, `Gerencia`, `Operario`, `Ventas` y `Cobranzas`; existen previamente en Auth0 Dashboard.
- Configuracion Auth0 revisada manualmente durante el paso 14: `ITECSA Frontend Local` esta habilitada para `Username-Password-Authentication`, el template `Change Password (Link)` esta habilitado y `ITECSA Backend Management` quedo autorizado en Auth0 Management API con `create:users`, `read:roles` y `update:users`.
- `POST /api/admin/users/password-setup-email` implementado el `2026-05-28`, protegido con JWT y rol Administrador, para solicitar o reenviar el correo de establecimiento/cambio de contrasena sin crear usuarios, tickets ni enlaces.
- `apiClient` y `authApi.verify` implementados el `2026-05-28` en frontend, usando `VITE_API_BASE_URL`, access token Auth0 silencioso y header `Authorization` centralizado.
- Guards frontend conectados el `2026-05-28` a `authApi.verify()`: la sesion visual se basa en Auth0, el rol usa `rolUsuario` verificado por backend desde Auth0 RBAC y los permisos visuales usan `permissions` del access token.
- Permisos de `ITECSA API` creados via MCP Auth0 el `2026-05-28`: `view:main-navigation`, `view:kanban-module`, `view:payments-module`, `view:own-profile`, `view:orders-module`, `create:users-visually` y `manage:users-visually`.
- Asignacion de permisos a roles realizada manualmente por el equipo en Auth0 Dashboard el `2026-05-28`, porque el MCP disponible no expone operaciones de roles.
- Limpieza de mocks auth completada el `2026-05-28`: `AuthProvider` dejo de exponer `mockUsers` y se elimino el fixture `authMocks.js` al quedar sin referencias.
- El archivo `docs/auth0-inicial/HANDOFF.md` esta registrado en Git desde el commit `716b08b`.

## Usuario bootstrap Administrador

- Estado: creado manualmente por el equipo.
- Correo bootstrap: el equipo entrego un correo controlado para uso operativo en Auth0; su valor completo no se registra en este documento.
- Conexion: `Username-Password-Authentication`, confirmada manualmente por el equipo.
- Rol Auth0: `Administrador`, creado y asignado manualmente al usuario bootstrap.
- Metadata de rol: `app_metadata.rolUsuario` fue retirada manualmente; Auth0 Roles es la unica fuente de rol configurada.
- Control de datos: no se registra el identificador del usuario, el correo completo ni contrasenas; cualquier gestion de contrasena corresponde a Auth0.

## Pasos completados

- [x] 1. Auditoria inicial repo y handoff
- [x] 2. Auditoria Auth0 via MCP
- [x] 3. Recursos Auth0 base via MCP
- [x] 4. Action Post Login via MCP
- [x] 5. Usuario bootstrap Administrador via MCP o registro manual controlado
- [x] 6. Variables de entorno
- [x] 7. Auth0Provider frontend
- [x] 8. Login/logout Auth0
- [x] 9. Backend entorno y CORS
- [x] 10. JWT y `/api/auth/verify`
- [x] 11. `requireAdministrador`
- [x] 12. Servicio Auth0 Management API
- [x] 13. `POST /api/admin/users`
- [x] 14. `POST /api/admin/users/password-setup-email`
- [x] 15. `apiClient` y `authApi.verify`
- [x] 16. Guards frontend
- [x] 17. Formulario creacion usuarios
- [x] 18. Limpieza mocks auth
- [x] 19. Documentacion tecnica minima
- [ ] 20. Pruebas finales y checklist

Regla operativa: actualizar esta lista al finalizar cada paso; no marcar acciones no verificadas o no ejecutadas y no avanzar al paso siguiente sin instruccion explicita.

## Proximo paso recomendado

- Mantener detenido el avance despues del paso `19. Documentacion tecnica minima`.
- Proximo paso funcional reservado: `20. Pruebas finales y checklist`; no implementarlo sin instruccion expresa.
- La integracion del formulario consume `POST /api/admin/users` y `POST /api/admin/users/password-setup-email` mediante el cliente API con bearer Auth0, sin exponer credenciales Management en frontend.
- El formulario real retira del envio `RUT`, firma electronica y contrasena; esos campos quedan visibles y deshabilitados con ayuda contextual.
- Autorizacion por permisos posterior: si se agregan endpoints backend protegidos por permisos funcionales, deben validar el claim `permissions` en servidor; el uso actual de permisos sigue siendo visual.
- No implementar endpoints administrativos adicionales, pruebas finales, Prisma, MySQL ni persistencia de datos sin una instruccion posterior expresa.

## Riesgos o supuestos

- Los mocks auth fueron retirados del flujo normal; los mocks restantes detectados pertenecen a pagos/ordenes y quedan fuera del alcance de autenticacion.
- La UI de creacion mantiene RUT, firma electronica y contrasena visibles pero deshabilitados; el payload real no incluye esos campos.
- La vista frontend `/access-denied` existe y `RoleGuard` la usa como control visual cuando `/api/auth/verify` no entrega un rol permitido para la ruta.
- El login autentica mediante Auth0 y los permisos de navegacion/`RoleGuard` consumen el rol normalizado desde backend; esto no reemplaza la autorizacion efectiva de endpoints.
- `authApi.verify()` esta conectado a `AuthProvider`, `ProtectedRoute`, `RoleGuard` y navegacion; su validacion real depende de iniciar sesion y obtener un access token nuevo para `https://api.itecsa.local` sin registrarlo.
- El binding de la Action fue realizado manualmente en Dashboard porque el MCP disponible no ofrece una operacion para administrar el flujo Post Login; futuras revisiones deben confirmar que no se duplique su instancia.
- La emision efectiva de los claims en un access token nuevo queda pendiente de una validacion de login con el usuario bootstrap controlado.
- La Action agrega los claims namespaced `https://itecsa.local/roles` y `https://itecsa.local/email`; Auth0 agrega el claim estandar `permissions` cuando RBAC y `Add Permissions in the Access Token` estan activos para `ITECSA API`.
- Los scopes M2M de `Auth0 Management API` (`create:users`, `read:roles`, `update:users`) autorizan al backend a administrar usuarios y roles; no equivalen a permisos funcionales asignados a usuarios sobre `ITECSA API`.
- La pestana `Permissions` de un rol en Auth0 corresponde a permisos definidos en `ITECSA API`, no al grant M2M requerido por `ITECSA Backend Management` para ejecutar `POST /api/admin/users`.
- Aunque el requerimiento inicial mencionaba `https://itecsa.local/rolUsuario`, el endpoint y `requireAdministrador` consumen `https://itecsa.local/roles` porque es el contrato vigente de la Action basada en Auth0 Roles/RBAC; `/api/auth/verify` proyecta un unico valor a `rolUsuario`.
- El correo bootstrap fue proporcionado por el equipo para uso controlado, pero no se registra completo para evitar exposicion de datos personales en documentacion.
- La auditoria inicial no mostraba aplicaciones habilitadas para la conexion Database; el equipo habilito/configuro manualmente el flujo necesario para `ITECSA Frontend Local`, y Universal Login presenta `Username-Password-Authentication` sin auto-registro ni Google.
- No se detectaron recursos base ITECSA compatibles antes de la creacion; la verificacion posterior muestra una sola SPA, una sola API propia y una sola aplicacion M2M ITECSA.
- Los archivos `.env*` locales quedan ignorados globalmente desde la raiz; el secret M2M permanece en la variable de usuario de Windows y no debe incorporarse al repositorio ni a documentacion.
- La API valida tokens en `/api/auth/verify` y `requireAdministrador` protege `POST /api/admin/users`; restringir CORS no sustituye esa autorizacion.
- `POST /api/admin/users` depende de que el grant M2M tenga `read:roles` y `update:users` ademas de `create:users`; esa ampliacion fue confirmada manualmente durante el paso 14.
- Si la cuenta se crea pero falla asignar RBAC, la API devuelve `201` recuperable, no solicita correo y la reparacion queda pendiente de una gestion posterior sin duplicar la cuenta.
- Para el envio de correos de contrasena, `ITECSA Frontend Local` esta habilitada en `Username-Password-Authentication` y el template `Change Password (Link)` esta habilitado; el proveedor default de Auth0 es aceptable para desarrollo/prueba, pero produccion debera definir proveedor de correo propio.
- `POST /api/admin/users` solicita el primer correo tras crear la cuenta y asignar RBAC; `POST /api/admin/users/password-setup-email` no crea cuentas ni duplica usuarios, solo solicita/reenvia el correo para un correo ya administrado por Auth0.
- Si `POST /api/admin/users` devuelve `passwordSetupEmailRequested: false`, la UI no reintenta crear la cuenta; permite solicitar el correo solo cuando `roleAssignmentCompleted` no es `false`.

## Validacion del paso 8

- `git status --short --branch`: ejecutado antes del cambio; rama `auth0-inicial` limpia y `ahead 11`.
- `rg "DevLoginButton|authCredentials|loginAsMockUser|MOCK_AUTH_CREDENTIALS|Credenciales simuladas|Entrar como administrador" capaVista/src -n`: sin referencias despues del cambio.
- `rg "mockUsers" capaVista/src -n`: solo permanece en `AuthProvider.jsx` y `UserCreateForm.jsx`, por compatibilidad fuera de alcance.
- `npm run lint` en `capaVista`: exitoso.
- `npm run build` en `capaVista`: exitoso; Vite compilo la SPA sin errores.
- `npm run dev -- --host 127.0.0.1` y revision local en `http://localhost:5173/login`: el panel ITECSA muestra un unico boton de inicio y no presenta credenciales mock.
- Interaccion sin credenciales sobre `Iniciar sesion`: redirige a `itecsa-sistema.us.auth0.com/u/login`, que presenta Universal Login de `ITECSA Frontend Local` con formulario Database.
- Revision posterior a la configuracion manual del Dashboard: Universal Login conserva el formulario Database y no presenta `Sign up` ni acceso con Google.
- El equipo confirmo autenticacion exitosa con el usuario bootstrap y cierre de sesion con retorno a `http://localhost:5173`; no se inspeccionaron ni documentaron credenciales.

## Validacion del paso 9

- `npm ci` en `capaServidor`: exitoso; dependencias instaladas localmente con `0 vulnerabilities`.
- Inicio temporal con `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `FRONTEND_ORIGIN=http://localhost:5173` y `PORT=3190`: exitoso; el proceso fue detenido tras la prueba.
- Inicio con cada variable obligatoria ausente/en blanco y con las tres ausentes/en blanco: rechazado con codigo `1`, identificando `AUTH0_DOMAIN`, `AUTH0_AUDIENCE` y/o `FRONTEND_ORIGIN` segun corresponde.
- Peticion con `Origin: http://localhost:5173`: responde `Access-Control-Allow-Origin: http://localhost:5173`.
- Peticion con un origen distinto: la cabecera permanece fijada en `http://localhost:5173` y no coincide con el origen solicitante, por lo que el navegador no lo autoriza mediante CORS.
- No se implementaron JWT, endpoints protegidos, Auth0 Management API, Prisma, MySQL, persistencia ni cambios frontend.

## Validacion del paso 10

- `npm install express-oauth2-jwt-bearer` en `capaServidor`: exitoso; se agrego la dependencia JWT y la auditoria reporto `0 vulnerabilities`.
- `node --check` sobre `src/server.js`, `src/app/app.js`, `src/middlewares/checkJwt.js` y `src/routes/auth.routes.js`: exitoso, sin errores de sintaxis.
- Inicio temporal en puerto `3191` con variables obligatorias y peticion `GET /api/auth/verify` sin bearer token: responde `401`.
- Peticion `GET /api/auth/verify` con bearer token invalido: responde `401`.
- Action `ITECSA Add Role Claim`: version `3` actualizada y desplegada mediante MCP; verificada con `all_changes_deployed: true`.
- Prueba `200` pendiente de ejecucion manual controlada: iniciar sesion nuevamente con el usuario bootstrap, obtener un access token para `https://api.itecsa.local` sin registrarlo, e invocar `GET /api/auth/verify` con `Authorization: Bearer <token>`; debe devolver `sub`, `email`, `rolUsuario: "Administrador"` e `isAdministrador: true`.
- Prueba `403` pendiente de contar con token valido controlado sin rol oficial unico o sin email namespaced; la API rechaza esos contratos sin implementar aun autorizacion administrativa.
- No se implementaron `requireAdministrador`, Auth0 Management API, creacion de usuarios, Prisma, MySQL, persistencia ni cambios frontend.

## Validacion del paso 11

- Se creo `src/middlewares/requireAdministrador.js` sin montar rutas administrativas temporales.
- El middleware permite exclusivamente `https://itecsa.local/roles: ["Administrador"]`; usuarios autenticados con otro contrato de roles reciben `403`.
- `npm test` en `capaServidor`: exitoso; `node:test` ejecuto 5 casos para rol Administrador, rol distinto, roles vacios, claim ausente y multiples roles, sin fallos.
- `node --check` sobre `src/middlewares/requireAdministrador.js` y `test/requireAdministrador.test.js`: exitoso, sin errores de sintaxis.
- No se implementaron Auth0 Management API, endpoints administrativos, creacion de usuarios, Prisma, MySQL, persistencia ni cambios frontend.

## Validacion del paso 12

- Se creo `src/services/auth0Management.service.js` sin montar nuevas rutas ni modificar frontend.
- `createAuth0User` solicita token M2M para Management API, envia `email`, `given_name`, `family_name`, `connection` y `app_metadata.rolUsuario`, y normaliza usuario duplicado como `USER_EMAIL_ALREADY_EXISTS`.
- La contrasena temporal Database se genera mediante `node:crypto`, se usa solamente en el cuerpo enviado a Auth0 y no forma parte del retorno ni de logs del servicio.
- `requestPasswordSetupEmail` usa `/dbconnections/change_password` con `AUTH0_PASSWORD_RESET_CLIENT_ID` y retorna solo `{ requested: true }`, sin tickets ni enlaces.
- En este paso, `create:users` era suficiente para crear la cuenta mediante Management API y el flujo de correo pertenece a Authentication API; desde el paso 13, resolver y asignar el rol RBAC agrega la necesidad de `read:roles` y `update:users`.
- `npm test` en `capaServidor`: exitoso; `node:test` ejecuto 10 casos, incluidos token/creacion/correo simulados y los 5 casos previos de autorizacion, sin solicitudes reales a Auth0.
- `node --check` sobre `src/services/auth0Management.service.js` y `test/auth0Management.service.test.js`: exitoso, sin errores de sintaxis.
- La habilitacion de `ITECSA Frontend Local` en la conexion Database, el proveedor/plantilla de correo y el grant M2M deben confirmarse manualmente en Dashboard, porque el MCP disponible no expone esas verificaciones.
- No se implementaron endpoints administrativos, asignacion RBAC, Prisma, MySQL, persistencia ni cambios frontend.

## Validacion del paso 13

- Se creo `src/routes/adminUsers.routes.js` y se monto `POST /api/admin/users` bajo `/api/admin`, aplicando `checkJwt` antes de `requireAdministrador`.
- La ruta acepta solo `primerNombre`, `apellidoPaterno`, `correoUsuario` y `rolUsuario`; rechaza campos adicionales, correo invalido y roles fuera de `Administrador`, `Gerencia`, `Operario`, `Ventas` y `Cobranzas`.
- `createAuth0User` consulta roles existentes, resuelve el ID por nombre exacto antes de crear, asigna el rol Auth0 RBAC al usuario nuevo y conserva la contrasena temporal solo en memoria.
- El correo inicial solo se solicita despues de asignar RBAC; fallos de asignacion o correo posteriores a la creacion responden `201` recuperable sin intentar crear duplicados.
- El endpoint no recibe ni devuelve contrasenas, RUT o firma electronica, y no se modificaron frontend, mocks, Prisma, MySQL ni persistencia local.
- `node --check` sobre servicio, router, servidor y pruebas del paso: exitoso.
- `npm test` en `capaServidor`: exitoso; `node:test` ejecuto 19 casos sin llamadas reales a Auth0.
- Validacion HTTP local sin secretos: `POST /api/admin/users` sin token y con bearer invalido respondio `401`.
- Validaciones reales `201`, `403`, `409` y emision del rol en un token nuevo quedan pendientes de un token controlado y de confirmar manualmente la ampliacion del grant M2M.

## Validacion del paso 14

- Se agrego `POST /api/admin/users/password-setup-email` bajo `/api/admin`, aplicando `checkJwt` antes de `requireAdministrador`.
- La ruta acepta solo `correoUsuario`, rechaza campos adicionales, correo invalido y valores vacios antes de llamar a Auth0.
- La ruta reutiliza `requestPasswordSetupEmail`, que usa `/dbconnections/change_password` con el client ID publico de la SPA y la conexion Database; no genera ni retorna tickets, enlaces o contrasenas.
- El endpoint no crea usuarios, no asigna roles, no consulta Management API y no modifica frontend, mocks, Prisma, MySQL ni persistencia local.
- Configuracion Auth0 confirmada manualmente: `ITECSA Frontend Local` habilitada en `Username-Password-Authentication`, template `Change Password (Link)` habilitado y grant M2M con `create:users`, `read:roles`, `update:users`.
- `node --check` sobre router y pruebas modificadas: exitoso.
- `npm test` en `capaServidor`: exitoso; `node:test` ejecuto los casos del endpoint nuevo y la suite previa sin llamadas reales a Auth0.
- Validaciones HTTP reales `200`, `400`, `401` y `403` quedan disponibles mediante los comandos documentados en `capaServidor/README.md`; no registrar tokens ni datos personales.

## Validacion del paso 15

- Se creo `capaVista/src/services/api/apiClient.js`, que lee `VITE_API_BASE_URL`, normaliza paths bajo `/api`, solicita un access token mediante una funcion inyectada y agrega `Authorization: Bearer <access_token>`.
- Se creo `capaVista/src/modules/auth/api/authApi.js` con `verify()`, que llama `GET /auth/verify` mediante `apiClient`; con `VITE_API_BASE_URL=http://localhost:3000/api` esto resuelve a `GET /api/auth/verify`.
- Se creo `capaVista/src/modules/auth/hooks/useAuthApi.js`, que usa `getAccessTokenSilently({ authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE } })` y devuelve `authApi` ya ligado a Auth0.
- `apiClient` convierte respuestas `401` y fallos de obtencion silenciosa de token en `ApiClientError` con `code: "SESSION_INVALID"` y `status: 401`; otros errores HTTP conservan su status para manejo posterior.
- No se usan `localStorage`, `sessionStorage`, tokens manuales ni credenciales Auth0 Management; no se modificaron backend, guards, formulario de usuarios, Prisma, MySQL ni persistencia local.
- `npm run lint` en `capaVista`: exitoso.
- `npm run build` en `capaVista`: exitoso; Vite compilo la SPA sin errores.
- Prueba manual recomendada: levantar backend con variables Auth0 validas y `FRONTEND_ORIGIN=http://localhost:5173`, levantar frontend con `VITE_API_BASE_URL=http://localhost:3000/api`, iniciar sesion con el usuario bootstrap controlado e invocar `authApi.verify()` desde una prueba manual de desarrollo sin registrar el token. Con sesion valida debe devolver `rolUsuario: "Administrador"` e `isAdministrador: true`; con token ausente/rechazado debe entregar el error `SESSION_INVALID`.

## Validacion del paso 16

- `AuthProvider` conecta `authApi.verify()` cuando Auth0 indica sesion autenticada, conserva `mockUsers` solo para compatibilidad del formulario fuera de alcance y expone permisos visuales desde `permissions` verificados por backend.
- `ProtectedRoute` maneja carga de Auth0/verificacion backend y redirige a `/login?from=...` cuando no hay sesion o la sesion es invalida.
- `RoleGuard` espera la verificacion, redirige sesiones invalidas a login y envia a `/access-denied` cuando el rol verificado no cumple el permiso o rol requerido.
- La ruta `/kanban` queda protegida por permiso visual; `/pagos` y `/ordenes/nuevo` usan permisos visuales reales desde Auth0; `/admin/usuarios/nuevo` exige explicitamente `Administrador`.
- No se modificaron backend, endpoints, formulario de creacion de usuarios, Prisma, MySQL, persistencia local ni credenciales.
- `npm run lint` en `capaVista`: exitoso.
- `npm run build` en `capaVista`: exitoso; Vite compilo la SPA sin errores.
- Pruebas manuales recomendadas: no autenticado debe ir a `/login?from=...`; usuario autenticado sin rol RBAC valido debe ir a `/access-denied`; Administrador debe ver `/admin/usuarios/nuevo`; usuario no administrador debe ver solo rutas permitidas por su rol y recibir `/access-denied` en administracion.

## Validacion adicional: permisos Auth0 reales

- `GET /api/auth/verify` proyecta el claim estandar `permissions` del access token Auth0 y devuelve `permissions: []` cuando el claim no existe.
- `GET /api/auth/verify` rechaza con `403` un claim `permissions` malformado que no sea arreglo.
- `AuthProvider.hasPermission()` usa exclusivamente `user.permissions` verificado por backend; ya no deriva permisos desde `rolUsuario` ni desde `ROLE_PERMISSIONS`.
- `capaVista/src/config/permissions.js` queda como catalogo de constantes para rutas y navegacion; la matriz rol-permiso vive en Auth0.
- `npm test` en `capaServidor`: exitoso.
- `npm run lint` en `capaVista`: exitoso.
- `npm run build` en `capaVista`: exitoso.
- Prueba manual pendiente: cerrar sesion, iniciar sesion nuevamente con usuarios controlados y confirmar que el access token nuevo incluye permisos asignados sin registrar tokens ni correos completos.

## Validacion del paso 17

- `apiClient` expone `post()` reutilizando el bearer token Auth0 centralizado y el manejo existente de `401` como `SESSION_INVALID`.
- Se creo `modules/users/api/adminUsersApi.js` y `modules/users/hooks/useAdminUsersApi.js` para llamar `POST /api/admin/users` y `POST /api/admin/users/password-setup-email` sin exponer credenciales Auth0 Management.
- `UserCreateForm.jsx` envia solo `primerNombre`, `apellidoPaterno`, `correoUsuario` y `rolUsuario`; RUT, firma electronica y contrasena quedan visibles, deshabilitados y con ayuda contextual.
- La validacion frontend ya no usa `MOCK_USERS`, RUT, firma electronica ni contrasena; la unicidad de correo queda en backend/Auth0 y se muestra como error claro ante `409`.
- La UI muestra confirmacion de creacion exitosa, acceso denegado para `403`, sesion invalida para `401` y permite solicitar `POST /api/admin/users/password-setup-email` solo cuando fallo el correo y la asignacion de rol no fallo.
- Si `roleAssignmentCompleted: false`, la UI informa gestion manual y no ofrece reenvio porque ese endpoint no corrige RBAC.
- `rg "mockUsers|PasswordRules|normalizeRut|validateRut|validatePassword|validateSignatureReference|Preparar usuario|Usuario preparado" capaVista/src/modules/users capaVista/src/services/api -n`: sin referencias.
- `npm run lint` en `capaVista`: exitoso.
- `npm run build` en `capaVista`: exitoso; Vite compilo la SPA sin errores.
- Pruebas manuales pendientes con backend/frontend y usuarios controlados: `201` debe confirmar creacion y correo; `409` debe mostrar correo duplicado; `403` debe mostrar acceso denegado; `401` debe mostrar sesion invalida/inicio de sesion; el caso recuperable de correo debe permitir reenvio sin duplicar cuenta; el caso recuperable RBAC debe mostrar gestion manual sin reenvio.
- Verificacion manual recomendada en DevTools/Network: el payload de `POST /api/admin/users` no debe incluir `rutUsuario`, `referenciaFirmaElectronica`, `password` ni campos adicionales.

## Validacion del paso 18

- `AuthProvider` ya no importa `MOCK_USERS` ni expone `mockUsers` desde la fachada `useAuth()`.
- Se elimino `capaVista/src/modules/auth/mocks/authMocks.js` porque no quedaban consumidores de usuarios mock de auth.
- Login conserva `loginWithRedirect` de Auth0, logout conserva Universal Logout, guards siguen verificando sesion con `authApi.verify()` y creacion de usuarios sigue usando `POST /api/admin/users` y `POST /api/admin/users/password-setup-email`.
- `rg "MOCK_USERS|DEFAULT_MOCK_USER_ID|mockUsers|authMocks|authCredentials|loginAsMockUser|Credenciales simuladas|Entrar como administrador" capaVista/src -n`: sin referencias despues del cambio.
- `rg "MOCK_" capaVista/src -n`: solo quedan mocks fuera de alcance en pagos (`MOCK_ORDERS`) y ordenes (`MOCK_CURRENT_CAPACITY`).
- `npm run lint` en `capaVista`: exitoso.
- `npm run build` en `capaVista`: exitoso; Vite compilo la SPA sin errores.
- `npm test` en `capaServidor`: exitoso; `node:test` ejecuto 26 casos sin fallos.

## Validacion del paso 19

- Se actualizo documentacion permanente del repo en `README.md`, `capaVista/README.md`, `capaServidor/README.md` y `docs/ARQUITECTURA.md`.
- Se creo el documento externo `C:\Users\danag\dev\Uni\Ingenieria de software\Aplicacion\Ramas\Auth0\Auth0.md` para trazabilidad Auth0/UR/RF sin depender del sidecar `StackTecnologico.docx.md`.
- `docs/auth0-inicial/` se mantiene solo como contexto operativo temporal; no se agrego documentacion permanente nueva en esa carpeta.
- La documentacion explicita que la autorizacion usa Auth0 RBAC, que `rolUsuario` es una proyeccion backend para la SPA y que `app_metadata.rolUsuario` no reemplaza RBAC.
- La plantilla para conectar nuevas vistas a permisos Auth0 quedo en `capaVista/README.md`; la arquitectura solo describe el flujo conceptual RBAC -> `permissions` -> `/api/auth/verify` -> `hasPermission(...)`.
- Se documentaron variables frontend/backend, recursos Auth0 esperados/configurados, audience `https://api.itecsa.local`, roles permitidos, pruebas manuales seguras y restricciones de secretos.
- No se modificaron codigo funcional, endpoints, configuracion Auth0, Prisma, MySQL, persistencia, RUT, firma electronica ni contrasenas.

## Ultima actualizacion del handoff

- Paso completado: `19. Documentacion tecnica minima`.
- Fecha: `2026-05-29`.
- Estado vigente: la documentacion permanente del repo describe el flujo Auth0 inicial real, el consumo frontend de `/api/auth/verify`, los recursos Auth0 esperados/configurados, la autorizacion basada en Auth0 RBAC y la creacion administrativa de usuarios desde backend.
- Decisiones tomadas: no usar `docs/auth0-inicial/` como destino documental permanente; no editar el sidecar `StackTecnologico.docx.md`; dejar trazabilidad UR/RF adicional fuera de la repo en `C:\Users\danag\dev\Uni\Ingenieria de software\Aplicacion\Ramas\Auth0\Auth0.md`; documentar `app_metadata.rolUsuario` como auxiliar y no como fuente de autorizacion.
- Control de secretos y alcance: no se agregaron secretos reales, tokens reales, credenciales Auth0 Management en frontend, correos reales, RUT, firma electronica, contrasenas, Prisma, MySQL, endpoints nuevos ni persistencia local.
- Pendientes: pruebas finales reales controladas sin registrar tokens ni datos personales; revisar el documento DOCX de stack si el equipo quiere incorporar manualmente la trazabilidad estable fuera del sidecar.
- Riesgos nuevos: el documento externo `Auth0.md` queda fuera del control Git de esta repo; si se mueve o elimina la carpeta `Ramas/Auth0`, esa trazabilidad externa debe respaldarse por el equipo.
- Proximo paso recomendado: detener el avance despues del paso 19; el paso `20. Pruebas finales y checklist` requiere instruccion expresa.
