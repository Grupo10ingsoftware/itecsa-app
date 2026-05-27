# Handoff Auth0 Inicial - ITECSA

## Rama y objetivo

- Rama: `auth0-inicial`.
- Objetivo futuro: reemplazar la autenticacion simulada de la SPA React por Auth0 e incorporar validacion de autenticacion/autorizacion en Express.
- Este documento registra el estado encontrado en el repositorio y los recursos Auth0 confirmados mediante auditoria de solo lectura; no confirma implementaciones pendientes.

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
- Actions: no se encontraron Actions en el tenant; no existe una Action Post Login visible equivalente a `ITECSA Add Role Claim`.
- Conexion Database `Username-Password-Authentication`: existencia confirmada mediante revision manual del Dashboard; usa almacenamiento administrado por Auth0 porque `Use my own database` esta desactivado.
- Aplicaciones habilitadas para la conexion Database: ninguna visible en la revision manual.
- Usuarios: la vista de usuarios se encontraba vacia; no existe un usuario bootstrap Administrador visible.
- Roles: la vista de roles se encontraba vacia; no existe un rol `Administrador` visible.
- Recursos reutilizables: la conexion `Username-Password-Authentication` puede reutilizarse para ITECSA; `Auth0 Management API` no reemplaza la API propia esperada.
- Duplicados o conflictos: no se observaron duplicados entre aplicaciones, APIs, Actions, usuarios o roles visibles; crear una segunda conexion Database con el mismo proposito generaria duplicacion innecesaria.
- Auditoria ejecutada exclusivamente en modo lectura mediante MCP y revision manual del Dashboard. No se crearon, modificaron, eliminaron ni rotaron recursos; no se consultaron ni documentaron secretos o datos personales.

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
- No se modificaron recursos Auth0 ni se realizaron acciones de configuracion.
- No se hicieron cambios funcionales de frontend o backend.
- El archivo `docs/auth0-inicial/HANDOFF.md` esta registrado en Git desde el commit `716b08b`.

## Pasos completados

- [x] 1. Auditoria inicial repo y handoff
- [x] 2. Auditoria Auth0 via MCP
- [ ] 3. Recursos Auth0 base via MCP
- [ ] 4. Action Post Login via MCP
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

- Mantener detenido el avance despues de documentar esta auditoria; no crear ni configurar recursos en este paso.
- En un paso posterior expresamente autorizado, reutilizar la conexion `Username-Password-Authentication` y crear la SPA `ITECSA Frontend Local`, la API con audience `https://api.itecsa.local`, la aplicacion M2M `ITECSA Backend Management`, la Action Post Login `ITECSA Add Role Claim`, el rol `Administrador` y el usuario bootstrap Administrador, o equivalentes compatibles.
- Cuando se configure la SPA en un paso posterior, habilitar para ella la conexion Database existente; actualmente no tiene aplicaciones asociadas.
- No implementar Prisma, MySQL, frontend, backend, variables de entorno ni persistencia de datos como parte de esta auditoria.

## Riesgos o supuestos

- Los fixtures actuales incluyen material de autenticacion de prueba visible en la interfaz; deben eliminarse al sustituir el login mock.
- La UI actual maneja temporalmente campos que no deben persistirse ni enviarse de forma insegura al integrar Auth0.
- El frontend actual puede mostrar accesos segun rol, pero el backend aun no impide acceso no autorizado.
- Faltan de forma confirmada los recursos ITECSA visibles esperados: SPA, API propia, aplicacion M2M, Action Post Login, rol `Administrador` y usuario bootstrap Administrador.
- La conexion Database esperada existe, es administrada por Auth0 y no tiene aplicaciones habilitadas actualmente.
- No se detectaron duplicados entre los recursos visibles; se debe reutilizar la conexion existente y evitar crear otra con el mismo proposito.

## Ultima actualizacion del handoff

- Paso completado: `2. Auditoria Auth0 via MCP`.
- Fecha: `2026-05-26`.
- Resumen: se auditaron en modo solo lectura aplicaciones, Resource Servers y Actions mediante MCP, y se completo la revision manual de conexion Database, usuarios y roles mediante capturas del Dashboard.
- Comandos ejecutados:
  - `git branch --show-current`, `git status --short --branch`, `git ls-files` y `git log`: confirmaron rama `auth0-inicial`, arbol limpio previo a esta actualizacion y handoff versionado en el commit `716b08b`.
  - Consultas Auth0 MCP de solo lectura para aplicaciones, Resource Servers y Actions: confirmaron los recursos visibles y la ausencia de recursos ITECSA esperados.
  - Busqueda exacta del Resource Server `https://api.itecsa.local`: no devolvio resultados.
- Capturas revisadas:
  - Revision manual de `Authentication > Database`: confirmo la conexion `Username-Password-Authentication`, administrada por Auth0 y sin aplicaciones asociadas visibles.
  - Revision manual de `User Management > Users` y `Roles`: confirmo que ambas vistas se encontraban vacias.
- Resultado: tenant `itecsa-sistema.us.auth0.com` confirmado; se observo la API interna `Auth0 Management API` y la conexion Database reutilizable `Username-Password-Authentication`, sin SPA, API propia, M2M, Action Post Login, rol ni usuario bootstrap ITECSA visibles.
- Recursos faltantes confirmados: SPA equivalente a `ITECSA Frontend Local`, API con audience `https://api.itecsa.local`, M2M equivalente a `ITECSA Backend Management`, Action Post Login equivalente a `ITECSA Add Role Claim`, rol `Administrador` y usuario bootstrap Administrador.
- Control de cambios Auth0: no se realizaron creaciones, modificaciones, eliminaciones ni rotaciones de secretos en el tenant.
