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
- Login: `modules/auth/pages/LoginPage.jsx` y `components/LoginForm.jsx` validan contra fixtures locales; `DevLoginButton.jsx` permite ingreso mock administrativo.
- Sesion/logout: `AuthProvider.jsx` expone `loginAsMockUser`, `logout`, `hasRole` y `hasPermission`; `LogoutButton.jsx` limpia el estado en memoria.
- Guards: `ProtectedRoute.jsx` exige una sesion mock activa; `RoleGuard.jsx` usa permisos/roles definidos en `config/permissions.js` y `config/roles.js`.
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
- `capaVista/src/modules/auth/mocks/authCredentials.js` contiene credenciales temporales utilizadas por el login visual.
- `LoginPage.jsx` expone credenciales simuladas para pruebas del frontend.
- `UserCreateForm.jsx` solicita actualmente RUT, firma electronica y contrasena solo para validacion/preview en memoria.
- No se reproducen valores de esos fixtures en este handoff. Su retiro o adecuacion corresponde a pasos posteriores autorizados.

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
- Fuente del rol: `event.user.app_metadata.rolUsuario`.
- Claim emitido: `https://itecsa.local/rolUsuario`.
- Token donde se emite: access token solamente; no se agrega al ID token en este paso.
- Valores permitidos: `Administrador`, `Gerencia`, `Operario`, `Ventas` y `Cobranzas`.
- Comportamiento: el claim solo se agrega si `rolUsuario` coincide exactamente con un valor permitido; ante ausencia o valor no permitido no se inventa rol ni se bloquea el login.
- Estado Auth0: la Action fue creada y desplegada mediante MCP; la version desplegada fue verificada con `all_changes_deployed: true`.
- Binding Post Login: se enlazo manualmente en Dashboard bajo `Actions > Triggers > Post Login`, confirmado visualmente con una sola instancia de `ITECSA Add Role Claim` entre `Start` y `Complete`, porque el MCP disponible no expone operaciones de bindings.
- Validacion de token pendiente: no se creo usuario ni se ejecuto login como parte de este paso. Cuando exista un usuario controlado con `app_metadata.rolUsuario` permitido y un login que solicite `https://api.itecsa.local`, el access token debe contener el claim namespaced; para rol ausente o no permitido debe omitirlo sin rechazar el login.

## Variables de entorno pendientes

- Frontend futuro: `VITE_AUTH0_DOMAIN=itecsa-sistema.us.auth0.com`, `VITE_AUTH0_CLIENT_ID=hBE18LPJgcYqI0WpiZxpLgT9sygDHTHm`, `VITE_AUTH0_AUDIENCE=https://api.itecsa.local`.
- Backend futuro: `AUTH0_DOMAIN=itecsa-sistema.us.auth0.com`, `AUTH0_AUDIENCE=https://api.itecsa.local`, `AUTH0_MANAGEMENT_CLIENT_ID=b3jWfQOqDUVzavdm5CpgE5fUvwK8N5gT`, `AUTH0_MANAGEMENT_AUDIENCE=https://itecsa-sistema.us.auth0.com/api/v2/`, `AUTH0_DB_CONNECTION=Username-Password-Authentication`.
- `AUTH0_MANAGEMENT_CLIENT_SECRET` debe completarse manualmente en el entorno local o secreto seguro del backend; su valor no se registra en este documento ni debe exponerse al frontend.

## Decisiones tecnicas aplicables

- Mantener `useAuth()` como posible fachada interna durante la migracion, reemplazando su implementacion mock solo en un paso posterior.
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
- Action Post Login `ITECSA Add Role Claim` creada, desplegada y enlazada al flujo Post Login el `2026-05-26`; su validacion mediante token real queda pendiente de contar con un login y usuario controlados.
- Revision del paso 5 realizada el `2026-05-26`: el equipo dispone de un correo bootstrap controlado, pero el MCP Auth0 expuesto no incluye operaciones para buscar, crear ni actualizar usuarios; no fue posible verificar ni crear el usuario Administrador.
- No se hicieron cambios funcionales de frontend o backend.
- El archivo `docs/auth0-inicial/HANDOFF.md` esta registrado en Git desde el commit `716b08b`.

## Usuario bootstrap Administrador

- Estado: pendiente de verificacion o creacion.
- Correo bootstrap: el equipo entrego un correo controlado para uso operativo en Auth0; su valor completo no se registra en este documento.
- Usuario reutilizado o creado: ninguno confirmado. No se creo, reutilizo ni modifico ningun usuario durante este paso.
- Rol requerido: `app_metadata.rolUsuario = Administrador`; no se confirma aplicado mientras no exista capacidad autorizada para consultar el usuario bootstrap.
- Limitacion operativa: el MCP Auth0 disponible durante este paso permite verificar Actions, pero no expone operaciones de consulta, creacion o actualizacion de usuarios ni lectura de conexiones.
- Prevencion de duplicados: cuando exista capacidad autorizada de usuarios, se debe buscar primero el correo bootstrap controlado antes de considerar una creacion.
- Contrasena: debe establecerse mediante un flujo de correo administrado por Auth0, sin generar, mostrar, transportar ni registrar contrasenas en ITECSA o en este handoff.
- Bloqueo de creacion: si la operacion futura exige proporcionar una contrasena inicial y no permite cumplir el flujo administrado por Auth0, mantener el usuario pendiente y documentar ese bloqueo.

## Pasos completados

- [x] 1. Auditoria inicial repo y handoff
- [x] 2. Auditoria Auth0 via MCP
- [x] 3. Recursos Auth0 base via MCP
- [x] 4. Action Post Login via MCP
- [ ] 5. Usuario bootstrap Administrador via MCP o registro manual controlado
- [ ] 6. Variables de entorno
- [ ] 7. Auth0Provider frontend
- [ ] 8. Login/logout Auth0
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

- Mantener detenido el avance en el paso `5. Usuario bootstrap Administrador via MCP o registro manual controlado`.
- Habilitar una operacion Auth0 autorizada para buscar el correo bootstrap controlado y verificar o crear unicamente ese usuario con `app_metadata.rolUsuario = Administrador`, sin duplicados y sin contrasenas administradas por ITECSA.
- Una vez confirmado el usuario, solicitar el establecimiento de contrasena mediante correo administrado por Auth0 y validar el claim en un access token real.
- Antes de integrar login interactivo en la SPA, revisar en Dashboard si `Username-Password-Authentication` debe habilitarse para `ITECSA Frontend Local`; esta accion no se ejecuto en este paso.
- No avanzar a variables de entorno, frontend, backend, Prisma, MySQL ni persistencia de datos hasta cerrar expresamente este paso.

## Riesgos o supuestos

- Los fixtures actuales incluyen material de autenticacion de prueba visible en la interfaz; deben eliminarse al sustituir el login mock.
- La UI actual maneja temporalmente campos que no deben persistirse ni enviarse de forma insegura al integrar Auth0.
- El frontend actual puede mostrar accesos segun rol, pero el backend aun no impide acceso no autorizado.
- El binding de la Action fue realizado manualmente en Dashboard porque el MCP disponible no ofrece una operacion para administrar el flujo Post Login; futuras revisiones deben confirmar que no se duplique su instancia.
- La emision efectiva del claim en un access token queda pendiente de una validacion de login con usuario controlado; no se crearon usuarios ni metadata para forzar esa prueba en este paso.
- El correo bootstrap fue proporcionado por el equipo para uso controlado, pero no se registra completo para evitar exposicion de datos personales en documentacion.
- El usuario bootstrap y su metadata `rolUsuario = Administrador` no se pudieron verificar ni configurar porque el MCP Auth0 expuesto en este paso no ofrece operaciones de usuarios.
- La creacion futura queda condicionada a un flujo que no requiera generar, mostrar ni registrar una contrasena inicial fuera de Auth0.
- La conexion Database esperada fue confirmada en la auditoria previa como administrada por Auth0 y sin aplicaciones habilitadas visibles; el MCP disponible en este paso no permite revalidar ni modificar conexiones.
- No se detectaron recursos base ITECSA compatibles antes de la creacion; la verificacion posterior muestra una sola SPA, una sola API propia y una sola aplicacion M2M ITECSA.

## Ultima actualizacion del handoff

- Paso revisado: `5. Usuario bootstrap Administrador via MCP o registro manual controlado` (pendiente, no completado).
- Fecha: `2026-05-26`.
- Verificacion de Action: se confirmo mediante MCP una unica Action `ITECSA Add Role Claim`, trigger `post-login/v3`, runtime `node22`, desplegada y sin secretos.
- Contrato del claim: lee `event.user.app_metadata.rolUsuario` y agrega `https://itecsa.local/rolUsuario` solo al access token para los valores `Administrador`, `Gerencia`, `Operario`, `Ventas` o `Cobranzas`.
- Conexion Database: `Username-Password-Authentication` se conserva segun la confirmacion manual registrada en pasos anteriores; el MCP expuesto no permite revalidar conexiones y no se encontro evidencia que contradiga ese estado.
- Bootstrap: el equipo entrego un correo controlado, pero el MCP Auth0 expuesto no permite buscar, crear ni actualizar usuarios; no se verifico usuario existente ni `app_metadata.rolUsuario`.
- Pendiente manual: contar con una operacion Auth0 autorizada para verificar primero la existencia del bootstrap y, solo si no existe, crearlo con rol `Administrador`, usando para la contrasena un flujo de correo administrado por Auth0.
- Control de secretos y alcance: no se documento el correo completo ni se guardaron secretos, tokens o contrasenas; no se modifico frontend, backend, conexiones, usuarios ni roles.
