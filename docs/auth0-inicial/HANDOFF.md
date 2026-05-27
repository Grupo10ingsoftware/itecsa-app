# Handoff Auth0 Inicial - ITECSA

## Rama y objetivo

- Rama: `auth0-inicial`.
- Objetivo futuro: reemplazar la autenticacion simulada de la SPA React por Auth0 e incorporar validacion de autenticacion/autorizacion en Express.
- Este documento registra el estado encontrado; no confirma recursos externos de Auth0 ni implementaciones pendientes.

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

- Tenant: no auditado.
- SPA, API/audience, aplicacion Machine to Machine, conexion de base de datos y Action Post Login: no auditados.
- Usuario bootstrap, scopes concedidos, recursos reutilizables o duplicados: no confirmados.
- No ejecutar configuracion ni crear recursos hasta realizar una auditoria Auth0 de solo lectura en un paso expresamente autorizado.

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
- No se auditaron ni modificaron recursos Auth0.
- No se hicieron cambios funcionales de frontend o backend.
- El archivo `docs/auth0-inicial/HANDOFF.md` existia al iniciar esta auditoria y se encontraba sin seguimiento en Git.

## Pasos completados

- [x] 1. Auditoria inicial repo y handoff
- [ ] 2. Auditoria Auth0 via MCP
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

- Paso pendiente: auditoria Auth0 de solo lectura para confirmar recursos existentes o faltantes.
- No fue ejecutado durante esta tarea.

## Riesgos o supuestos

- Los fixtures actuales incluyen material de autenticacion de prueba visible en la interfaz; deben eliminarse al sustituir el login mock.
- La UI actual maneja temporalmente campos que no deben persistirse ni enviarse de forma insegura al integrar Auth0.
- El frontend actual puede mostrar accesos segun rol, pero el backend aun no impide acceso no autorizado.
- Cualquier dato o recurso Auth0 descrito en pasos futuros requiere verificacion previa; no se asume existente.

## Ultima actualizacion del handoff

- Paso completado: `1. Auditoria inicial repo y handoff`.
- Fecha: `2026-05-26`.
- Resumen: se verificaron login mock, sesion en memoria, guards visuales, formulario administrativo, mocks y plantilla Express; se documento el estado sin implementar funcionalidad.
- Comandos ejecutados:
  - `git branch --show-current` y `git status --short --branch`: confirmaron rama `auth0-inicial` y que `docs/` no esta seguido por Git.
  - `rg --files` y `rg -n`: localizaron archivos y referencias relevantes de auth, usuarios, guards y servidor.
  - `Get-Content -Raw` sobre el handoff y archivos relevantes de `capaVista/src` y `capaServidor/src`: confirmo el flujo simulado y ausencia de autenticacion backend.
  - `git log`, `git diff --stat` y `git diff`: no evidenciaron cambios funcionales previos dentro del alcance revisado.
- Resultado: handoff tecnico actualizado; pasos posteriores permanecen pendientes.
- Pendientes: auditoria Auth0 y cualquier implementacion de integracion.
