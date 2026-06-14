# Auditoria tecnica de trazabilidad RF contra codigo fuente

Repositorio auditado: `itecsa-app`  
Rama local: `dev`  
Documento fuente: `C:\Users\danag\Downloads\CDU OMT (1).docx`  
Fecha de auditoria: 2026-06-14

## Resumen ejecutivo

- Total de RF auditados desde el documento adjunto: **22**.
- Implementados: **16**.
- Parcialmente implementados: **4**.
- No implementados: **0**.
- Sin evidencia suficiente: **1**.
- Implementados pero inconsistentes con el documento: **1**.

Principales riesgos encontrados:

- **Numeracion RF inconsistente:** el documento adjunto usa `RF32` para listado/ingreso a gestion de usuarios, mientras `docs/TRAZABILIDAD_INCREMENTO_1.md` usa `RF32` para bloqueo de avance Kanban sin pago confirmado. En el `.docx`, esa regla aparece como `RF44`.
- **Dependencias externas aceptadas como parte del sistema:** `RF01` y `RF06` quedan implementados con Auth0 Universal Login y Auth0 change password, respaldados por `docs/auth0/universal-login.html` y `docs/ARQUITECTURA.md`.
- **Primer ingreso no trazable:** `RF02` sigue sin evidencia suficiente; el HTML de Universal Login no demuestra deteccion de primer ingreso ni bloqueo del acceso solo a cambio de contrasena.
- **Registro de usuarios inconsistente:** `RF31` pide contrasena y firma XML/CMS/PDF, pero el codigo establece contrasena por correo Auth0 y acepta firma PDF/PNG/JPG/JPEG/WebP.
- **Roles documentados vs codigo:** `RF12` menciona rol `Produccion`, pero el catalogo real usa `Operario`. El codigo tambien controla acciones por permisos Auth0, no solo por rol.
- **Formatos de firma inconsistentes:** el documento pide firma XML/CMS/PDF para usuarios, pero frontend/backend aceptan PDF/PNG/JPG/JPEG/WebP; la firma de pagos solo soporta imagen PNG/JPG/JPEG.
- **Persistencia desigual:** usuarios estan persistidos en Prisma/MySQL; pagos, Kanban y pedidos tienen integracion backend real, pero hay evidencia historica en docs de uso mock y algunos flujos frontend aun tienen componentes/mock de apoyo.
- **Pruebas concentradas en backend:** hay pruebas para auth, usuarios, pagos, firma y Kanban; no se encontro suite frontend automatizada.

## Arquitectura identificada

- Frontend: React 19 + Vite en `capaVista`, con modulos `auth`, `users`, `payments`, `kanban`, `orders`, rutas en `capaVista/src/app/router.jsx` y guards `ProtectedRoute`/`RoleGuard`.
- Backend: Express 5 en `capaServidor`, rutas montadas en `capaServidor/src/server.js:28` a `capaServidor/src/server.js:92`.
- Base de datos/modelos: Prisma/MySQL en `capaServidor/prisma/schema.prisma`, con modelos `Usuario`, `Pedidos`, `Documento`, `Nota_Venta`, `Registro_Pago`, `Estado_Pago`, `Estado_Pedido`, `Firma_Documento`, `Firma_Pago`.
- Autenticacion/autorizacion: Auth0 en frontend (`@auth0/auth0-react`) y backend (`checkJwt`), roles en claim `https://itecsa.local/roles`, permisos en claim `permissions`; el formulario Auth0 Lock versionado esta en `docs/auth0/universal-login.html` y el flujo se describe en `docs/ARQUITECTURA.md:32`.
- Rutas/API relevantes:
  - Auth: `GET /api/auth/verify`, `POST /api/auth/password-reset/request`.
  - Usuarios admin: `GET /api/admin/users`, `GET /api/admin/users/summary`, `POST /api/admin/users`, `PATCH /api/admin/users/:userId`, `PATCH /api/admin/users/:userId/status`, `POST /api/admin/users/password-setup-email`.
  - Pedidos/Kanban/pagos: `GET /api/orders`, `GET /api/orders/kanban`, `PATCH /api/orders/:orderId/payment-status`, `PATCH /api/orders/:orderId/move`, `GET /api/orders/:orderId/payment-signature-preview`.
  - Documentos: `GET /api/documents/nvs/:filename`.
- Pruebas: `capaServidor/test/*.test.js` cubre auth, usuarios, permisos, documentos, pagos, firma y Kanban. No se encontro carpeta de pruebas frontend.

## Matriz de auditoria

| RF | Nombre / objetivo | Estado de implementacion | Evidencia en codigo | Archivos relevantes | Brecha detectada | Riesgo | Recomendacion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RF01 | Inicio de sesion con formulario correo/contrasena | Implementado con dependencia externa Auth0 | Auth0 Lock provee formulario con correo/contrasena, mensajes y conexion database; la SPA inicia el flujo y backend verifica token | `docs/auth0/universal-login.html:57`, `docs/auth0/universal-login.html:67`, `docs/auth0/universal-login.html:68`, `docs/auth0/universal-login.html:79`, `docs/auth0/universal-login.html:93`, `docs/auth0/universal-login.html:110`, `docs/auth0/universal-login.html:111`, `capaVista/src/modules/auth/components/LoginForm.jsx:9`, `capaVista/src/app/providers/AuthProvider.jsx:42`, `capaServidor/src/modules/auth/controller/auth.controller.js:80` | La configuracion principal del formulario vive en Auth0 y debe mantenerse versionada/evidenciada | Medio | Mantener el HTML de Auth0 en `docs/auth0/universal-login.html` y enlazarlo en la trazabilidad final |
| RF02 | Cambio obligatorio de contrasena en primer ingreso | Sin evidencia suficiente | Existen reglas de contrasena y correo Auth0 de establecimiento, pero no deteccion local de primer ingreso ni vista obligatoria | `capaVista/src/modules/auth/utils/authValidation.js:6`, `capaServidor/src/modules/users/service/auth0Management.service.js:486`, `capaVista/src/modules/users/components/UserCreateForm.jsx:366` | No se evidencia bloqueo de navegacion a solo cambio de contrasena | Usuarios nuevos podrian depender de configuracion externa no auditable | Trazar a configuracion Auth0 con evidencia o implementar estado/flujo verificable en codigo |
| RF31 | Registro de usuarios por Administrador | Implementado pero inconsistente | Alta admin, validaciones, Auth0, persistencia y firma existen | `capaVista/src/modules/users/components/UserCreateForm.jsx:143`, `capaVista/src/modules/users/components/UserCreateForm.jsx:332`, `capaServidor/src/modules/users/routes/adminUsers.routes.js:37`, `capaServidor/src/modules/users/validators/adminUsers.validator.js:48`, `capaServidor/src/modules/users/repo/users.repo.js:167` | No recibe contrasena; firma acepta PDF/PNG/JPG/JPEG/WebP, no XML/CMS; la contrasena se establece por correo Auth0 | Diferencia fuerte entre RF y comportamiento real | Actualizar RF o codigo. Si se mantiene Auth0, eliminar contrasena del RF y declarar formatos reales de firma |
| RF33 | Filtrado rapido de usuarios | Implementado | Busqueda y filtros por estado/rol; backend filtra por nombre, apellido, correo, RUT y rol | `capaVista/src/modules/users/components/UserManagementFilters.jsx:27`, `capaVista/src/modules/users/components/UserManagementFilters.jsx:62`, `capaVista/src/modules/users/components/UserManagementFilters.jsx:88`, `capaServidor/src/modules/users/repo/users.repo.js:95`, `capaServidor/src/modules/users/repo/users.repo.js:120` | Placeholder frontend no menciona apellido ni rol, aunque backend si filtra | Baja, confusion de usuario | Ajustar placeholder/documentacion UI para reflejar criterios reales |
| RF32 | Acceso a Gestion usuarios y listado | Implementado | Ruta protegida por Administrador, listado, resumen, tabla y API admin | `capaVista/src/app/router.jsx:72`, `capaVista/src/app/router.jsx:75`, `capaVista/src/modules/users/pages/UserManagementPage.jsx:121`, `capaVista/src/modules/users/components/UserManagementTable.jsx:66`, `capaServidor/src/modules/users/routes/adminUsers.routes.js:25` | Numeracion colisiona con trazabilidad existente de pagos/Kanban | Alto para matriz final | Renombrar/normalizar fuente oficial de RF antes de hacer trazabilidad final |
| RF06 | Recuperacion de contrasena por correo | Implementado con dependencia externa Auth0 | Universal Login deriva a `/recuperar-contrasena`; pantalla propia solicita correo; backend valida usuario activo y llama Auth0 `change_password` | `docs/auth0/universal-login.html:59`, `docs/auth0/universal-login.html:113`, `docs/ARQUITECTURA.md:51`, `docs/ARQUITECTURA.md:57`, `capaVista/src/modules/auth/pages/PasswordResetPage.jsx:55`, `capaVista/src/modules/auth/api/passwordResetApi.js:43`, `capaServidor/src/modules/auth/routes/auth.routes.js:68`, `capaServidor/src/modules/auth/controller/auth.controller.js:164`, `capaServidor/src/modules/users/service/auth0Management.service.js:486` | La URL temporal/de un uso y la pantalla final de nueva contrasena quedan bajo Auth0 | Medio | Registrar Auth0 como componente del sistema y conservar evidencia del template/flujo de recuperacion |
| RF08 | Cierre de sesion desde cualquier interfaz | Implementado | Boton logout en layout y llamada a Auth0 logout | `capaVista/src/modules/auth/components/LogoutButton.jsx:5`, `capaVista/src/modules/auth/components/LogoutButton.jsx:8`, `capaVista/src/app/providers/AuthProvider.jsx:101`, `capaVista/src/shared/components/layout/Sidebar.jsx:7` | Sin brecha funcional relevante | Bajo | Mantener evidencia y agregar prueba UI si se requiere |
| RF05 | Acceso segun rol | Implementado | Guards frontend por rol/permiso, backend valida JWT/rol/permisos | `capaVista/src/app/router.jsx:43`, `capaVista/src/shared/components/navigation/RoleGuard.jsx:36`, `capaVista/src/shared/components/navigation/RoleGuard.jsx:44`, `capaServidor/src/middlewares/requireAdministrador.js:4`, `capaServidor/src/middlewares/requirePermission.js:8`, `capaServidor/src/modules/auth/controller/auth.controller.js:92` | Depende de permisos Auth0 externos para matriz completa | Medio | Trazar roles/permisos Auth0 como artefacto de configuracion |
| RF36 | Edicion de usuarios por Administrador | Parcialmente implementado | Modal edita nombre, apellido, correo, rol, estado; backend actualiza Auth0 e interno | `capaVista/src/modules/users/components/UserEditModal.jsx:94`, `capaVista/src/modules/users/components/UserEditModal.jsx:183`, `capaVista/src/modules/users/api/adminUsersApi.js:47`, `capaServidor/src/modules/users/routes/adminUsers.routes.js:50`, `capaServidor/src/modules/users/validators/adminUsers.validator.js:154`, `capaServidor/src/modules/users/repo/users.repo.js:197` | No edita RUT ni firma electronica aunque el RF lo pide; no hay carga de nueva firma en PATCH | Medio | Extender edicion o corregir RF a campos reales |
| RF11 | Detalle de pedido desde Kanban | Implementado | Tarjeta tiene accion Detalle y abre offcanvas/modal con datos del pedido | `capaVista/src/modules/kanban/components/KanbanCard.jsx:70`, `capaVista/src/modules/kanban/components/KanbanColumn.jsx:199`, `capaVista/src/modules/kanban/components/KanbanColumn.jsx:341`, `capaVista/src/modules/kanban/components/KanbanOffCanvas.jsx:54`, `capaVista/src/modules/kanban/components/KanbanOffCanvas.jsx:58` | El documento dice modal; codigo usa offcanvas con role dialog | Bajo | Documentar offcanvas como variante de modal o ajustar texto del RF |
| RF10 | Acceso al tablero Kanban | Implementado | Ruta `/kanban`, navegacion y guard por permiso | `capaVista/src/config/routes.js:7`, `capaVista/src/config/routes.js:17`, `capaVista/src/app/router.jsx:49`, `capaVista/src/modules/auth/pages/AccessDeniedPage.jsx:16`, `capaServidor/src/modules/orders/routes/order.routes.js:34` | Boton documentado como "Principal"; codigo usa ruta Kanban/area principal | Bajo | Alinear nombre UI en documento o menu |
| RF12 | Cambio manual por arrastrar y soltar | Parcialmente implementado | DnD frontend y PATCH backend existen; bloqueo por pago y permiso para mover a produccion | `capaVista/src/modules/kanban/components/KanbanColumn.jsx:2`, `capaVista/src/modules/kanban/components/KanbanColumn.jsx:249`, `capaVista/src/modules/kanban/components/KanbanColumn.jsx:292`, `capaServidor/src/modules/orders/routes/order.routes.js:51`, `capaServidor/src/modules/orders/service/order.service.js:161` | No se encontro modal de segunda confirmacion; rol `Produccion` no existe, se usa `Operario` y permisos | Alto por autorizacion y flujo de confirmacion | Definir rol oficial y agregar confirmacion o ajustar RF |
| RF17 | Vista previa de edicion de estado de pago | Implementado | Boton Gestionar, opciones Confirmar/Rechazar/Pendiente y modal de confirmacion | `capaVista/src/modules/payments/components/PaymentRowActions.jsx:14`, `capaVista/src/modules/payments/components/PaymentRowActions.jsx:20`, `capaVista/src/modules/payments/components/PaymentRowActions.jsx:152`, `capaVista/src/modules/payments/pages/PaymentConfirmationPage.jsx:261`, `capaVista/src/modules/payments/components/PaymentActionConfirmModal.jsx:252` | Backend controla permiso, no rol literal Cobranzas | Medio | Trazar permiso `update:payment-status` al rol Cobranzas en configuracion Auth0 |
| RF09 | Actualizacion automatica a Listo para produccion al confirmar pago y firmar | Implementado | Backend firma NV, actualiza pago y mueve Kanban; frontend invoca endpoint real | `capaVista/src/modules/payments/api/paymentsApi.js:5`, `capaVista/src/modules/payments/pages/PaymentConfirmationPage.jsx:177`, `capaServidor/src/modules/orders/service/order.service.js:248`, `capaServidor/src/modules/orders/service/order.service.js:269`, `capaServidor/src/modules/orders/service/order.service.js:275`, `capaServidor/test/ordersMock.service.test.js:114` | Estado en codigo usa "Listo para produccion" sin tilde | Bajo | Normalizar nombres de estados entre documento, BD y UI |
| RF25 | Filtros rapidos por estado de pago | Implementado | Chips/filtros por Pendientes, Rechazados, Confirmados y conteos | `capaVista/src/modules/payments/pages/PaymentConfirmationPage.jsx:29`, `capaVista/src/modules/payments/components/PaymentFilters.jsx:16`, `capaVista/src/modules/payments/components/PaymentFilters.jsx:28`, `capaVista/src/modules/payments/pages/PaymentConfirmationPage.jsx:127` | Etiquetas en plural, no singular | Bajo | Aceptar plural como UI o documentarlo |
| RF19 | Busqueda avanzada de pedidos | Parcialmente implementado | Barra de busqueda filtra por NV, empresa y RUT | `capaVista/src/modules/payments/components/PaymentFilters.jsx:41`, `capaVista/src/modules/payments/pages/PaymentConfirmationPage.jsx:127`, `capaVista/src/modules/payments/pages/PaymentConfirmationPage.jsx:135`, `capaVista/src/modules/payments/pages/PaymentConfirmationPage.jsx:137` | No filtra por fecha de adjunto de NV ni por criterios separados avanzados | Medio | Agregar criterio fecha y/o controles avanzados, o ajustar RF a busqueda global |
| RF20 | Vista previa de nota de venta | Implementado | Boton Nota de venta y modal PDF | `capaVista/src/modules/payments/components/SalesNoteButton.jsx:26`, `capaVista/src/modules/payments/components/SalesNotePreviewModal.jsx:28`, `capaVista/src/modules/payments/components/PdfPreviewFrame.jsx:118`, `capaServidor/src/modules/documents/routes/document.routes.js:8` | Falta mensaje exacto "Vista previa no disponible" en la evidencia revisada | Bajo | Homologar mensajes de error de preview |
| RF21 | Descarga de nota de venta | Implementado | Modal expone Descargar PDF y utilidad descarga blob | `capaVista/src/modules/payments/components/SalesNotePreviewModal.jsx:171`, `capaVista/src/modules/payments/components/SalesNotePreviewModal.jsx:175`, `capaVista/src/modules/payments/utils/paymentDocuments.js:174` | Sin brecha relevante | Bajo | Agregar prueba frontend o e2e |
| RF23 | Actualizar estado de pago con mantener presionado | Implementado | Hold de 2 segundos y PATCH a backend | `capaVista/src/modules/payments/pages/PaymentConfirmationPage.jsx:26`, `capaVista/src/modules/payments/pages/PaymentConfirmationPage.jsx:323`, `capaVista/src/modules/payments/pages/PaymentConfirmationPage.jsx:328`, `capaVista/src/modules/payments/components/PaymentActionConfirmModal.jsx:209`, `capaServidor/src/modules/orders/routes/order.routes.js:45` | Sin evidencia de prueba frontend del hold | Medio | Agregar test de interaccion o e2e |
| RF24 | Ajuste manual del tamano del modal | Parcialmente implementado | Existe modo expandido y resize responsive del visor PDF | `capaVista/src/modules/payments/components/DocumentPreviewModalLayout.jsx:33`, `capaVista/src/modules/payments/components/DocumentPreviewModalLayout.jsx:53`, `capaVista/src/modules/payments/components/SalesNotePreviewModal.jsx:251`, `capaVista/src/modules/payments/components/PdfPreviewFrame.jsx:118` | No hay redimensionamiento manual libre tipo drag/resize; solo expandir/contraer | Bajo | Cambiar RF a expandir modal o implementar resize manual |
| RF22 | Imprimir nota de venta | Implementado | Boton Imprimir PDF y utilidad que invoca print en iframe | `capaVista/src/modules/payments/components/SalesNotePreviewModal.jsx:161`, `capaVista/src/modules/payments/components/SalesNotePreviewModal.jsx:165`, `capaVista/src/modules/payments/utils/paymentDocuments.js:252`, `capaVista/src/modules/payments/utils/paymentDocuments.js:321` | No se encontro mensaje exacto "No existe documento asociado para imprimir" | Bajo | Ajustar mensaje de error para cumplir RF |
| RF44 | Restringir cambio manual a Listo para produccion sin pago confirmado | Implementado | Frontend bloquea avance y backend rechaza con mensaje de pago pendiente | `capaVista/src/modules/kanban/components/KanbanColumn.jsx:262`, `capaVista/src/modules/kanban/components/KanbanColumn.jsx:263`, `capaServidor/src/modules/orders/service/order.service.js:161`, `capaServidor/src/modules/orders/controller/orders.controller.js:131`, `capaServidor/test/kanban.routes.test.js:90`, `capaServidor/test/ordersMock.service.test.js:236` | Mensaje de falla de consulta BD del documento no se evidencia literal | Medio | Homologar error tecnico de consulta de pago y mantener prueba de bloqueo |

## RF01 - Inicio de sesion mediante formulario de autenticacion

**Resultado:** Implementado con dependencia externa Auth0

**Que pide el documento:**  
Formulario de inicio de sesion con correo electronico y contrasena obligatorios, validacion de formato de correo y validacion de contrasena contra datos de usuario.

**Evidencia encontrada en el codigo:**  
- Template versionado de Auth0 Universal Login usa `Auth0Lock`: `docs/auth0/universal-login.html:93`.
- El formulario Auth0 define conexion database `Username-Password-Authentication`: `docs/auth0/universal-login.html:57` y `docs/auth0/universal-login.html:110`.
- El formulario Auth0 muestra campos de correo y contrasena: `docs/auth0/universal-login.html:67` y `docs/auth0/universal-login.html:68`.
- El formulario Auth0 bloquea registro publico con `allowSignUp: false`: `docs/auth0/universal-login.html:111`.
- El formulario Auth0 configura mensaje de credenciales invalidas: `docs/auth0/universal-login.html:79`.
- `LoginForm` inicia el flujo con `loginWithRedirect`: `capaVista/src/modules/auth/components/LoginForm.jsx:4` y `capaVista/src/modules/auth/components/LoginForm.jsx:9`.
- `AuthProvider` expone `loginWithRedirect` y verifica sesion contra backend: `capaVista/src/app/providers/AuthProvider.jsx:42`.
- Backend valida token y contrato de rol/permisos en `GET /api/auth/verify`: `capaServidor/src/modules/auth/controller/auth.controller.js:80`.
- Arquitectura documenta Classic Universal Login personalizado: `docs/ARQUITECTURA.md:32`.

**Analisis:**  
El inicio de sesion cumple el RF bajo el criterio de que Auth0 Universal Login forma parte del sistema. El formulario no vive en React, pero si esta definido y versionado como template Auth0, con campos, mensajes y conexion database. La SPA inicia el flujo y el backend valida el token resultante.

**Brechas:**  
- La configuracion principal del formulario opera en Auth0; debe mantenerse versionada y referenciada como evidencia externa del sistema.
- Los mensajes exactos del documento no coinciden palabra por palabra con todos los mensajes del template, aunque cubren los casos equivalentes.

**Recomendacion:**  
Mantener `docs/auth0/universal-login.html` como evidencia obligatoria en la trazabilidad y registrar Auth0 Universal Login como componente del sistema para RF01.

## RF02 - Cambio obligatorio de contrasena en primer ingreso

**Resultado:** Sin evidencia suficiente

**Que pide el documento:**  
Detectar primer inicio de sesion, limitar acceso solo a vista de cambio de contrasena y validar formato minimo de nueva contrasena.

**Evidencia encontrada en el codigo:**  
- Reglas de contrasena en frontend: `capaVista/src/modules/auth/utils/authValidation.js:6` a `capaVista/src/modules/auth/utils/authValidation.js:26`.
- Alta de usuarios informa que la contrasena se establece por correo Auth0: `capaVista/src/modules/users/components/UserCreateForm.jsx:366`.
- Backend solicita correo Auth0 change password: `capaServidor/src/modules/users/service/auth0Management.service.js:486`.

**Analisis:**  
Hay piezas relacionadas con establecimiento de contrasena, pero no una vista propia ni una regla local de primer ingreso. El template de Universal Login versionado no demuestra deteccion de primer ingreso ni bloqueo del acceso solo a cambio de contrasena.

**Brechas:**  
- Sin modelo/campo local de primer ingreso.
- Sin guard que limite navegacion a cambio de contrasena.
- Sin endpoint propio de cambio de contrasena.

**Recomendacion:**  
Documentar evidencia externa especifica de Auth0 para primer ingreso obligatorio o implementar un indicador auditable de primer ingreso.

## RF31 - Registro de nuevos usuarios por Administrador

**Resultado:** Implementado pero inconsistente

**Que pide el documento:**  
Administrador registra nombre, apellido, RUT, correo unico, rol, contrasena y firma XML/CMS/PDF.

**Evidencia encontrada en el codigo:**  
- Formulario frontend valida y envia alta: `capaVista/src/modules/users/components/UserCreateForm.jsx:143` y `capaVista/src/modules/users/api/adminUsersApi.js:27`.
- Roles oficiales en select: `capaVista/src/modules/users/components/UserCreateForm.jsx:332`.
- Ruta admin protegida: `capaServidor/src/modules/users/routes/adminUsers.routes.js:37`.
- Validaciones backend: `capaServidor/src/modules/users/validators/adminUsers.validator.js:48`.
- Persistencia en `Usuario`: `capaServidor/src/modules/users/repo/users.repo.js:167`.
- Formatos reales de firma: `capaServidor/src/modules/users/middleware/signatureUpload.js:13`.

**Analisis:**  
El alta funciona con Auth0 y BD interna, pero el requisito no coincide con el diseno real. El sistema no recibe contrasena del administrador; solicita correo de establecimiento. Los formatos de firma tambien difieren.

**Brechas:**  
- Falta contrasena como campo operativo.
- Firma XML/CMS no soportada.
- Firma imagen soportada aunque no aparece en el documento.

**Recomendacion:**  
Corregir el RF para alinearlo a Auth0, o cambiar la implementacion si el docente exige contrasena administrada por el sistema.

## RF33 - Filtrado rapido de usuarios por Administrador

**Resultado:** Implementado

**Que pide el documento:**  
Localizar usuarios por nombre, apellido, correo, RUT y rol; filtros por estado y rol.

**Evidencia encontrada en el codigo:**  
- UI de busqueda/filtros: `capaVista/src/modules/users/components/UserManagementFilters.jsx:27`.
- Chips de estado: `capaVista/src/modules/users/components/UserManagementFilters.jsx:62`.
- Filtros de rol: `capaVista/src/modules/users/components/UserManagementFilters.jsx:88`.
- Backend filtra por nombre, apellido, correo y RUT: `capaServidor/src/modules/users/repo/users.repo.js:99` a `capaServidor/src/modules/users/repo/users.repo.js:103`.
- Backend filtra por rol: `capaServidor/src/modules/users/repo/users.repo.js:113`.

**Analisis:**  
La funcionalidad esta cubierta. La UI podria describir mejor que tambien filtra por apellido y rol.

**Brechas:**  
- Placeholder frontend dice "Buscar por nombre, correo o RUT", omite apellido.

**Recomendacion:**  
Ajustar texto visible o documentar criterios reales.

## RF32 - Listado de usuarios registrados

**Resultado:** Implementado

**Que pide el documento:**  
Administrador accede a "Gestion usuarios" y visualiza listado de usuarios registrados.

**Evidencia encontrada en el codigo:**  
- Ruta `/admin/usuarios` protegida por rol Administrador y permiso visual: `capaVista/src/app/router.jsx:72` a `capaVista/src/app/router.jsx:79`.
- Carga de usuarios desde API: `capaVista/src/modules/users/pages/UserManagementPage.jsx:121`.
- Tabla muestra usuarios y mensaje vacio: `capaVista/src/modules/users/components/UserManagementTable.jsx:66`.
- Backend expone `GET /api/admin/users`: `capaServidor/src/modules/users/routes/adminUsers.routes.js:25`.

**Analisis:**  
El RF esta implementado. La colision de numeracion con `RF32` de trazabilidad existente es el problema principal.

**Brechas:**  
- `docs/TRAZABILIDAD_INCREMENTO_1.md` usa `RF32` para otro objetivo.

**Recomendacion:**  
Antes de crear matriz final, congelar una fuente oficial de numeracion.

## RF06 - Recuperacion de contrasena mediante correo electronico

**Resultado:** Implementado con dependencia externa Auth0

**Que pide el documento:**  
Flujo "Olvide mi contrasena", correo existente, enlace unico/temporal/de un uso, vista para nueva contrasena y validacion de formato.

**Evidencia encontrada en el codigo:**  
- Universal Login reemplaza el link nativo de recuperacion por `/recuperar-contrasena`: `docs/auth0/universal-login.html:59` y `docs/auth0/universal-login.html:113`.
- Arquitectura documenta que la recuperacion inicia en Classic Universal Login y continua en la SPA: `docs/ARQUITECTURA.md:51`.
- Arquitectura documenta que el backend solicita a Auth0 el correo de cambio de contrasena mediante `/dbconnections/change_password`: `docs/ARQUITECTURA.md:57`.
- Pagina publica solicita correo: `capaVista/src/modules/auth/pages/PasswordResetPage.jsx:55`.
- API frontend llama `/auth/password-reset/request`: `capaVista/src/modules/auth/api/passwordResetApi.js:43`.
- Ruta backend publica: `capaServidor/src/modules/auth/routes/auth.routes.js:68`.
- Backend valida estado activo/vinculado: `capaServidor/src/modules/auth/controller/auth.controller.js:164`.
- Auth0 change_password: `capaServidor/src/modules/users/service/auth0Management.service.js:486`.

**Analisis:**  
El flujo esta implementado bajo el criterio de que Auth0 forma parte del sistema. La pantalla inicial `/recuperar-contrasena` es propia; el backend valida correo y estado interno antes de llamar Auth0; Auth0 cubre el correo, el enlace temporal/de un uso y la pantalla final para establecer la nueva contrasena.

**Brechas:**  
- La URL temporal/de un uso y la pantalla final no viven en el repo, sino en Auth0.
- La trazabilidad final debe conservar evidencia del template Auth0 y de la configuracion del tenant.

**Recomendacion:**  
Registrar Auth0 como componente del sistema para RF06 y enlazar `docs/auth0/universal-login.html`, `docs/ARQUITECTURA.md` y el endpoint backend en la matriz final.

## RF08 - Cierre de sesion desde cualquier interfaz

**Resultado:** Implementado

**Que pide el documento:**  
Cualquier usuario autenticado puede cerrar sesion desde cualquier vista.

**Evidencia encontrada en el codigo:**  
- Boton logout consume `useAuth`: `capaVista/src/modules/auth/components/LogoutButton.jsx:5`.
- Ejecuta `logout()`: `capaVista/src/modules/auth/components/LogoutButton.jsx:8`.
- AuthProvider llama Auth0 logout: `capaVista/src/app/providers/AuthProvider.jsx:101`.
- Navegacion principal esta en layout/sidebar: `capaVista/src/shared/components/layout/Sidebar.jsx:7`.

**Analisis:**  
Cumple funcionalmente.

**Brechas:**  
- Sin prueba automatizada frontend.

**Recomendacion:**  
Agregar prueba e2e simple de logout si se requiere evidencia formal.

## RF05 - Acceso a funcionalidades segun rol

**Resultado:** Implementado

**Que pide el documento:**  
Usuarios acceden solo a vistas/modulos/acciones autorizadas por rol; acceso denegado cuando corresponda.

**Evidencia encontrada en el codigo:**  
- Rutas protegidas dentro de `ProtectedRoute`: `capaVista/src/app/router.jsx:43`.
- `RoleGuard` evalua permiso y rol: `capaVista/src/shared/components/navigation/RoleGuard.jsx:36` a `capaVista/src/shared/components/navigation/RoleGuard.jsx:44`.
- Admin backend exige rol unico Administrador: `capaServidor/src/middlewares/requireAdministrador.js:4`.
- Acciones sensibles por permiso: `capaServidor/src/middlewares/requirePermission.js:8`.
- Verificacion Auth0 roles/permisos: `capaServidor/src/modules/auth/controller/auth.controller.js:92`.

**Analisis:**  
Existe control frontend y backend. La fuente de verdad es Auth0 RBAC.

**Brechas:**  
- La matriz final debe incluir configuracion Auth0, no solo codigo.

**Recomendacion:**  
Documentar tabla rol-permiso y claims esperados.

## RF36 - Edicion de usuarios por Administrador

**Resultado:** Parcialmente implementado

**Que pide el documento:**  
Modificar nombre, apellido, correo con unicidad, rol, estado y firma electronica.

**Evidencia encontrada en el codigo:**  
- Modal prepara payload de edicion: `capaVista/src/modules/users/components/UserEditModal.jsx:94`.
- Select de rol/estado: `capaVista/src/modules/users/components/UserEditModal.jsx:183` y `capaVista/src/modules/users/components/UserEditModal.jsx:203`.
- API PATCH usuario: `capaVista/src/modules/users/api/adminUsersApi.js:47`.
- Ruta PATCH admin: `capaServidor/src/modules/users/routes/adminUsers.routes.js:50`.
- Validacion backend de update: `capaServidor/src/modules/users/validators/adminUsers.validator.js:154`.
- Persistencia interna: `capaServidor/src/modules/users/repo/users.repo.js:197`.

**Analisis:**  
La edicion existe para datos principales, rol y estado. No se encontro edicion de firma electronica ni RUT.

**Brechas:**  
- Falta cambio de firma.
- Falta cambio de RUT si se considera atributo requerido.
- La unicidad de correo se maneja por Auth0/BD, no esta explicitada como validacion previa.

**Recomendacion:**  
Completar los campos faltantes o ajustar el RF.

## RF11 - Visualizacion del detalle del pedido

**Resultado:** Implementado

**Que pide el documento:**  
Ver detalle de pedido al hacer clic sobre un pedido del Kanban.

**Evidencia encontrada en el codigo:**  
- Tarjeta muestra accion Detalle: `capaVista/src/modules/kanban/components/KanbanCard.jsx:70`.
- Estado de pedido seleccionado: `capaVista/src/modules/kanban/components/KanbanColumn.jsx:199`.
- Click abre detalle: `capaVista/src/modules/kanban/components/KanbanColumn.jsx:341`.
- Offcanvas de detalle con `role="dialog"`: `capaVista/src/modules/kanban/components/KanbanOffCanvas.jsx:54`.

**Analisis:**  
Cumple el objetivo. La implementacion usa offcanvas en vez de modal clasico.

**Brechas:**  
- Diferencia semantica modal/offcanvas.

**Recomendacion:**  
Registrar offcanvas como componente equivalente de detalle.

## RF10 - Acceder al tablero Kanban

**Resultado:** Implementado

**Que pide el documento:**  
Usuarios autenticados y vinculados acceden al tablero Kanban desde navegacion principal.

**Evidencia encontrada en el codigo:**  
- Ruta `/kanban`: `capaVista/src/config/routes.js:7`.
- Item de navegacion Kanban: `capaVista/src/config/routes.js:22`.
- Guard por permiso `VIEW_KANBAN_MODULE`: `capaVista/src/app/router.jsx:49`.
- Backend expone `/api/orders/kanban`: `capaServidor/src/modules/orders/routes/order.routes.js:34`.

**Analisis:**  
El acceso esta implementado.

**Brechas:**  
- Documento habla de boton "Principal"; codigo usa etiqueta Kanban/area principal.

**Recomendacion:**  
Normalizar nombres en UI y RF.

## RF12 - Cambio manual de estado por arrastrar y soltar

**Resultado:** Parcialmente implementado

**Que pide el documento:**  
Usuarios autorizados, Administrador y Produccion, arrastran pedidos entre columnas con confirmacion modal.

**Evidencia encontrada en el codigo:**  
- DnD con `@dnd-kit/react`: `capaVista/src/modules/kanban/components/KanbanColumn.jsx:2`.
- Handler `handleDragEnd`: `capaVista/src/modules/kanban/components/KanbanColumn.jsx:249`.
- Llamada backend move: `capaVista/src/modules/kanban/components/KanbanColumn.jsx:292`.
- Endpoint PATCH move: `capaServidor/src/modules/orders/routes/order.routes.js:51`.
- Regla backend de movimiento: `capaServidor/src/modules/orders/service/order.service.js:161`.

**Analisis:**  
El drag and drop existe. La autorizacion se expresa con permisos y reglas, no con rol `Produccion`. No se encontro modal de segunda confirmacion.

**Brechas:**  
- Rol `Produccion` no existe; catalogo real usa `Operario`.
- Falta modal de confirmacion.
- Documento dice destino no automatico; la regla real tambien considera pago confirmado.

**Recomendacion:**  
Alinear rol, permiso y confirmacion. Agregar prueba de UI de confirmacion si se implementa.

## RF17 - Vista previa de edicion de estado de pago

**Resultado:** Implementado

**Que pide el documento:**  
Cobranzas despliega menu Gestionar con opciones Rechazar/Confirmar y abre vista previa de edicion.

**Evidencia encontrada en el codigo:**  
- Acciones Confirmar/Rechazar: `capaVista/src/modules/payments/components/PaymentRowActions.jsx:14` y `capaVista/src/modules/payments/components/PaymentRowActions.jsx:20`.
- Boton Gestionar: `capaVista/src/modules/payments/components/PaymentRowActions.jsx:152`.
- Apertura de confirmacion: `capaVista/src/modules/payments/pages/PaymentConfirmationPage.jsx:261`.
- Modal de accion: `capaVista/src/modules/payments/components/PaymentActionConfirmModal.jsx:252`.

**Analisis:**  
El flujo esta implementado en UI. La restriccion sensible se controla por permiso backend.

**Brechas:**  
- Falta evidencia local de que solo Cobranzas tenga el permiso en Auth0.

**Recomendacion:**  
Incluir tabla de permisos Auth0 en trazabilidad final.

## RF09 - Actualizacion automatica de estado pedido

**Resultado:** Implementado

**Que pide el documento:**  
Al confirmar pago y firmar digitalmente la nota de venta, el pedido pasa automaticamente a `Listo para produccion`.

**Evidencia encontrada en el codigo:**  
- Frontend invoca `PATCH /orders/:id/payment-status`: `capaVista/src/modules/payments/api/paymentsApi.js:5`.
- Pagina procesa actualizacion: `capaVista/src/modules/payments/pages/PaymentConfirmationPage.jsx:177`.
- Backend define pasos Kanban: `capaServidor/src/modules/orders/service/order.service.js:248`.
- Backend firma documento al confirmar: `capaServidor/src/modules/orders/service/order.service.js:269`.
- Backend actualiza pago y paso: `capaServidor/src/modules/orders/service/order.service.js:275`.
- Prueba backend: `capaServidor/test/ordersMock.service.test.js:114`.

**Analisis:**  
La regla principal esta implementada con firma y cambio automatico.

**Brechas:**  
- Estado sin tilde en codigo.

**Recomendacion:**  
Normalizar catalogo de estados.

## RF25 - Filtrado rapido por estado de pago

**Resultado:** Implementado

**Que pide el documento:**  
Cobranzas filtra por Confirmado, Rechazado y Pendiente.

**Evidencia encontrada en el codigo:**  
- Filtros definidos: `capaVista/src/modules/payments/pages/PaymentConfirmationPage.jsx:29`.
- Componente renderiza filtros: `capaVista/src/modules/payments/components/PaymentFilters.jsx:16`.
- Click cambia filtro: `capaVista/src/modules/payments/components/PaymentFilters.jsx:28`.
- Filtrado por estado: `capaVista/src/modules/payments/pages/PaymentConfirmationPage.jsx:132`.

**Analisis:**  
Cumple.

**Brechas:**  
- Etiquetas en plural.

**Recomendacion:**  
Sin accion critica.

## RF19 - Filtros de busqueda avanzado

**Resultado:** Parcialmente implementado

**Que pide el documento:**  
Busqueda por RUT empresa, numero de nota de venta, nombre empresa y fecha de adjunto de nota de venta.

**Evidencia encontrada en el codigo:**  
- Barra de busqueda: `capaVista/src/modules/payments/components/PaymentFilters.jsx:41`.
- Filtrado en memoria: `capaVista/src/modules/payments/pages/PaymentConfirmationPage.jsx:127`.
- Criterios incluidos: NV, empresa, RUT: `capaVista/src/modules/payments/pages/PaymentConfirmationPage.jsx:135` a `capaVista/src/modules/payments/pages/PaymentConfirmationPage.jsx:137`.

**Analisis:**  
Hay busqueda global, pero no avanzada por criterios ni fecha de adjunto.

**Brechas:**  
- Falta fecha de adjunto.
- Falta seleccion de criterios separados.

**Recomendacion:**  
Agregar fecha y controles de filtro avanzado o ajustar RF.

## RF20 - Vista previa de nota de venta

**Resultado:** Implementado

**Que pide el documento:**  
Modal de vista previa de Nota de Venta por boton "Nota de venta".

**Evidencia encontrada en el codigo:**  
- Boton: `capaVista/src/modules/payments/components/SalesNoteButton.jsx:26`.
- Modal preview: `capaVista/src/modules/payments/components/SalesNotePreviewModal.jsx:28`.
- Visor PDF responsive: `capaVista/src/modules/payments/components/PdfPreviewFrame.jsx:118`.
- Backend sirve NV: `capaServidor/src/modules/documents/routes/document.routes.js:8`.

**Analisis:**  
Cumple.

**Brechas:**  
- Mensaje de excepcion no localizado literalmente.

**Recomendacion:**  
Alinear mensajes si el documento exige exactitud.

## RF21 - Descarga de Nota de Venta

**Resultado:** Implementado

**Que pide el documento:**  
Descargar Nota de Venta desde modal.

**Evidencia encontrada en el codigo:**  
- Boton descargar: `capaVista/src/modules/payments/components/SalesNotePreviewModal.jsx:171` y `capaVista/src/modules/payments/components/SalesNotePreviewModal.jsx:175`.
- Utilidad descarga archivo: `capaVista/src/modules/payments/utils/paymentDocuments.js:174`.

**Analisis:**  
Cumple.

**Brechas:**  
- Sin prueba automatizada frontend.

**Recomendacion:**  
Agregar prueba e2e si la trazabilidad final exige evidencia ejecutable.

## RF23 - Actualizar estado de pago

**Resultado:** Implementado

**Que pide el documento:**  
Mantener presionado "Mantener para confirmar cambio" para confirmar/rechazar pago.

**Evidencia encontrada en el codigo:**  
- Constante hold 2 segundos: `capaVista/src/modules/payments/pages/PaymentConfirmationPage.jsx:26`.
- Handler hold: `capaVista/src/modules/payments/pages/PaymentConfirmationPage.jsx:323`.
- Timer: `capaVista/src/modules/payments/pages/PaymentConfirmationPage.jsx:328`.
- Boton hold en modal: `capaVista/src/modules/payments/components/PaymentActionConfirmModal.jsx:209`.
- Endpoint backend protegido: `capaServidor/src/modules/orders/routes/order.routes.js:45`.

**Analisis:**  
Cumple el flujo descrito.

**Brechas:**  
- No se encontro prueba frontend automatizada del hold.

**Recomendacion:**  
Agregar test de interaccion.

## RF24 - Ajuste manual del tamano del modal

**Resultado:** Parcialmente implementado

**Que pide el documento:**  
Permitir ajustar manualmente el tamano del modal de vista previa.

**Evidencia encontrada en el codigo:**  
- Layout acepta `expanded`: `capaVista/src/modules/payments/components/DocumentPreviewModalLayout.jsx:33`.
- Clase expandida: `capaVista/src/modules/payments/components/DocumentPreviewModalLayout.jsx:53`.
- Control de expandir en modal: `capaVista/src/modules/payments/components/SalesNotePreviewModal.jsx:251`.
- Visor recalcula ancho con `ResizeObserver`: `capaVista/src/modules/payments/components/PdfPreviewFrame.jsx:118`.

**Analisis:**  
Existe expandir/contraer y ajuste responsive, pero no resize manual libre.

**Brechas:**  
- No hay drag handle ni resize arbitrario.

**Recomendacion:**  
Cambiar RF a "expandir modal" o implementar resize manual.

## RF22 - Imprimir Nota de Venta

**Resultado:** Implementado

**Que pide el documento:**  
Imprimir Nota de Venta desde el modal.

**Evidencia encontrada en el codigo:**  
- Boton imprimir: `capaVista/src/modules/payments/components/SalesNotePreviewModal.jsx:161` y `capaVista/src/modules/payments/components/SalesNotePreviewModal.jsx:165`.
- Funcion `printPdf`: `capaVista/src/modules/payments/utils/paymentDocuments.js:252`.
- Invoca `contentWindow.print()`: `capaVista/src/modules/payments/utils/paymentDocuments.js:321`.

**Analisis:**  
Cumple funcionalmente.

**Brechas:**  
- No se encontro mensaje exacto de excepcion "No existe documento asociado para imprimir".

**Recomendacion:**  
Homologar mensajes de excepcion.

## RF44 - Restriccion de cambio manual a Listo para produccion

**Resultado:** Implementado

**Que pide el documento:**  
Impedir cambio manual a `Listo para produccion` si el pago no esta `Confirmado`.

**Evidencia encontrada en el codigo:**  
- Frontend bloquea avance si pago no confirmado: `capaVista/src/modules/kanban/components/KanbanColumn.jsx:262`.
- Mensaje frontend: `capaVista/src/modules/kanban/components/KanbanColumn.jsx:263`.
- Backend rechaza si pago no confirmado: `capaServidor/src/modules/orders/service/order.service.js:161`.
- Controller devuelve 409 para mensaje de pago pendiente: `capaServidor/src/modules/orders/controller/orders.controller.js:131`.
- Pruebas: `capaServidor/test/kanban.routes.test.js:90` y `capaServidor/test/ordersMock.service.test.js:236`.

**Analisis:**  
La regla central esta cubierta en frontend, backend y pruebas.

**Brechas:**  
- No se encontro mensaje literal de excepcion por falla de consulta: "Error de sistema al verificar el estado de pago".

**Recomendacion:**  
Agregar manejo/mensaje especifico para falla de consulta de pago.

## RF sin evidencia clara en codigo

- `RF02`: no hay evidencia suficiente de vista obligatoria local ni deteccion local de primer ingreso.

## RF parcialmente implementados

- `RF12`: falta modal de segunda confirmacion y hay inconsistencia de rol.
- `RF19`: falta fecha de adjunto y filtros avanzados separados.
- `RF24`: solo expandir/contraer, no resize manual libre.
- `RF36`: no edita firma electronica ni RUT.

## Inconsistencias graves entre documento y codigo

- `RF32` duplicado/confuso: listado de usuarios en el `.docx` vs bloqueo Kanban en `docs/TRAZABILIDAD_INCREMENTO_1.md`.
- `RF31`: contrasena administrada documentada vs correo Auth0 de establecimiento real.
- `RF31`: firma XML/CMS/PDF documentada vs PDF/PNG/JPG/JPEG/WebP real.
- `RF36`: firma editable documentada vs sin endpoint/campo de edicion de firma.
- `RF12`: rol `Produccion` documentado vs rol real `Operario` y permiso `move:kanban-to-production`.
- Estados con diferencias de escritura: `Listo para producción` en documento vs `Listo para produccion` en codigo.
- Mensajes de excepcion del documento no siempre aparecen literalmente en UI/backend.
- Documento de trazabilidad actual menciona RF26/RF28/RF32 para pagos, pero esos RF no aparecen asi en el `.docx` adjunto auditado.

## Funcionalidades presentes en codigo pero no claramente documentadas en el `.docx`

- Auth0 Universal Login customizado y versionado en `docs/auth0/universal-login.html`.
- Auth0 RBAC como fuente de roles/permisos y verificacion de JWT.
- Permiso `update:payment-status` separado de visualizacion de pagos.
- Vista previa de Nota de Venta firmada antes de confirmar pago.
- Bloqueo de cambios desde pago confirmado hacia pendiente/rechazado.
- Estados internos `Pendiente rol`, `Activo` normalizado como `Vinculado`.
- Endpoint de salud `/api/health` y `/api/health/db`.
- Modulo de creacion de pedidos/ventas existente en `capaVista/src/modules/orders`, no cubierto por los RF de este documento.

## Propuesta de estructura para futuro documento de trazabilidad real

1. Portada y alcance de auditoria.
2. Fuente oficial de requisitos, version y fecha.
3. Diccionario normalizado de RF, roles, permisos, estados y terminos UI.
4. Matriz RF a evidencia tecnica:
   - RF.
   - Caso de uso asociado.
   - Vista/componente frontend.
   - Endpoint/backend.
   - Servicio/regla de negocio.
   - Modelo/base de datos.
   - Validaciones.
   - Autorizacion/rol/permiso.
   - Prueba asociada.
   - Estado de cobertura.
   - Brecha y accion pendiente.
5. Seccion de configuracion externa obligatoria:
   - Auth0 tenant, roles, permisos, claims, templates de correo.
   - Variables de entorno necesarias sin secretos.
6. Registro de inconsistencias documento-codigo.
7. Evidencia de pruebas y fecha de ejecucion.
8. Anexos: rutas API, mapa de componentes, modelos Prisma.

## Checklist tecnico para completar la trazabilidad

- [ ] Definir fuente unica de numeracion RF y resolver colision `RF32`.
- [ ] Mantener versionada la evidencia Auth0 de RF01 y RF06 (`docs/auth0/universal-login.html` y `docs/ARQUITECTURA.md`).
- [ ] Incorporar evidencia adicional de Auth0 o codigo propio para primer ingreso obligatorio de RF02.
- [ ] Mapear permisos Auth0 por rol real: Administrador, Gerencia, Operario, Ventas, Cobranzas.
- [ ] Corregir `Produccion` vs `Operario` en documento o codigo.
- [ ] Normalizar estados: Confirmacion de pago, Listo para produccion, En produccion, Listo para entrega; con o sin tildes.
- [ ] Alinear formatos de firma electronica entre RF, frontend y backend.
- [ ] Completar edicion de firma/RUT o ajustar `RF36`.
- [ ] Agregar filtro por fecha de adjunto de NV o ajustar `RF19`.
- [ ] Implementar confirmacion modal de drag and drop o ajustar `RF12`.
- [ ] Homologar mensajes de excepcion exigidos por documento.
- [ ] Agregar pruebas frontend/e2e para login esperado, guards, pagos, hold, preview, imprimir/descargar y Kanban.
- [ ] Enlazar cada prueba backend existente al RF correspondiente.
- [ ] Marcar explicitamente que evidencia mock no equivale a persistencia productiva cuando aplique.
