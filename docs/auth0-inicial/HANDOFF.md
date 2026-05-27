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
- El backend Express es una plantilla inicial sin rutas API registradas, JWT, endpoints de auth ni servicios Auth0.
- No se encontraron archivos `.env*`, cliente HTTP del frontend ni dependencias Auth0/JWT en las capas auditadas.

## Frontend relevante

- Entry point y providers: `capaVista/src/main.jsx`, `capaVista/src/app/providers/AppProviders.jsx` y `AuthProvider.jsx`.
- Router: `capaVista/src/app/router.jsx` declara `/login`, rutas protegidas y `/admin/usuarios/nuevo`.
- Login: `modules/auth/pages/LoginPage.jsx` y `components/LoginForm.jsx` mantienen el panel ITECSA e inician Auth0 Universal Login mediante `loginWithRedirect`.
- Sesion/logout: `AuthProvider.jsx` conserva la fachada `useAuth()` sobre `@auth0/auth0-react`; `LogoutButton.jsx` ejecuta Universal Logout y retorna al origin local.
- Guards: `ProtectedRoute.jsx` espera la carga Auth0 y exige sesion autenticada; `RoleGuard.jsx` aun usa permisos/roles no integrados con claims Auth0.
- Creacion de usuarios: `modules/users/pages/UserCreatePage.jsx` y `components/UserCreateForm.jsx` solo validan y muestran un resumen temporal.
- Cliente HTTP y entorno Auth0: no encontrados en la auditoria inicial.

## Backend relevante

- Arranque: `capaServidor/src/app/app.js` carga `dotenv` e instancia `Server`.
- Servidor: `capaServidor/src/server.js` configura `express`, `cors()` sin restricciones declaradas, `express.json()` y archivos estaticos.
- Rutas y servicios: no hay routers montados, endpoints de autenticacion, middleware de token, validacion de roles ni integracion Auth0.
- Dependencias observadas: `express`, `cors` y `dotenv`; no se observaron dependencias JWT/Auth0.
- Manejo de errores: solo captura de fallo durante el arranque; no existe middleware API de errores.

## Mocks de auth encontrados

- `capaVista/src/modules/auth/mocks/authMocks.js` contiene usuarios de prueba, roles/estado y datos representativos para la UI.
- El fixture `capaVista/src/modules/auth/mocks/authCredentials.js` y el acceso rapido administrativo fueron retirados al reemplazar el login visual por Auth0.
- `LoginPage.jsx` ya no solicita ni expone credenciales locales; Universal Login administra la captura de credenciales.
- `UserCreateForm.jsx` solicita actualmente RUT, firma electronica y contrasena solo para validacion/preview en memoria.
- No se reproducen valores de fixtures de prueba en este handoff. La adecuacion del mock restante corresponde a pasos posteriores autorizados.

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
- API creada: `ITECSA API` (`id`: `6a1660a4a0a31d800e5d0509`), audience `https://api.itecsa.local`, algoritmo `RS256` y sin scopes de negocio definidos en este paso.
- Aplicacion M2M creada: `ITECSA Backend Management` (`client_id`: `b3jWfQOqDUVzavdm5CpgE5fUvwK8N5gT`), tipo `non_interactive`, reservada para el backend Express.
- Grant M2M creado hacia `Auth0 Management API`, audience `https://itecsa-sistema.us.auth0.com/api/v2/`, con scope unico `create:users`.
- Conexion Database reutilizada: `Username-Password-Authentication`, previamente confirmada como administrada por Auth0. El MCP disponible no ofrece lectura o configuracion de conexiones; no se creo ni modifico ninguna conexion durante este paso.
- `create:users` permite al backend crear usuarios indicando `Username-Password-Authentication` como conexion; no se crearon usuarios en este paso.
- No se consultaron, guardaron ni documentaron secretos. El secret de la aplicacion M2M debe obtenerse y copiarse manualmente a un entorno local o seguro cuando se implemente el backend.

## Action Post Login configurada

- Action final: `ITECSA Add Role Claim`.
- Trigger: `Post Login` (`post-login`, version `v3`), runtime `node22`, sin dependencias ni secretos.
- Fuente de roles: `event.authorization.roles` provisto por Auth0 Roles.
- Claim emitido: `https://itecsa.local/roles`, como arreglo de roles permitidos.
- Token donde se emite: access token solamente; no se agrega al ID token en este paso.
- Valores permitidos: `Administrador`, `Gerencia`, `Operario`, `Ventas` y `Cobranzas`.
- Comportamiento: el claim contiene solamente roles asignados que coinciden con valores permitidos; ante ausencia de roles permitidos se omite sin bloquear el login.
- Estado Auth0: la Action fue actualizada y desplegada mediante MCP; la version `2` desplegada fue verificada con `all_changes_deployed: true`.
- Binding Post Login: se enlazo manualmente en Dashboard bajo `Actions > Triggers > Post Login`, confirmado visualmente con una sola instancia de `ITECSA Add Role Claim` entre `Start` y `Complete`, porque el MCP disponible no expone operaciones de bindings.
- Validacion de token pendiente: cuando el rol Auth0 `Administrador` este asignado al usuario bootstrap y exista login que solicite `https://api.itecsa.local`, el access token debe contener `https://itecsa.local/roles: ["Administrador"]`.

## Variables de entorno configuradas

- Frontend: `capaVista/env.example` documenta `VITE_AUTH0_DOMAIN=itecsa-sistema.us.auth0.com`, `VITE_AUTH0_CLIENT_ID=hBE18LPJgcYqI0WpiZxpLgT9sygDHTHm`, `VITE_AUTH0_AUDIENCE=https://api.itecsa.local` y `VITE_API_BASE_URL=http://localhost:3000/api`.
- Backend: `capaServidor/env.example` documenta `PORT=3000`, `FRONTEND_ORIGIN=http://localhost:5173`, `AUTH0_DOMAIN=itecsa-sistema.us.auth0.com`, `AUTH0_AUDIENCE=https://api.itecsa.local`, `AUTH0_MANAGEMENT_CLIENT_ID=b3jWfQOqDUVzavdm5CpgE5fUvwK8N5gT` y `AUTH0_DATABASE_CONNECTION=Username-Password-Authentication`.
- Los `client_id` incluidos son identificadores publicos/no secretos confirmados mediante Auth0 MCP; el client secret de Management no fue consultado ni registrado.
- `AUTH0_MANAGEMENT_CLIENT_SECRET` se suministra al backend mediante una variable de usuario de Windows; no se registra su valor en el repositorio, archivos `.env` ni documentacion.
- Los archivos locales `.env*` quedan excluidos de Git mediante el `.gitignore` raiz; las plantillas versionadas de frontend y backend usan el nombre `env.example`.

## Decisiones tecnicas aplicables

- Mantener `useAuth()` como fachada interna durante la migracion; desde el paso 8 expone identidad, carga, error, login y logout del SDK Auth0.
- Mantener `MOCK_USERS` transitoriamente en la fachada solo para `UserCreateForm`, que no se integra ni modifica en este paso.
- Montar `Auth0Provider` por fuera de `AuthProvider` y procesar `onRedirectCallback` con rutas locales sanitizadas.
- Tratar `ProtectedRoute` y `RoleGuard` como controles de experiencia visual, nunca como autorizacion efectiva.
- Toda proteccion de endpoints administrativos futura debe validarse en Express con identidad y rol comprobables.
- El frontend no debe consumir Auth0 Management API ni recibir credenciales de administracion.
- No cambiar formularios, mocks ni flujo funcional durante esta auditoria documental.

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
- Login y logout visibles integrados con Auth0 Universal Login/Logout el `2026-05-27`; la fachada `useAuth()` consume el estado del SDK y conserva solo `MOCK_USERS` por compatibilidad fuera de alcance.
- `ProtectedRoute` espera la restauracion de sesion Auth0 antes de redirigir; `RoleGuard` y los permisos basados en claims permanecen pendientes.
- Configuracion manual de Universal Login completada por el equipo el `2026-05-27`: auto-registro deshabilitado y acceso con Google no disponible para `ITECSA Frontend Local`.
- Login y logout reales verificados manualmente por el equipo con el usuario bootstrap controlado; no se registran correo ni contrasena.
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
- [ ] 9. Backend entorno y CORS
- [ ] 10. JWT y `/api/auth/verify`
- [ ] 11. `requireAdministrador`
- [ ] 12. Servicio Auth0 Management API
- [ ] 13. `POST /api/admin/users`
- [ ] 14. `POST /api/admin/users/password-setup-email`
- [ ] 15. `apiClient` y `authApi.verify`
- [ ] 16. Guards frontend
- [ ] 17. Formulario creacion usuarios
- [ ] 18. Limpieza mocks auth
- [ ] 19. Documentacion tecnica minima
- [ ] 20. Pruebas finales y checklist

Regla operativa: actualizar esta lista al finalizar cada paso; no marcar acciones no verificadas o no ejecutadas y no avanzar al paso siguiente sin instruccion explicita.

## Proximo paso recomendado

- Mantener detenido el avance despues del paso `8. Login/logout Auth0`.
- Proximo paso recomendado y pendiente para otro agente: `9. Backend entorno y CORS`, solo con instruccion expresa.
- Universal Login, autenticacion del usuario bootstrap y retorno de logout a `http://localhost:5173` fueron verificados para `ITECSA Frontend Local`.
- No implementar CORS, JWT, endpoints, guards de roles, Prisma, MySQL ni persistencia de datos sin una instruccion posterior expresa.

## Riesgos o supuestos

- `MOCK_USERS` se conserva temporalmente porque `UserCreateForm` lo consume para validacion visual; retirarlo requiere el paso correspondiente a esa vista.
- La UI actual maneja temporalmente campos que no deben persistirse ni enviarse de forma insegura al integrar Auth0.
- El frontend actual puede mostrar accesos segun rol, pero el backend aun no impide acceso no autorizado.
- El login autentica mediante Auth0, pero los permisos de navegacion y `RoleGuard` aun no consumen roles Auth0; un usuario real puede ver accesos limitados hasta ese paso.
- El binding de la Action fue realizado manualmente en Dashboard porque el MCP disponible no ofrece una operacion para administrar el flujo Post Login; futuras revisiones deben confirmar que no se duplique su instancia.
- La emision efectiva del claim en un access token queda pendiente de una validacion de login con el usuario bootstrap controlado.
- RBAC y `Add Permissions in the Access Token` estan habilitados para `ITECSA API`; la Action agrega adicionalmente el claim namespaced `https://itecsa.local/roles`.
- El correo bootstrap fue proporcionado por el equipo para uso controlado, pero no se registra completo para evitar exposicion de datos personales en documentacion.
- La auditoria inicial no mostraba aplicaciones habilitadas para la conexion Database; el equipo habilito/configuro manualmente el flujo necesario para `ITECSA Frontend Local`, y Universal Login presenta `Username-Password-Authentication` sin auto-registro ni Google.
- No se detectaron recursos base ITECSA compatibles antes de la creacion; la verificacion posterior muestra una sola SPA, una sola API propia y una sola aplicacion M2M ITECSA.
- Los archivos `.env*` locales quedan ignorados globalmente desde la raiz; el secret M2M permanece en la variable de usuario de Windows y no debe incorporarse al repositorio ni a documentacion.

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

## Ultima actualizacion del handoff

- Paso completado: `8. Login/logout Auth0`.
- Fecha: `2026-05-27`.
- Estado vigente: `/login` ejecuta `loginWithRedirect`, la fachada `useAuth()` utiliza la sesion Auth0, `logout()` cierra la sesion Auth0 con retorno al origin local y Universal Login fue validado sin auto-registro ni Google.
- Control de secretos y alcance: no se agregaron secretos, tokens, contrasenas, RUT ni firma electronica; no se modificaron `RoleGuard`, backend, vista de creacion de usuarios, Prisma, MySQL ni persistencia.
- Proximo paso recomendado y pendiente para otro agente: `9. Backend entorno y CORS`, sujeto a instruccion expresa.
