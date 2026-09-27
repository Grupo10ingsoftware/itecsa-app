# USERS — Auditoría técnica y plan maestro de acción

## 1. Metadatos

| Dato | Valor |
|---|---|
| Objeto auditado | Users / gestión administrativa de usuarios / identidad, acceso y ciclo de vida |
| Fecha de ejecución | 2026-09-27, zona `America/Santiago` |
| Repositorio | `/Users/overmine/Documents/Desarrollo/ItecsaApp/itecsa-app` |
| Rama | `opt-users` |
| HEAD inicial y final de auditoría | `d7645ab202dfc7ba2c7ca0c33827d804df224c08` |
| Worktree inicial | Limpio |
| Worktree antes de crear este informe | Limpio |
| Node / npm | Node `v24.20.0`; npm `11.19.0` |
| Prisma | CLI y cliente `7.10.0` |
| Motor/base observada | MySQL `8.4.8`; base lógica `mydb` |
| Runtime configurado durante la auditoría | `APP_ENV=development`; `NODE_ENV` ausente |
| Enfoque | Inspección estática, tests con dobles, consultas SQL de solo lectura, `EXPLAIN`, validación Prisma y build aislado |
| Cambios de producción | Ninguno |
| Escrituras en BD | Ninguna |
| Auth0 real | No consultado ni modificado |
| Email real | No solicitado ni enviado |
| Secretos/PIN | No se imprimieron, rotaron, revelaron ni regeneraron |

Este informe usa la Ley 21.719 como marco técnico objetivo de protección de datos para el sistema final. No afirma cumplimiento legal total ni certificación ISO. La contrastación final con [LeyChile/BCN, texto oficial de la Ley 21.719](https://www.bcn.cl/leychile/Navegar?idNorma=1209272&idVersion=2026-12-01) confirmó publicación el 13-12-2024 y vigencia diferida al 01-12-2026; por tanto, a la fecha de esta auditoría todavía no había entrado en vigencia la reforma. Las demás versiones o referencias normativas cuya exactitud no se comprobó externamente se conservan como marco provisto por el prompt y, cuando corresponde, se marcan `REFERENCIA REQUIERE VERIFICACIÓN ADICIONAL`.

## 2. Resumen ejecutivo

Users no es un CRUD aislado. La autenticación vive en Auth0; el rol efectivo se origina en Auth0 RBAC y llega en el access token; la base local decide si la identidad está activa, conserva datos personales, relaciona al usuario con operaciones de negocio y almacena el ciclo de PIN. Cada petición autenticada pasa por JWT, identidad local activa, rol/permissions del token y rate limit. La gestión administrativa cruza Auth0 Management, MySQL, PIN y correo.

La autorización departamental está implementada server-side y se probó: Administrador Producción gestiona AP/OP, Administrador Ventas AV/OV, Administrador Cobranzas AC/OC y Soporte todos los roles funcionales, pero nunca el propio rol Soporte. Existen allowlists de payload, control de permiso `manage:users`, protección contra self-unlink y self-role-change, y el PIN se elimina del body antes del controller. Estas defensas descartan varios falsos positivos habituales.

Los riesgos prioritarios son:

1. **P0 — Mutaciones distribuidas sin recuperación ejecutable.** Crear, editar rol/email y cambiar estado pueden dejar Auth0 y MySQL divergentes. Las respuestas `recoverable` de creación no tienen un reconciliador ni una operación idempotente de continuación; la UI además cierra el modal y pierde la única acción de reenvío.
2. **P0 — Reemplazo de rol destructivo.** La edición hace PATCH de email/metadata, elimina todos los roles oficiales y luego asigna el nuevo. Una falla final deja la cuenta sin rol externo y sin compensación. Un token antiguo puede seguir siendo aceptado mientras coincida con el rol local.
3. **P0 — Deriva de esquema/migraciones/base.** La base observada registra cuatro migraciones, dos de ellas ausentes del árbol local; siete migraciones locales no figuran aplicadas. `SecurityAuditEvent` y `SecurityThrottle` no existen físicamente, aunque están en el schema. `prisma migrate status` falla. En el entorno observado la cuota usa memoria por `APP_ENV=development`; en producción el DDL faltante rompería la cuota persistente y hoy las escrituras administrativas no dejan el evento de auditoría diseñado.
4. **P0 — Entrega de recuperación de PIN insegura/incompleta.** La selección del delivery usa `NODE_ENV`, pero el servidor gobierna el entorno con `APP_ENV`. Si producción omite `NODE_ENV`, el delivery de desarrollo puede registrar correo y código en claro. Si `NODE_ENV=production`, no existe proveedor real y la recuperación responde 503.
5. **P1 — Máquina de estados incompleta.** `Pendiente rol` se cuenta y filtra como vinculado; no hay recuperación formal. El backend admite reactivación, pero la SPA solo desvincula. PIN, correo y rol pueden quedar desalineados después de fallas parciales.
6. **P1 — Privacidad/calidad.** El repositorio lee filas completas de `Usuario`, incluidos hashes, salts y ciphertexts PIN, aunque proyecta correctamente la respuesta. La actividad laboral se expone mediante movimientos y se prefetch-ea al pasar el puntero. RUT no valida dígito verificador ni tiene unicidad física. Los challenges PIN vencidos no se purgan.
7. **P2 — Rendimiento condicionado al crecimiento.** Con 12 usuarios el costo es pequeño. `EXPLAIN` confirma escaneo para resumen y búsqueda `%texto%`; no hay índices de rol/estado. La primera carga ejecuta cuatro consultas locales y las mutaciones vuelven a pedir lista+resumen. Auth0 solicita token M2M en cada operación, enumera roles dos veces al editar y no define timeout.

No se recomienda implementar índices, cache de autorización ni cambios de secretos sin medir y reconciliar primero el terreno.

## 3. Alcance y limitaciones

### Incluido

- Todo `capaVista/src/modules/users/**` y todo `capaServidor/src/modules/users/**` actual.
- Router SPA, guards, AuthProvider, cliente HTTP y catálogo compartido de autorización.
- `checkJwt`, identidad activa, capacidades, PIN, Auth controller y profile.
- Auth0 Management path, RBAC documentado, correo de contraseña y metadata auxiliar.
- Modelo Prisma, migraciones locales, historial físico de migraciones, índices/FK y agregados de calidad sin PII.
- Consumidores relevantes en orders, payments, history, messages, production y profile.
- Tests backend/frontend, lint, build, Prisma validate, migrate status, auditoría npm y pruebas controladas con mocks.

### Excluido o no verificable

- Estado actual del tenant Auth0, usuarios/roles directos, bindings, scopes M2M y sesiones reales: no se hicieron llamadas reales.
- Contenido/entrega actual del proveedor de correo Auth0.
- Contratos, bases jurídicas, políticas laborales, retención organizacional y respuesta a derechos.
- Conformidad de accesibilidad completa: no hubo lector de pantalla, contraste instrumental ni navegador E2E.
- Carga real a 1.000/10.000 usuarios: se usaron planes e inferencia, no inserciones masivas.
- La aplicabilidad organizacional plena de Ley 21.663 y normas sectoriales.

## 4. Arquitectura real y límites de confianza

```text
SPA React
  ├─ Auth0 React SDK obtiene access token para VITE_AUTH0_AUDIENCE
  ├─ AuthProvider llama GET /api/auth/verify
  └─ Users UI llama /api/admin/users*
          │ Bearer token + payload/PII/PIN según acción
          ▼
Express
  requestContext → checkJwt → requireActiveIdentity → rate limit
                 → requireCapability(manage:users)
                 → requirePin (solo edit/status)
                 → validator/controller
          ├─ Auth0 Management API: identidad, blocked, RBAC, metadata
          ├─ Auth0 change_password: side effect de correo
          ├─ Prisma/MySQL: Usuario, PIN, relaciones y movimientos
          └─ SecurityAuditEvent: diseñado, pero tabla ausente en BD observada
```

| Límite | Datos/autoridad que cruza | Control observado | Riesgo residual |
|---|---|---|---|
| Navegador → API | token, filtros, PII, rol solicitado, PIN | TLS depende de despliegue; JWT; allowlists; PIN middleware | No timeout/cancelación; PIN vive temporalmente en estado React y body |
| Token Auth0 → backend | `sub`, rol namespaced, permissions, email | Firma/audience/issuer; exactamente un rol; capacidad = catálogo local ∩ claim | Estado `blocked` y email externo no se consultan por request |
| Backend → Auth0 Management | secreto M2M, token, email, blocked, roles | scopes explícitos; secretos solo env; respuestas normalizadas | Secuencias no atómicas, sin timeout/compensación/reconciliación |
| Backend → MySQL | PII, identidad, rol/estado, PIN, actividad | unique email/id_auth0, FK, Prisma | Deriva de migraciones; columnas de negocio nullable; overfetch de PIN |
| Backend → correo Auth0 | email | endpoint oficial `change_password` | Sin throttle por cuenta para reenvío administrativo; entrega real no verificada |

## 5. Frontend

### Inventario actual

| Archivo | Rol | Estado |
|---|---|---|
| `api/adminUsersApi.js` | Contratos HTTP, cache 15 s de movimientos | Activo |
| `hooks/useAdminUsersApi.js` | Token Auth0 + API client | Activo |
| `pages/UserManagementPage.jsx` | Listado, filtros, summary y modales | Activo, ruta `/admin/usuarios` |
| `pages/UserManagementPage.module.css` | Estilos del módulo y movimientos | Activo, 1.103 líneas |
| `components/UserCreateForm.jsx` | Create + intento de reenvío | Activo dentro de modal |
| `components/UserCreateModal.jsx` | Contenedor de alta | Activo |
| `components/UserEditModal.jsx` | Edit email/datos/rol con PIN | Activo |
| `components/UserUnlinkConfirmModal.jsx` | Desvinculación con PIN | Activo |
| `components/UserMovementsModal.jsx` | Actividad reciente del usuario | Activo, no estaba en mapa inicial |
| filtros, tabla, mobile list, badge, summary, button | Presentación/acciones | Activos |
| `utils/userValidation.js` | Validación de creación | Activo |
| `pages/UserCreatePage.jsx` + CSS | Página separada de alta | Muerto confirmado en router actual |

### Flujos UI

| Acción | Origen | API | Observación |
|---|---|---|---|
| Listar/filtrar | `UserManagementPage.loadUsers` | GET `/admin/users` | debounce 350 ms y protección contra respuesta antigua |
| Summary | `loadSummary` | GET `/admin/users/summary` | sin versionado de requests; error se muestra como ceros |
| Crear | `UserCreateForm.handleSubmit` | POST `/admin/users` | parent cierra modal incluso si `recoverable=true` |
| Reenviar password setup | `handlePasswordSetupEmailRequest` | POST `/admin/users/password-setup-email` | en la ruta real queda inaccesible tras el cierre del modal |
| Editar | `UserEditModal` | PATCH `/admin/users/:idAuth0` | PIN de 6 dígitos; rol propio deshabilitado |
| Desvincular | `UserUnlinkConfirmModal` | PATCH `/admin/users/:idAuth0/status` | PIN; no existe acción visual de reactivar |
| Movimientos | hover/focus prefetch y modal | GET `/admin/users/:idAuth0/movements` | cache de PII/actividad por 15 s |

### UX/accesibilidad observada

- Labels, `aria-invalid`, `aria-describedby`, encabezados de tabla, `scope`, estados y botones semánticos están presentes en los caminos principales.
- Movimientos usa `<dialog>` nativo y restaura foco. Los modales create/edit/unlink usan contenedores `role=dialog`, mueven foco inicial y soportan Escape, pero no implementan focus trap ni restauración explícita al disparador.
- La SPA impide submit mientras `isSubmitting`; faltan pruebas específicas de doble submit y cierre/respuesta tardía para Users create/edit/status.
- El error de desvinculación se coloca en el mensaje de la página detrás del modal y el PIN se limpia; no hay error local claro.
- No se verificó contraste instrumental. `outline: none` se compensa en varias clases mediante borde/focus-within, pero requiere prueba de teclado y contraste.

## 6. Backend

### Inventario actual

| Archivo | Responsabilidad | Símbolos clave |
|---|---|---|
| `routes/adminUsers.routes.js` | 7 endpoints y orden de middleware | `createAdminUsersRouter` |
| `controller/adminUsers.controller.js` | orquestación, scope, self-rules, parciales | handlers list/summary/movements/create/update/status/email |
| `repo/users.repo.js` | `Usuario`, summary y `Registros` | `UserRepository`, `toUserResponse` |
| `service/auth0Management.service.js` | M2M, roles, profile/status, email | create/update/status/getRole/requestEmail |
| `validators/adminUsers.validator.js` | allowlists, formato, filtros | 5 validators |

`middleware/signatureUpload.js` no existe en el árbol actual. Git confirma que fue retirado por commits de eliminación de firma/rutas; no debe recrearse.

### Orden efectivo de middlewares

- Todos los endpoints admin: `checkJwt` → `requireActiveIdentity` → `authenticatedRateLimit` → `requireAdministrativeRole` (`manage:users`).
- PATCH edit/status agrega `requirePin` antes del controller; el middleware valida el PIN del actor y elimina `body.pin`.
- Create y password setup email no exigen PIN.
- Scope departamental se vuelve a validar en controller y se aplica en la query de lista/summary.

## 7. Matriz de endpoints

| Método | Endpoint | Consumidor | Auth/permiso/PIN | Controller | Service/repo | Datos/side effect | Estado |
|---|---|---|---|---|---|---|---|
| GET | `/api/admin/users` | Management page | JWT + identidad activa + `manage:users` | `createListAdminUsersHandler` | `users.list` | PII paginada | Activo |
| GET | `/api/admin/users/summary` | Summary cards | igual | `createAdminUsersSummaryHandler` | `users.getSummary` | 2 counts | Activo |
| GET | `/api/admin/users/:userId/movements` | Movements modal/prefetch | igual + target scope | `createAdminUserMovementsHandler` | `listMovements` | actividad laboral | Activo, agregado al mapa inicial |
| POST | `/api/admin/users` | Create modal | igual; sin PIN | `createAdminUserHandler` | Auth0 create/role → DB → PIN → email | 4 sistemas | Activo, no atómico |
| POST | `/api/admin/users/password-setup-email` | Create form | igual; target activo/scope; sin PIN | `createPasswordSetupEmailHandler` | local lookup → Auth0 email | correo real potencial | Activo, sin UI durable |
| PATCH | `/api/admin/users/:userId` | Edit modal | igual + PIN | `createUpdateAdminUserHandler` | Auth0 email/metadata/RBAC → DB | PII/rol | Activo, no atómico |
| PATCH | `/api/admin/users/:userId/status` | Unlink UI; reactivación solo API | igual + PIN | `createUpdateAdminUserStatusHandler` | Auth0 blocked → DB status → PIN | estado/PIN | Activo, no atómico |

## 8. Auth0 Management / RBAC

### Fuente y operaciones

- Token M2M solicitado a `/oauth/token` con `read:users`, `create:users`, `update:users`, `read:roles`.
- Create: token → enumerar/resolver rol → crear Database user con email/password temporal → asignar rol.
- Update: token → PATCH email + `app_metadata.rolUsuario` → enumerar roles dos veces en paralelo → DELETE de todos los roles oficiales → POST del nuevo rol.
- Status: token → PATCH `blocked` + `app_metadata.estadoUsuario`.
- Verificación de divergencia de rol: token → GET roles del usuario con totals; exige exactamente un rol oficial.
- Password setup/reset: `/dbconnections/change_password`, sin ticket ni URL expuesta.

### Llamadas externas mínimas observadas por operación, con una página de roles

| Operación | Llamadas |
|---|---:|
| Create exitoso | 4 Management (token, list roles, create user, assign role) + 1 email |
| Update exitoso | 6 Management (token, patch user, 2× list roles, delete roles, assign role) |
| Status | 2 Management (token, patch user) |
| Role mismatch en request normal | 2 Management (token, get user roles) |
| Reenvío email | 1 Authentication API |

No existe cache de token/roles ni timeout/retry explícito. No se recomienda cachear autorización sin TTL, invalidación y análisis de freshness.

### Evidencia de configuración

La documentación histórica del 25-09-2026 afirma 25 permisos, RBAC activo, RS256, Action Post Login vinculada y asociaciones de roles verificadas. No acredita el tenant al 27-09-2026. El archivo que la documentación nombra como `rbac.observed.2026-09-25.json` no existe; solo existe un snapshot del 06-09. El tenant real no se consultó.

Hay contradicción documental: README afirma que update no persiste `app_metadata.rolUsuario`, pero el código y su test sí lo envían; status también duplica estado en metadata. RBAC sigue siendo la autoridad de autorización, por lo que esa metadata es redundante y crea otra representación a reconciliar.

## 9. Modelo de identidad local

| Campo/grupo | Semántica observada | Constraints físicos | Fuente principal actual |
|---|---|---|---|
| `id_usuario` | clave interna y FK de negocio | PK autoincrement | MySQL |
| `id_auth0` | vínculo con `sub` | NOT NULL, unique | Auth0 genera; MySQL enlaza |
| `correo_usuario` | contacto/login reflejado localmente | NOT NULL, unique, collation CI | Escrito en ambos sistemas |
| RUT/nombre/apellido | PII laboral interna | nullable; RUT no unique | MySQL |
| `rol_usuario` | espejo local del rol externo | nullable, sin FK/check | Auth0 RBAC efectivo; MySQL cache/invariante |
| `estado_usuario` | autoridad local de acceso activo | nullable, sin check | MySQL por request; Auth0 `blocked` espejo externo |
| PIN hash/salt | validación de PIN aceptado | nullable | MySQL; hash independiente de `PIN_SECRET` |
| fingerprint | unicidad global del PIN | unique | HMAC derivado de `PIN_SECRET` |
| pending ciphertext/IV/tag | revelación única antes de aceptar | nullable | AES-GCM derivado de `PIN_SECRET` |
| failed/locked | anti-fuerza bruta | defaults/nullable | MySQL |
| recovery challenge | recuperación de PIN | FK cascade + índice user/date | MySQL |

La respuesta administrativa proyecta campos y no envía material PIN. Sin embargo, `findMany`, `findUnique`, `create` y `update` del repositorio no usan `select`, por lo que Prisma transporta material PIN al proceso antes de descartarlo.

## 10. Schema vs migraciones vs base física

### Resultado de contraste

| Aspecto | Schema actual | Migraciones locales | Base observada | Resultado |
|---|---|---|---|---|
| Campos PIN + challenges | Presentes | Las migraciones que los crearon no están en el árbol | Presentes | Deriva histórica |
| Migraciones PIN físicas | N/A | Ausentes | `20260830100000_reconcile_aiven_pin_prerequisite`, `20260830103000_add_personal_pins` registradas | No reproducible desde repo |
| Migraciones de roles y septiembre | Reflejadas en código/schema | 5 locales posteriores a init | No registradas en `_prisma_migrations` | Pendientes o aplicadas fuera de Prisma |
| `SecurityAuditEvent`/`SecurityThrottle` | Presentes | `202609260002_security_hardening` | Tablas ausentes | DDL pendiente |
| Índice `idx_records_order_cursor` | Declarado | En security hardening | Ausente físicamente | Plan de historial distinto |
| `prisma migrate status` | N/A | Ejecutado | `Schema engine error` | Baseline fallido |
| `prisma validate` | válido | N/A | no escribe | OK |

Historial físico registrado: `0_init`, `20260814120000_remove_electronic_signatures`, `20260830100000_reconcile_aiven_pin_prerequisite`, `20260830103000_add_personal_pins`. Árbol local: `0_init`, tres normalizaciones de roles, observación/capacidad y dos migraciones de integridad/seguridad del 26-09. No debe ejecutarse `migrate deploy` hasta reconstruir checksums, precondiciones y estado real.

### Calidad física agregada, sin PII

- 12 usuarios: 11 `Activo`, 1 `Desvinculado`.
- 0 id_auth0/email vacíos; 0 emails no normalizados; 0 nombre/apellido/RUT/rol/estado nulos o vacíos.
- 0 duplicados por email normalizado, id_auth0 trimmed o RUT normalizado.
- PIN: 9 aceptados, 1 pendiente y 2 sin PIN. Por estado: el desvinculado no tiene PIN; entre activos hay 9 aceptados, 1 pendiente y 1 sin PIN (autoprovisionable al verificar sesión).
- 12 challenges PIN; todos vencidos, 4 siguen `delivered` y `used_at IS NULL`. No existe purga de challenges.
- Relaciones existentes: 41 pedidos, 406 registros, 145 asignaciones de mensajes, 19 etiquetas y 14 avances enlazados a usuarios. El borrado físico de usuarios no es una estrategia viable general.

## 11. Semántica y fuentes de verdad

| Propiedad | Autoridad de autenticación | Autoridad operativa | Reconciliación observada |
|---|---|---|---|
| Credencial/password | Auth0 | Auth0 | correo de change password |
| `sub`/identidad externa | Auth0 | `Usuario.id_auth0` debe coincidir | lookup exacto; unique local |
| Rol efectivo | Auth0 RBAC + claim | catálogo local limita permisos | si claim ≠ local, consulta Auth0 y CAS actualiza local |
| Estado activo | local por request | `estado_usuario` | gestión intenta reflejar en Auth0 `blocked`; no se consulta blocked al autenticar |
| Email | duplicado Auth0/MySQL | depende del flujo | update externo y luego local; no hay reconciliador |
| PII interna | MySQL | MySQL | no se escribe nombre/RUT a Auth0 |
| PIN | MySQL | MySQL | provisioning en create/verify/reactivate; invalidación al unlink |

Un usuario utilizable requiere: token válido, exactamente un rol reconocido, permissions array, fila local por `sub`, estado local Activo/Vinculado, rol local igual al claim o reconciliable contra Auth0, y PIN aprovisionado/aceptado para acciones sensibles. `blocked` externo no se consulta en cada request.

## 12. Productores/escritores de identidad

| Productor | Archivo/símbolo | Acción | Sistema escrito | Tx/atomicidad | Actor/efecto externo |
|---|---|---|---|---|---|
| Admin create | `adminUsers.controller#createAdminUserHandler` | alta | Auth0 → Usuario → PIN → email | No distribuida | admin de scope; crea cuenta/correo |
| Admin edit | `createUpdateAdminUserHandler` | email, nombre, apellido, rol | Auth0 profile/RBAC → Usuario | No distribuida | admin + PIN |
| Admin status | `createUpdateAdminUserStatusHandler` | blocked/estado/PIN | Auth0 → Usuario → PIN/challenges | No distribuida | admin + PIN |
| Identity sync | `requireActiveIdentity` | corrige rol local | Usuario | CAS `updateMany`, no tx externa | request autenticado; GET Auth0 |
| Verify/reactivate | `PinService.ensureProvisioned` | crea PIN si falta | Usuario | updateMany condicional | usuario autenticado |
| PIN acknowledge | `PinService.acknowledge` | acepta y borra ciphertext pendiente | Usuario | una update | titular |
| PIN recovery | request/confirm | challenge y nuevo PIN | Challenge + Usuario | confirm usa transaction local | titular; delivery externo abstracto |
| PIN invalidation | `invalidateByAuth0Id` | borra credencial y cierra challenges | Usuario + Challenge | transaction local | disparado por unlink |
| Debug PIN | `debugReset` | reemplaza PIN de Soporte dev | Usuario + Challenge | transaction local | Soporte, solo `NODE_ENV=development` |
| Seeds/migraciones | migraciones de rol/PIN históricas | normalización/DDL | MySQL | por migración | operador |

No se hallaron jobs, triggers o raw SQL adicionales que alteren email/id_auth0/rol/estado. Raw SQL de otros módulos escribe FK de actor/actividad, no la identidad maestra.

## 13. Consumidores

| Dato/contrato | Consumidor | Propósito | Dependencia rol/estado | Riesgo si cambia |
|---|---|---|---|---|
| `id_auth0`/`sub` | `requireActiveIdentity`, PIN, orders resolver | enlazar token→fila | crítica | pérdida total de acceso/atribución |
| rol local + claim | capability middleware, AuthProvider, guards | autorización y UI | crítica, exacto y único | escalación o denegación |
| estado local | identity middleware, PIN, email setup | permitir acceso/ciclo | crítica | token bloqueado aceptado o activo rechazado |
| `id_usuario` | Pedidos, Registros, pagos, mensajes, etiquetas, avances, audit | FK/actor/historia | histórica | ruptura de integridad y trazabilidad |
| nombre/apellido | profile, history, payments, metrics, Users UI | identificación del actor/vendedor | no autoriza | PII incorrecta visible |
| correo | profile, reset/setup password, Auth0 | contacto/recuperación | cuenta activa | reset al destino erróneo |
| RUT | Users/profile | identificación interna | no autoriza | duplicidad/rectificación |
| PIN fields | PIN service/requirePin | autorización adicional | estado activo | bypass/lockout/pérdida de PIN |
| challenges | PIN recovery/cleanup futuro | recuperar PIN | estado activo | abuso/retención |
| `Registros` | profile, Users movements, history/payments | actividad/auditoría de negocio | scope de lectura | exposición laboral/PII |

## 14. Máquina de estados y roles

### Estados observados

| Estado | Origen | Acceso | PIN | Transiciones implementadas |
|---|---|---|---|---|
| `Activo` | create exitoso/status | permitido | aprovisiona/usa | → Desvinculado |
| `Vinculado` | alias aceptado de API/legacy | permitido | aprovisiona/usa | normaliza a Activo al escribir status |
| `Desvinculado` | status | denegado antes de controller | debe invalidarse | → Activo/Vinculado vía API |
| `Pendiente rol` | create con asignación RBAC fallida | denegado | create no provisiona | sin transición de recuperación formal |
| otro/null | schema permite; no hay datos actuales | denegado por identity | incierto | no definido |

El filtro/listado trata cualquier estado distinto de `Desvinculado` como vinculado, por lo que incluye `Pendiente rol` y valores inesperados. Summary calcula `total - desvinculados`, con la misma clasificación incorrecta.

### Roles y alcance

- AP: AP/Operario Producción.
- AV: AV/Operario Ventas.
- AC: AC/Operario Cobranzas.
- Soporte: todos los roles funcionales, incluida Gerencia; nunca Soporte.
- Operarios y Gerencia: sin `manage:users` en catálogo.
- Cambio de rol propio y autodesvinculación: rechazados server-side con 409.
- El rol solicitado y el rol actual del target deben estar dentro del scope del actor.

Tras cambiar rol/estado, tokens ya emitidos no son revocados. Si el rol del token difiere del local se consulta Auth0; si ambos aún coinciden, no se consulta estado/rol externo.

## 15. Consistencia Auth0 ↔ MySQL y fallos parciales

### Máquina de fallos por operación

| Operación | Secuencia | Falla | Estado resultante | Respuesta/recovery real |
|---|---|---|---|---|
| Create | token/role → Auth0 user → rol → Usuario → PIN → email | Auth0 create falla | nada local | 409 duplicate o 500; reintento posible según causa |
| Create | igual | rol falla | Auth0 sin rol; local `Pendiente rol` | 201 `recoverable`; no endpoint de continuación |
| Create | igual | DB falla | Auth0+rol; sin Usuario | 201 `recoverable`; retry choca con Auth0; no recovery |
| Create | igual | PIN falla | Auth0+rol+Usuario Activo; sin PIN | 201; verify futuro aprovisiona: recovery real |
| Create | igual | email falla | cuenta completa sin correo | 201; endpoint de reenvío existe, pero UI real lo pierde |
| Edit | PATCH email/metadata → delete roles → assign → DB | PATCH falla | sin cambio local | 500; repetir puede ser seguro según proveedor |
| Edit | igual | assign falla tras delete | email/metadata nuevos, sin rol oficial, local viejo | 500; sin rollback; old token puede seguir pasando local |
| Edit | igual | DB falla al final | Auth0 nuevo; local email/nombre/rol viejo | 500; rol puede autosincronizarse, email/nombre no |
| Status | Auth0 blocked → DB status → PIN | Auth0 falla | local/PIN sin cambio | 500; repetir razonable |
| Status | igual | DB falla | blocked externo cambió; local viejo | 500; unlink puede dejar token antiguo aceptable localmente |
| Status | igual | PIN falla | ambos estados cambiaron, PIN no | 500; unlink queda denegado pero PIN puede sobrevivir; reactivar podría conservarlo |
| Email setup | lookup local → Auth0 email | delivery falla | sin mutación local | 500; reintento, sin cooldown específico |

La prueba controlada de update simuló exactamente: token → PATCH → dos listados de roles → DELETE → POST fallido. Resultado `AUTH0_ROLE_REPLACE_FAILED` y cero llamadas de compensación.

## 16. Estados parciales y recovery

| Acción | Estado parcial declarado | Idempotencia | Mecanismo de soporte | Evaluación |
|---|---|---|---|---|
| DB faltante tras create | `recoverable=true` | retry no idempotente | ninguno | No recuperable por la aplicación |
| rol faltante tras create | `Pendiente rol` | create retry 409 | edición/status no resuelven determinísticamente | No recuperable formalmente |
| PIN faltante | `recoverable=true` | `ensureProvisioned` condicional | login/verify | Recuperable real |
| correo faltante | flag false | email request repetible | endpoint existe | Backend recuperable; UI no durable |
| update parcial | 500 | repetición puede borrar/asignar roles otra vez | autosync solo rol | Parcialmente recuperable |
| status parcial | 500 | PATCH status es conceptualmente idempotente | sin reconciliador de blocked/local | Parcialmente recuperable |

Debe reservarse `recoverable=true` para estados con token/ID de operación y comando de continuación verificable. Hoy el término induce al operador a creer que existe reparación automática.

## 17. PIN y compatibilidad de secretos

### Flujo real

1. Se genera un PIN decimal de seis dígitos con `randomInt`.
2. Se guarda scrypt hash+salt para validación.
3. Se guarda fingerprint HMAC para unicidad global.
4. Mientras está pendiente, se cifra el PIN con AES-256-GCM para revelación única.
5. Acknowledge fija timestamp y elimina ciphertext/IV/tag.
6. Cinco fallos bloquean 15 minutos.
7. Recovery crea código scrypt por 15 minutos y, al confirmar, reemplaza la credencial dentro de una transaction local.
8. Unlink borra todo el material PIN y cierra challenges no usados; reactivate/verify aprovisiona si falta.

### Secreto y compatibilidad

- Solo existe `PIN_SECRET`; no hay `PIN_ACTIVE_SECRET_VERSION` ni `PIN_SECRET_V*` en código o entorno observado.
- Validar PIN aceptado usa únicamente hash+salt y **no depende** de `PIN_SECRET`.
- Revelar PIN pendiente y calcular fingerprints sí dependen de `PIN_SECRET`.
- Rotar el secreto hoy rompe la revelación del PIN pendiente y cambia el dominio de fingerprints; no debe hacerse sin inventario/estrategia.
- No corresponde “simplificar” a un secreto único: el sistema ya está en ese diseño. Tampoco se autoriza introducir versionado durante esta fase.
- Base observada: 1 PIN pendiente. Cualquier rotación queda bloqueada hasta resolver compatibilidad sin revelar el PIN.

### Riesgos adicionales

- `getDefaultDelivery` usa `NODE_ENV`; el bootstrap y las rutas demo usan `APP_ENV`. La divergencia puede seleccionar el delivery incorrecto.
- Delivery dev registra `to`, `code` y expiración en consola; no pasa por `safeLogger`.
- Delivery production es un stub que siempre falla; no hay integración real.
- No hay purge de `PinRecoveryChallenge`; los 12 existentes están vencidos y 4 permanecen no usados.
- Faltan pruebas concurrentes de confirmación y de incrementos de intentos.

## 18. Integridad y resistencia a escalación

| Control | Evidencia | Resultado |
|---|---|---|
| JWT issuer/audience | `checkJwt` | Protegido server-side |
| Usuario local activo | `requireActiveIdentity` | Protegido; no consulta `blocked` externo |
| Rol único/reconocido | `roleFromPayload` | Fail closed |
| Permiso efectivo | `can`: catálogo local + claim | Un token sobredotado no amplía el rol |
| Scope departamental | `manageableRoles` + `allowedTarget` + `allowedRoles` DB | Protegido server-side |
| Soporte asignable | validadores excluyen Soporte | Protegido |
| Mass assignment | sets de campos y PIN eliminado | Protegido |
| self-role/self-unlink | comparación `sub`/target | Protegido server-side |
| Cambio directo id_auth0/RUT/status desde edit | no incluidos en allowlist | Protegido |
| PIN del actor | `requirePin` usa `sub`, no target | Protegido |
| Tokens antiguos | rol mismatch se confirma; status externo no | Parcial |
| Side effects email | capability/scope/activo + rate global | Parcial; falta cuota por target |

Pregunta obligatoria: un administrador funcional **no** puede ampliar scope mediante request manual en los endpoints revisados y tests actuales. Soporte sí tiene excepción interdepartamental explícita y auditada por diseño; la persistencia de esa auditoría está rota en la BD observada.

## 19. Autenticación, autorización y sesiones

`checkJwt` valida audience e issuer y luego exige identidad local activa antes del rate limit y del permiso del endpoint. La SPA no confía solo en Auth0 React: `AuthProvider` verifica la sesión contra backend y los guards usan el usuario verificado. Los guards son controles de experiencia; el backend es la autoridad final.

El rol requiere coincidencia de tres piezas: rol único en claim, permiso presente en token y permiso concedido al rol en `ROLE_PERMISSIONS`. La sincronización local solo ocurre cuando el claim difiere de MySQL y una consulta actual a Auth0 confirma ese mismo rol. Esto evita que un token antiguo revierta un cambio de rol externo.

Limitaciones:

- No se observó duración de access token, refresh token, logout/revocación ni una denylist; la revocación instantánea no está demostrada.
- Si el rol del token coincide con MySQL, no se consulta Auth0. Una falla parcial que cambió roles o `blocked` solo afuera puede dejar una ventana hasta expiración.
- `createVerifyAuthSessionHandler` acepta `permissions` ausente y devolvería `[]`, pero el middleware real anterior lo rechaza. El test unitario de “permisos vacíos” no representa la ruta integrada.
- Cambiar email no obliga a renovar sesión ni compara el email namespaced con el local.

## 20. Privacidad y minimización

### Flujo de lectura administrativa

`Usuario` completo en MySQL → Prisma sin `select` → `toUserResponse` → controller DTO → JSON → tabla/mobile/modal. Los hashes/ciphertexts no salen en JSON, pero sí se leen innecesariamente dentro del proceso. La respuesta envía `idUsuario` local aunque la SPA no lo usa para la gestión; `id_auth0` sí se usa como identificador de ruta.

### Flujo de escritura

Browser envía nombre, apellido, RUT, email, rol y eventualmente PIN → controller separa PIN → Auth0 recibe email, rol/estado duplicado en metadata y operación RBAC/blocked → MySQL recibe PII/rol/estado/PIN → Auth0 puede enviar correo. Nombre, apellido y RUT permanecen locales, lo que es una buena minimización.

### Matriz de datos/privacidad

| Campo | Origen | Auth0 | API/UI | Clasificación | Necesidad observada | Acceso/retención verificable | Readiness Ley 21.719 |
|---|---|---|---|---|---|---|---|
| nombre/apellido | admin/MySQL | No | Sí | PII laboral | identificar usuario/actor | admins de scope; historial puede conservar nombre actual | Parcial; faltan política/rectificación histórica |
| RUT | admin/MySQL | No | Sí | identificador personal | identificación interna | admins de scope/profile; sin unique/DV | Brecha de exactitud/minimización a justificar |
| email | admin/Auth0 | Sí | Sí | PII/contacto/login | acceso y recuperación | duplicado en dos sistemas | Brecha de reconciliación/exactitud |
| id_auth0 | Auth0 | Sí | Sí, bajo alias | identificador pseudónimo | targeting técnico | admins de scope; audit URL potencial | Minimizar exposición y retención |
| id_usuario | MySQL | No | Sí | identificador interno | FK; no necesario en lista SPA actual | múltiples tablas históricas | Retener por integridad; quitar de DTO si no se usa |
| rol/estado | admin/Auth0/MySQL | Sí | Sí | dato laboral/acceso | autorización/ciclo | admins + token | Brecha por duplicidad/parciales |
| actividad `Registros` | operaciones | No | Sí en movimientos/profile | actividad laboral | soporte/seguimiento | 406 filas con actor; política no verificada | Requiere finalidad, proporcionalidad y retención |
| PIN hash/salt | sistema | No | No | credencial/secreto derivado | validar PIN | MySQL; repos users lo sobrelee | Reducir superficie con select |
| fingerprint/ciphertext/IV/tag | sistema | No | No | secreto/metadata sensible | unicidad/revelación pendiente | MySQL; depende de PIN_SECRET | Gestión de claves/retención pendiente |
| fallos/lock | sistema | No | detalle parcial | seguridad | anti-abuso | MySQL | Definir retención y acceso |
| recovery challenge | sistema | No | estado/código de entrada | dato de seguridad | recuperación | no se purga; 12 vencidos | Brecha de limitación de conservación |
| M2M token/secret | env/Auth0 | Sí | No | secreto | administración | memoria/env | No observado en logs/respuestas |

## 21. Cumplimiento técnico objetivo — Ley 21.719

No se declara cumplimiento legal total. Conforme al texto oficial de [LeyChile/BCN](https://www.bcn.cl/leychile/Navegar/imprimir?idNorma=1209272), la ley fue promulgada el 25-11-2024, publicada el 13-12-2024 y entra en vigencia el 01-12-2026; la versión consultada indicaba una última modificación por Ley 21.806 de 05-02-2026. La [Ley 19.628 vigente hasta el 30-11-2026](https://www.bcn.cl/leychile/Navegar?dt=open&idLey=19628) sigue siendo el marco vigente a la fecha de corte. Esta sección evalúa *readiness* técnico para la reforma, no emite una conclusión jurídica. Resultado técnico:

| Principio/capacidad | Clasificación | Evidencia | Brecha/limitación |
|---|---|---|---|
| Finalidad y minimización | Brecha técnica parcial | PII interna no se copia a Auth0; DTO explícito | app_metadata redundante, overfetch PIN, movimientos prefetched, id interno no usado |
| Exactitud/calidad | Brecha técnica | unique email/id_auth0; datos actuales completos | Auth0↔MySQL sin reconciliador; RUT sin DV/unique; estados parciales |
| Confidencialidad | Brecha técnica alta | JWT/RBAC/PIN/allowlists | delivery dev puede loguear correo+código; audit DB ausente |
| Integridad | Brecha técnica alta | FK/unique/CAS rol | secuencias distribuidas sin compensación; rol delete-before-assign |
| Disponibilidad | Brecha técnica | tests/build pasan | Auth0 sin timeout; DDL de throttle faltante para producción |
| Privacidad por diseño/default | Parcial | scope departamental, proyección de respuesta | lecturas completas, metadata duplicada, actividad sin política observable |
| Trazabilidad/responsabilidad | Brecha técnica alta | requestId y middleware audit diseñado | tabla física ausente; no se registra detalle semántico/antes-después |
| Limitación de conservación | Brecha técnica | no se borra usuario por FK históricas | challenges vencidos no se purgan; políticas no verificables |
| Acceso/rectificación | Capacidad parcial | admin edit y profile | no hay workflow de derechos, historial/propagación externa no reconciliados |
| Supresión/bloqueo | Requiere política | unlink preserva historia y bloquea acceso | no hay regla de anonimización/supresión; conflictos de conservación no decididos |
| Portabilidad/oposición | Requisito jurídico/organizacional | no hay export/workflow | aplicabilidad y formato requieren definición |
| Incidentes | Capacidad técnica insuficiente | safeLogger/requestId | audit persistente ausente; proveedor/proceso no verificable |
| Base jurídica/transparencia | Requiere política/base jurídica | no deducible de código | documentar finalidad de RUT, movimientos, roles y retención |
| Encargados/proveedores | Requisito organizacional | Auth0 y hosting presentes | contratos, localización, transferencias y garantías no verificables |

## 22. Matriz legal

| Norma | Aplicabilidad | Evidencia técnica | Riesgo/hallazgo | Limitación organizacional/jurídica | Acción |
|---|---|---|---|---|---|
| Ley 21.719 | Objetivo obligatorio para sistema final | tratamiento de identidad, RUT, email, rol, estado, actividad y seguridad | parciales, retención, minimización, logs, exactitud | base jurídica, avisos, derechos y contratos no verificables | USR-ACT-002/003/004/009/010 |
| Ley 21.459 | Marco de riesgo | operaciones privilegiadas de rol/estado/PIN | alteración o acceso indebido si fallan integridad/autorización; no se califica delito | intención/hecho jurídico fuera del código | robustecer integridad y evidencia |
| Ley 21.663 | Aplicabilidad organizacional no verificable | identidad, continuidad, audit y proveedores | DDL/audit/timeout reducen resiliencia | no se conoce clasificación de la organización | análisis organizacional + acciones técnicas |
| Ley 17.336 | Condicional | código/dependencias propios y OSS | npm audit no reporta vulnerabilidades; licencias no se reauditaron | titularidad/licencias completas no verificadas | inventario/licencias fuera de scope si se requiere |
| Código del Trabajo | Relevante por contexto laboral | roles, estado, RUT y movimientos por empleado | proporcionalidad y reserva de movimientos no demostradas | política laboral/finalidad no deducible | decisión de acceso/retención para movimientos |
| Ley 19.799 | No aplica al flujo actual | signature/documentos retirados | no hay firma electrónica en Users | verificar si negocio reintroduce firma | ninguna acción Users actual |
| Ley 19.496 + Decreto 6/2021 | Condicional/no demostrado | gestión interna de trabajadores | no se observó relación de consumo | contexto comercial no verificable | sin acción específica |
| Ley 20.422 | Aplicación técnica de accesibilidad | formularios, tabla, modales | focus trap/restore y contraste no verificados | conformidad requiere pruebas | USR-ACT-012 |
| Ley 21.180 | Condicional | no se acreditó órgano público/procedimiento administrativo | sin hallazgo específico | contexto organizacional no verificable | reevaluar si aplica |
| Ley 19.880 | Condicional | igual | sin hallazgo específico | igual | reevaluar si aplica |
| Ley 20.285 | Condicional | no se acreditó transparencia pública | PII requiere reserva si aplicara | sujeto obligado no verificable | análisis jurídico si aplica |
| Ley 20.584 | No aplica al contexto conocido | no hay datos/servicio de salud | ninguno | contexto sanitario no observado | ninguna |

La Ley 19.628 no se utiliza como marco paralelo del diseño futuro.

## 23. Matriz ISO

| Norma | Aplicabilidad Users | Evidencia | Hallazgo/resultado | Acción | Limitación |
|---|---|---|---|---|---|
| ISO/IEC 27001:2022 | Alta, riesgo de información | RBAC, secrets env, audit diseñado | integridad/trazabilidad incompletas | 001–006 | no certifica SGSI |
| ISO/IEC 27002:2022 | Alta, controles técnicos | acceso, logging, desarrollo seguro | delivery/log y audit físico deficientes | 002/003/009 | no se inventan IDs de control |
| ISO/IEC 27005:2022 | Alta, riesgos | activos: identidad/PII/PIN; amenazas: abuso/falla parcial; vulnerabilidades documentadas | impacto alto, probabilidad media sin métricas | priorización P0/P1 | probabilidad real requiere incidentes/métricas |
| ISO/IEC 27034-1 | Alta, seguridad aplicación | trust boundaries y controles en flujo | seguridad no integrada a saga/recovery | 004–007 | proceso organizacional no verificado |
| ISO/IEC 27035-1:2023 | Alta, incidentes | requestId/safeLogger | eventos admin no persisten en BD observada | 003 | proceso de incidentes no verificable |
| ISO/IEC 27033-1:2015 | Condicional | TLS DB requerido por runtime; HTTPS Auth0 | transporte SPA/deploy no probado | preflight despliegue | red fuera de scope |
| ISO/IEC 27036-1:2021 | Condicional/alta proveedor | Auth0/hosting/DB | estado/contratos proveedor no verificados | 014 + revisión contractual | no inventar contratos |
| ISO/IEC 27701:2025 | Alta PII | matrices de acceso/minimización | retención, roles y evidencia incompletos | 003/009/010 | `REFERENCIA REQUIERE VERIFICACIÓN ADICIONAL` para edición exacta |
| ISO/IEC 29100:2024 | Alta privacidad | PII/identificadores mapeados | exactitud/minimización/retención parciales | 009/010 | marco, no cumplimiento legal |
| ISO/IEC 27017:2026 | Condicional cloud | Auth0/Aiven observables | configuración contractual no auditada | revisión proveedor | `REFERENCIA REQUIERE VERIFICACIÓN ADICIONAL` |
| ISO/IEC 27018:2025 | Condicional PII cloud | PII en DB/Auth0 | garantías del proveedor desconocidas | revisión proveedor | `REFERENCIA REQUIERE VERIFICACIÓN ADICIONAL` |
| ISO/IEC 25010:2023 | Obligatoria | suites/build + flujo | suitability parcial; reliability/integrity débiles; UI mantenible con archivos grandes | plan por fases | no score arbitrario |
| ISO/IEC 25012:2008 | Prioritaria | agregados de BD | actuales completos/sin duplicados; fuentes externas no contrastadas | 004–010 | Auth0 real no leído |
| ISO/IEC 25023:2016 | Medición | counts, tests, EXPLAIN, llamadas | baseline concreto limitado a 12 usuarios | 011/014 | no inventar rendimiento |
| ISO/IEC 25030:2019 | Requisitos | criterios por ACTION | faltan SLO/timeouts/recovery medibles | 004/013 | acordar presupuestos |
| ISO/IEC 25040:2024 | Evaluación | objeto→criterio→medición→resultado registrado | reproducible salvo Auth0 real | ledger/handoff | no evaluación externa |
| ISO/IEC 5055:2021 | Calidad código | controller 472, Auth0 523, page 347, CSS 1.103 líneas | alto acoplamiento y duplicación de estados; refactor solo por riesgo | 004/005/008/012 | no refactor estético |
| ISO/IEC/IEEE 12207:2026 | Evolución | plan por fases y rollback | deriva de migraciones impide cambio seguro | 001/orden futuro | `REFERENCIA REQUIERE VERIFICACIÓN ADICIONAL` |
| ISO/IEC/IEEE 29119 | Testing | 684 backend; 120 verificaciones/tests frontend | cobertura feliz alta; fallas distribuidas/concurrencia faltan | 014 | sin E2E real |
| ISO/IEC 20000-1 | Condicional servicio | operaciones admin/soporte | recovery operacional no definido | runbooks 004–008 | proceso de servicio no verificado |
| ISO 22301 | Condicional continuidad | dependencia Auth0/DB | no hay modo degradado/reconciliador | 004/013 | BCP organizacional fuera de scope |
| ISO 31000 | Marco riesgo | severidad/confianza/tratamiento | aplicado cualitativamente | plan maestro | no ERM completo |
| ISO 9001 | Condicional calidad | tests/trazabilidad | docs y migraciones divergen | 001/013/014 | QMS no verificable |
| ISO 19011:2026 | Metodología | evidencia, limitaciones, falsos positivos | aplicada a la auditoría | reauditar al cerrar | `REFERENCIA REQUIERE VERIFICACIÓN ADICIONAL` |

## 24. OWASP, NIST y CWE

- **Broken Access Control / ASVS autorización:** controles server-side positivos; riesgo residual en tokens antiguos tras parciales, no en ocultamiento UI.
- **Business Logic:** el principal riesgo es la saga informal Auth0→DB→PIN→email y el estado `recoverable` sin comando de reparación.
- **Cryptographic Storage:** scrypt/AES-GCM/HKDF/HMAC están bien separados por propósito; la gestión/rotación del secreto y logs de delivery son el problema.
- **Logging/Monitoring:** requestId y safe logger existen; tabla de audit ausente y delivery dev evade el logger seguro.
- **Input Validation:** allowlists fuertes; faltan checksum/unicidad RUT, largo de search y consistencia de paginación.
- **NIST SSDF:** verificar cambios por riesgo, simular fallas externas, reconciliar migraciones y mantener provenance de configuración antes de desplegar.
- **CWE claras:** CWE-532 (información sensible en logs) para delivery dev; CWE-400 (consumo no acotado/esperas externas) para fetch sin timeout y búsqueda no limitada. No se fuerza una CWE para inconsistencia distribuida de negocio.

## 25. Calidad ISO 25010 / 25012 / 5055

| Dimensión | Resultado basado en evidencia |
|---|---|
| Adecuación funcional | CRUD principal y scope existen; reactivación/recovery no están completos en UI |
| Fiabilidad | tests pasan, pero no hay compensación/reconciliación de sistemas externos |
| Seguridad | autorización fuerte; logging PIN, audit físico y ventanas de token requieren corrección |
| Eficiencia | adecuada a 12 filas; riesgos a mayor cardinalidad condicionados a medición |
| Mantenibilidad | catálogo compartido positivo; controllers/services grandes y documentación contradictoria |
| Compatibilidad | contratos SPA/API coherentes en felices; metadata y estados legacy agregan compatibilidad frágil |
| Calidad de datos | base actual completa/sin duplicados; no se verificó Auth0 y faltan invariantes físicas |
| Trazabilidad | relaciones de negocio abundantes; eventos admin diseñados pero no persistentes |

## 26. Performance backend/Auth0

No hay baseline de latencia real. El número de llamadas está demostrado estáticamente y mediante mocks. `fetch` no usa `AbortSignal`, timeout o retry; un proveedor lento mantiene el handler pendiente. El servidor configura timeouts HTTP, pero eso no cancela necesariamente la llamada saliente ni la continuación del side effect.

La edición enumera roles dos veces porque `resolveRoleId` y `resolveOfficialRoleIds` corren en paralelo, duplicando la misma página. Consolidar en una sola lectura es posible después de preservar paginación y validación. Cachear el token M2M podría ahorrar una llamada por operación, pero queda condicionado a TTL derivado de `expires_in`, aislamiento en memoria, no logging, invalidación y pruebas; no cachear roles sin estrategia de freshness.

## 27. Performance BD

- Lista = `findMany + count` en paralelo; summary = dos `count` en paralelo. Carga inicial: cuatro queries.
- Búsqueda usa cuatro `contains` con `%texto%`. `EXPLAIN` en 12 filas eligió índice primario por orden/limit, `Using where`; no hubo índice candidato para búsqueda.
- Summary por roles hizo `ALL`, 12 filas, sin índice de rol.
- `Usuario` solo tiene PK y unique de email/id_auth0/fingerprint; no índices en rol/estado.
- `Registros` físico solo tiene índices individuales de pedido y usuario; falta el compuesto de schema para historial por pedido. Para Users movements, el índice por `id_usuario` filtra pero el sort `FECHA_HORA DESC, ID_REGISTRO DESC` puede requerir ordenamiento. Se debe medir su plan exacto antes de proponer índice `(id_usuario, FECHA_HORA DESC, ID_REGISTRO DESC)`.
- En 10/100 usuarios no se espera presión. En 1.000/10.000, búsqueda leading-wildcard y counts por scope serán O(n); la primera acción es generar dataset sintético aislado o usar staging, medir p50/p95 y planes, no alterar la BD compartida.

## 28. Performance frontend

- Search debounce 350 ms y `latestRequestRef` evitan que una lista antigua sobrescriba la nueva.
- Summary no usa request ID; dos cargas concurrentes pueden dejar un conteo antiguo.
- Create desde otra página llama `setPage(1)` y refresca con un closure que puede conservar la página anterior, generando request adicional; el efecto posterior corrige la página.
- Mutación refresca lista y summary en paralelo. Es coherente, pero no atómico y puede mostrar combinaciones temporales.
- Movimientos comparte promise entre prefetch/apertura, TTL 15 s y máximo 30 entradas. Fallas se eliminan. Una promesa que nunca resuelve permanece con expiración infinita mientras viva la instancia.
- Build: chunk Users `41,79 kB` sin comprimir/`10,96 kB` gzip; no se demuestra problema de bundle.
- No se justifica memoización adicional con 10 filas por página.

## 29. Baseline

| Comando/prueba | Resultado |
|---|---|
| `git status --short --branch` | `opt-users`, limpio antes del informe |
| backend `npm test` | 684 tests; 682 pass; 2 skip MySQL; 0 fail; 22,6 s |
| frontend `npm test` | 106 verificaciones scripted + 14 Node tests; todo OK |
| frontend `npm run lint` | exit 0 |
| frontend `npm run build -- --outDir <tmp>` | exit 0; 492 módulos; output temporal eliminado |
| `npm run prisma:validate` | schema válido |
| `npm run prisma:migrate:status` | falla `Schema engine error` |
| `npm audit --omit=dev` backend/frontend | 0 vulnerabilidades reportadas en ambos |
| SQL agregados/info_schema | conexión OK, solo lectura |
| SQL `EXPLAIN` list/summary | planes registrados; sin escritura |
| mock fallo role replace | error esperado y sin compensación |
| `node scripts/rbac.mjs --check ...` | no ejecutado: snapshot vigente referido no existe; snapshot disponible es histórico |

Los tests Auth0 son mocks. Los dos tests MySQL que escriben fixtures quedaron `SKIP` porque `RUN_MYSQL_INTEGRATION` no estaba habilitado; no se autorizó activarlos contra la base compartida.

## 30. Ledger de pruebas de BD y efectos externos

| ID | Hipótesis | Tipo | Sistemas/tablas | Escritura | Side effect externo | Rollback/cleanup | Resultado | Residuo |
|---|---|---|---|---|---|---|---|---|
| DB-001 | conexión/version/base | SELECT | MySQL | No | No | No aplica | MySQL 8.4.8, `mydb` | Ninguno |
| DB-002 | calidad Usuario/PIN sin PII | agregados SELECT | Usuario/Challenge | No | No | No aplica | counts/invariantes registrados | Ninguno |
| DB-003 | tablas/columnas/índices/FK | information_schema | schema físico | No | No | No aplica | deriva confirmada | Ninguno |
| DB-004 | costo lista/summary | EXPLAIN | Usuario | No | No | No aplica | scan/índice descritos | Ninguno |
| DB-005 | historial de migraciones | SELECT `_prisma_migrations` | metadata Prisma | No | No | No aplica | cuatro migraciones, deriva | Ninguno |
| DB-006 | migrate status | CLI read-only | Prisma/MySQL | No | No | No aplica | schema engine error | Ninguno |
| EXT-001 | create/update/status/email | suites con mocks | Auth0/email simulados | No real | No real | No aplica | felices/fallas principales pasan | Ninguno |
| EXT-002 | delete roles + assign falla | fetch mock sintético | Auth0 simulado | No real | No real | No aplica | sin compensación confirmado | Ninguno |

**No se realizó ninguna escritura de BD. No hubo datos sintéticos committed, por lo que no hubo cleanup. Auth0 real y correo real no fueron tocados.**

## 31. Tests existentes relevantes

Cobertura positiva: rutas admin, validadores, repo, self-role, movimientos, Auth0 service mock, RBAC por rol/endpoint, identity role sync, auth/profile, PIN debug, errores seguros y security contracts. El suite de autorización prueba requests manuales y tokens sobredotados.

Frontend prueba rutas/acciones/scopes y cache de movimientos, pero no renderiza integralmente todos los estados parciales de Users. Build/lint pasan.

## 32. Gaps de testing

- Create: retry/idempotency cuando Auth0 creó y DB falló; reparación de `Pendiente rol`.
- Update: falla después de PATCH, después de DELETE, después de assign y después de DB; rollback/reconciliación.
- Status: DB/PIN falla después de `blocked`; tokens antiguos en cada parcial.
- UI: no cerrar modal ante `recoverable`, reenvío durable, reactivación, summary/list race, doble submit y error local de unlink.
- Estado: `Pendiente rol`, null/desconocido en filtros/summary.
- RUT: dígito verificador, canonicalización y conflicto.
- PIN: `APP_ENV` vs `NODE_ENV`, ausencia de logs sensibles, confirmación concurrente, intentos concurrentes, purge.
- DB: migraciones en base efímera desde cero y upgrade desde snapshot; integración actual está omitida y depende de tablas ausentes.
- Auth0 real: scopes M2M, bindings, roles por usuario, multiple roles, `blocked`, email y timeout, solo en tenant de prueba autorizado.
- Accesibilidad: focus trap/restore, teclado, lector de pantalla y contraste.

## 33. Código muerto

### Confirmado

- `capaVista/src/modules/users/pages/UserCreatePage.jsx`: solo se referencia a sí mismo; el router redirige `/admin/usuarios/nuevo` a `/admin/usuarios`; no hay import dinámico.
- `UserCreatePage.module.css`: solo consumido por la página muerta; contiene además selectores legacy de firma.
- Branches frontend para `AUTH0_CONFIGURATION_ERROR` y `AUTH0_INSUFFICIENT_SCOPE` dentro de `UserManagementPage.getErrorText`: los controllers Users convierten esos errores a `INTERNAL_ERROR`; no son alcanzables por contratos actuales. Eliminar solo tras test de contrato/error global.

### Probable

- `updateRoleByAuth0Id` en repo: solo definición y tests; producción usa `updateByAuth0Id` o `updateRoleIfCurrent`. Confirmar que no exista consumidor externo antes de eliminar.
- Resultado/reenvío inline de `UserCreateForm`: el componente es activo, pero su estado post-create queda oculto porque el modal padre cierra; no es código muerto puro, es flujo inalcanzable por composición.

### Descartado

- `UserMovementsModal`, cache y endpoint son activos.
- `app_metadata` no está muerto: se escribe, aunque no autoriza.
- `signatureUpload.js` no es un archivo muerto actual: ya fue eliminado. No hay que volver a eliminarlo.
- `UserCreateForm` no está muerto; se usa en el modal.

## 34. Arquitectura y mantenibilidad

Fortalezas: autorización compartida entre capas, validators allowlist, DTO de salida, inyección de dependencias testeable, safe logger, CAS de rol y separación repositorio/servicio.

Deuda con impacto: controller y servicio Auth0 contienen orquestación distribuida sin objeto de operación; estados parciales se codifican en strings/respuestas; no hay outbox/reconciler; documentación y código divergen; CSS/page tienen legado; los errores Auth0 pierden códigos útiles para soporte aunque existe requestId.

No se recomienda extraer funciones o renombrar símbolos antes de las acciones de integridad. La prioridad no es estética, sino hacer explícita la máquina de estados, idempotencia, observabilidad y contratos.

## 35. Hallazgos

### ARCH-USR-001 — `recoverable` no tiene recuperación ejecutable

- **Categoría/severidad/confianza/estado:** arquitectura y funcionalidad; ALTA; CONFIRMADO; ABIERTO.
- **Archivos/símbolos/endpoints/tablas:** `adminUsers.controller.js#createAdminUserHandler`, `UserCreateForm#handleSubmit`, `UserManagementPage#handleCreatedUser`; POST users/email; `Usuario`.
- **Consumidores/cadena:** modal → POST create → Auth0 → repo create → PIN/email → respuesta 201. DB failure deja Auth0 sin local; role failure deja `Pendiente rol`.
- **Evidencia/comportamiento:** tests esperan `recoverable=true`; retry de create vuelve a crear en Auth0 o recibe 409; no existe resume/reconcile. La UI cierra el modal para toda respuesta 201 y anuncia éxito.
- **Esperado/problema/causa:** toda parcial debe tener comando idempotente de continuación o declararse intervención manual. El controller confunde “estado conocido” con “recuperable”.
- **Impacto/escenario:** identidad huérfana, operador engañado, usuario sin acceso y PII duplicada/inexacta.
- **Marcos:** Ley 21.719 integridad/exactitud/responsabilidad; ISO 27034/25010/25012; OWASP business logic; NIST SSDF. Bloque 2: reintentos pueden multiplicar llamadas.
- **Propuesta/riesgo/tests/dependencias:** modelo de operación + reconciliador/idempotency; riesgo alto por usuarios existentes; tests de cada paso y retry; depende de decisión de fuente/compensación. Ver USR-ACT-004/008.

### SEC-USR-001 — Reemplazo de rol elimina antes de poder garantizar la asignación

- **Categoría/severidad/confianza/estado:** seguridad/integridad; ALTA; CONFIRMADO; ABIERTO.
- **Archivos/símbolos:** `auth0Management.service.js#updateAuth0User`, `replaceUserRole`, `assignRoleToUser`; PATCH user; `Usuario.rol_usuario`; Auth0 RBAC.
- **Cadena/evidencia:** PATCH email/metadata → dos list roles → DELETE roles oficiales → POST nuevo. Mock controlado confirmó POST fallido, error y cero compensación.
- **Actual/esperado:** el local no se actualiza si Auth0 falla. Debe conservarse al menos un rol válido o existir compensación/reconciliación verificable.
- **Impacto/escenario:** cuenta externa sin rol; no puede renovar sesión. Token antiguo cuyo rol coincide con MySQL evita consulta Auth0 y conserva acceso hasta expirar.
- **Marcos:** Ley 21.719 seguridad/integridad; Ley 21.459 como riesgo; ISO 27001/27005/27034/25010; OWASP access/business logic.
- **Propuesta/riesgo/tests/dependencias:** leer roles asignados al usuario, calcular delta, asignar nuevo antes de retirar incompatibles cuando Auth0 lo permita, verificar estado final y compensar; alto riesgo de multi-role transitorio y Action que exige uno. Requiere diseño/tenant de prueba. USR-ACT-005/014.

### DATA-USR-001 — Historial Prisma, schema y base física divergen

- **Categoría/severidad/confianza/estado:** datos/deploy/observabilidad; ALTA; CONFIRMADO; BLOQUEADO para DDL.
- **Archivos/tablas:** schema, todas las migraciones; `_prisma_migrations`, SecurityThrottle, SecurityAuditEvent, Registros.
- **Evidencia:** cuatro migraciones aplicadas (dos ausentes localmente); siete locales no registradas; tablas security e índice compuesto ausentes; migrate status falla.
- **Comportamiento/impacto:** audit admin intenta escribir tabla inexistente y falla asíncronamente; producción seleccionaría throttle persistente y podría devolver 500 a toda request autenticada. No se puede desplegar migraciones de forma segura.
- **Marcos:** Ley 21.719 trazabilidad/disponibilidad; ISO 27001/27035/25012/12207; NIST SSDF.
- **Propuesta/riesgo/tests/dependencias:** reconciliar historial sin aplicar DDL automáticamente, recuperar SQL/checksums PIN, preflight/backup/staging. Riesgo crítico de DDL sobre datos reales. USR-ACT-001/003.

### SEC-USR-002 — Delivery PIN depende de variable inconsistente y puede registrar secretos

- **Categoría/severidad/confianza/estado:** seguridad/privacidad; ALTA; CONFIRMADO; ABIERTO.
- **Archivos/símbolos/endpoints:** `pinDelivery.service.js`, `pin.service.js#getDefaultDelivery`, app bootstrap; `/auth/pin-recovery/request`; Challenge/Usuario.
- **Evidencia:** `NODE_ENV` decide delivery; `APP_ENV` decide servidor. Config observada: development/ausente. Delivery dev usa `console.info` con email+código; production siempre lanza unavailable.
- **Escenario/impacto:** deployment `APP_ENV=production` sin NODE_ENV registra código de recuperación; con NODE_ENV correcto el flujo no funciona.
- **Marcos:** Ley 21.719 confidencialidad; ISO 27002/27701; OWASP logging/crypto; CWE-532.
- **Propuesta/riesgo/tests/dependencias:** una sola clasificación de entorno, fail closed, eliminar logging, proveedor real con contrato y rate limit. Integración externa bloqueada hasta decisión. USR-ACT-002/007.

### DATA-USR-002 — `Pendiente rol` se presenta como vinculado

- **Categoría/severidad/confianza/estado:** funcional/datos; MEDIA; CONFIRMADO; ABIERTO.
- **Archivos/símbolos:** repo `buildListWhere/getSummary`; UI status/summary; GET users/summary; Usuario.
- **Evidencia:** filtro Activo/Vinculado usa `NOT Desvinculado`; summary resta solo desvinculados. Create escribe `Pendiente rol`.
- **Impacto:** contadores y filtros mienten; operador puede tratar una identidad inutilizable como vinculada; notificaciones que usan “NOT desvinculado” pueden incluirla.
- **Marcos:** Ley 21.719 exactitud; ISO 25012/25010. Bloque 2: counts siguen baratos, no sacrificar semántica.
- **Propuesta/tests:** enum/tabla de transiciones y predicados explícitos; tests pending/unknown/null. USR-ACT-007.

### FUNC-USR-001 — SPA carece de reactivación y pierde la reparación del correo

- **Categoría/severidad/confianza/estado:** funcional/UX; ALTA; CONFIRMADO; ABIERTO.
- **Archivos/endpoints:** management page, create/edit/unlink modals, API; POST email, PATCH status.
- **Evidencia:** API permite Activo/Vinculado; frontend solo `unlinkUser`. `onCreated` cierra modal para parciales y no hay resend en tabla.
- **Impacto:** operaciones declaradas recuperables requieren curl/intervención; mensajes de éxito engañosos; ciclo de vida incompleto.
- **Marcos:** Ley 21.719 exactitud/transparencia; ISO 25010 functional suitability; accesibilidad/UX.
- **Propuesta/tests/dependencias:** mantener modal/mostrar estado de operación, acción reenvío y reactivar con confirmación/PIN; depende de state machine y recovery backend. USR-ACT-008.

### DATA-USR-003 — Email/estado no tienen reconciliación y `blocked` externo no es autoridad por request

- **Categoría/severidad/confianza/estado:** identidad/seguridad; ALTA; CONFIRMADO en código, escenario de proveedor ALTAMENTE PROBABLE; ABIERTO.
- **Archivos:** update/status handlers, Auth0 service, `requireActiveIdentity`; PATCH endpoints; Usuario/Auth0.
- **Evidencia:** Auth0 se escribe antes de DB; identity middleware solo consulta Auth0 si rol difiere; no compara email ni blocked.
- **Escenario:** Auth0 block OK + DB fail deja local Activo; access token previo sigue aceptado. Auth0 email OK + DB fail deja reset/listado con email antiguo.
- **Marcos:** Ley 21.719 exactitud/seguridad; ISO 25012/27005; OWASP business logic/access.
- **Propuesta/tests:** reconciliador explícito, operation log, política de autoridad y token/session response; no consultar Management en cada request sin medir. USR-ACT-004/006.

### PRIV-USR-001 — Repositorio Users sobrelee material PIN e ID local

- **Categoría/severidad/confianza/estado:** privacidad/performance; MEDIA; CONFIRMADO; ABIERTO.
- **Archivos/símbolos:** `users.repo.js` find/list/create/update + `toUserResponse`; GET/list DTO; Usuario.
- **Evidencia:** operaciones Prisma sin `select`; modelo contiene hash/salt/fingerprint/ciphertext. DTO impide salida, pero lectura ya ocurrió. `idUsuario` llega a SPA sin uso de gestión observado.
- **Impacto:** mayor superficie en memoria/instrumentación y payload DB; incumple minimización por defecto.
- **Marcos:** Ley 21.719 minimización/confidencialidad; ISO 27701/29100/25010. Bloque 2: reduce bytes sin cache.
- **Propuesta/tests:** selector común seguro; revisar necesidad de idUsuario; tests que fallen si se solicitan columnas PIN. USR-ACT-009.

### PRIV-USR-002 — Movimientos amplían tratamiento de actividad laboral sin política observable

- **Categoría/severidad/confianza/estado:** privacidad/laboral; MEDIA; CONFIRMADO técnico; REQUIERE POLÍTICA.
- **Archivos/endpoints/tablas:** movements modal/API/controller/repo; GET movements; Registros y detalles; admins de scope.
- **Evidencia:** nombre target + fecha + detalle derivado o `observacion`; prefetch en hover/focus; cache 15 s. 406 registros con actor en BD.
- **Impacto:** exposición de actividad y texto libre más allá de la necesidad de gestionar identidad; proporcionalidad/retención desconocidas.
- **Marcos:** Ley 21.719 finalidad/minimización; Código del Trabajo reserva/proporcionalidad; ISO 27701/29100.
- **Propuesta/tests/dependencias:** decisión de negocio/legal, permiso separado si procede, eliminar prefetch si no justificado, redacción/retención. USR-ACT-009.

### PRIV-USR-003 — Challenges PIN vencidos no se eliminan

- **Categoría/severidad/confianza/estado:** privacidad/datos/performance; MEDIA; CONFIRMADO; ABIERTO.
- **Archivos/tablas:** `temporaryDataCleanup.service.js`, PinRecoveryChallenge.
- **Evidencia:** cleanup solo borra throttles; 12/12 challenges vencidos, 4 delivered no usados.
- **Impacto:** conservación indefinida de hashes/salts/metadata, crecimiento y ambigüedad operacional.
- **Marcos:** Ley 21.719 limitación de conservación; ISO 27701/25012. Bloque 2: índice user/date existe, falta índice/estrategia por expiración si escala.
- **Propuesta/tests:** política de TTL y purge por lotes; conservar solo evidencia mínima si se exige. USR-ACT-007.

### DATA-USR-004 — RUT tiene formato superficial, no checksum ni unicidad

- **Categoría/severidad/confianza/estado:** calidad de datos; MEDIA; CONFIRMADO; ABIERTO.
- **Archivos/tablas:** validators frontend/backend, schema/Usuario; create.
- **Evidencia:** regex únicamente; columna nullable/no unique. Base actual: 0 duplicados normalizados.
- **Impacto:** identidad lógica duplicada o errónea, rectificación difícil y riesgo de gestionar persona equivocada.
- **Marcos:** Ley 21.719 exactitud; ISO 25012. No es por sí solo un hallazgo de autenticación.
- **Propuesta/riesgo/tests:** canonicalizador + DV, preflight de duplicados y decisión de unique; DDL bloqueado hasta reconciliar migraciones. USR-ACT-010.

### PERF-USR-001 — Búsqueda/summary escalan linealmente

- **Categoría/severidad/confianza/estado:** performance; MEDIA; CONFIRMADO en plan, CONDICIONADO A MEDICIÓN.
- **Archivos/queries:** `buildListWhere/list/getSummary`; Usuario.
- **Evidencia:** leading wildcard en 4 campos, summary full scan, sin índices rol/estado; 12 filas actuales.
- **Impacto:** a 10k, latencia/CPU y cuatro queries iniciales; hoy no hay problema medido.
- **Marcos:** ISO 25010/25023/25030/25040. OWASP resource consumption solo si se combina con abuso; search no tiene largo máximo.
- **Propuesta:** baseline staging 10/100/1k/10k, límite search, evaluar índice/fuller search. USR-ACT-011.

### PERF-USR-002 — Llamadas Auth0 sin timeout y duplicación de roles

- **Categoría/severidad/confianza/estado:** fiabilidad/performance; MEDIA; CONFIRMADO; ABIERTO.
- **Archivos/símbolos:** request token/fetch/replace role; todas las mutaciones.
- **Evidencia:** fetch sin AbortSignal; update hace dos GET iguales y seis llamadas Management.
- **Impacto:** handlers colgados, conexiones ocupadas, resultados tardíos después de respuesta/cancelación; costo/limit de proveedor.
- **Marcos:** ISO 25010 reliability/performance; OWASP/CWE-400; NIST SSDF.
- **Propuesta/riesgo/tests:** timeout presupuestado, clasificación retry-safe y una sola enumeración. Cache de token solo tras diseño. USR-ACT-013.

### DOC-USR-001 — Documentación Auth0 contradice código y referencia snapshot inexistente

- **Categoría/severidad/confianza/estado:** documentación/configuración; MEDIA; CONFIRMADO; ABIERTO.
- **Archivos:** READMEs, RBAC doc, Auth0 service/test, docs/auth0.
- **Evidencia:** README niega app_metadata; código lo escribe. Doc refiere snapshot 25-09 ausente. Lista de roles antigua en server README.
- **Impacto:** operador configura/reconcilia fuentes incorrectamente; auditoría futura toma evidencia histórica como actual.
- **Marcos:** ISO 9001/12207/27036; NIST SSDF provenance.
- **Propuesta:** actualizar después de decidir metadata/fuente; etiquetar snapshots históricos. USR-ACT-013/014.

### QUAL-USR-001 — Tests felices no cubren la matriz distribuida real

- **Categoría/severidad/confianza/estado:** testing; MEDIA; CONFIRMADO; ABIERTO.
- **Archivos:** tests admin/Auth0/identity/frontend/MySQL.
- **Evidencia:** 682 pass, pero integración MySQL omitida; parciales se prueban como respuesta, no como recovery/retry; no hay E2E Auth0 ni UI recovery.
- **Impacto:** regresiones de consistencia pueden pasar verde.
- **Marcos:** ISO 29119/25040; NIST SSDF.
- **Propuesta:** fault-injection/state-model tests y DB efímera. USR-ACT-014.

### QUAL-USR-002 — Modales custom no cierran completamente el ciclo de foco/error

- **Categoría/severidad/confianza/estado:** accesibilidad/UX; BAJA; CONFIRMADO estático, pruebas completas NO VERIFICABLES.
- **Archivos:** create/edit/unlink modals y CSS.
- **Evidencia:** foco inicial/Escape sí; sin trap/restore; unlink muestra error detrás.
- **Impacto:** navegación teclado confusa y fallo sensible poco visible.
- **Marcos:** Ley 20.422; ISO 25010 usability/accessibility.
- **Propuesta/tests:** dialog accesible compartido o patrón probado; teclado/AT. USR-ACT-012.

### DEAD-USR-001 — Página separada de creación y CSS son muertos confirmados

- **Categoría/severidad/confianza/estado:** código muerto; BAJA; CONFIRMADO; LISTO solo tras repetir mapa.
- **Archivos/símbolos:** UserCreatePage y CSS; ruta constante/create redirect/navigation icon.
- **Evidencia:** sin import/call; router redirige; CSS solo importado por página.
- **Impacto:** confusión, selectores de firma legacy y costo de mantenimiento; sin impacto runtime por lazy import ausente.
- **Marcos:** ISO 5055/12207. Bloque 2: no se promete mejora perceptible.
- **Propuesta/riesgo/tests:** eliminar ambos, conservar redirect/constante si compatibilidad URL; build/routes tests y cero referencias. USR-ACT-015.

## 36. Hallazgos descartados

| Hipótesis | Evidencia que la descarta |
|---|---|
| UI es única barrera departamental | controller valida current/next target y lista filtra en DB; matriz HTTP pasa |
| Soporte puede asignarse por payload | `FUNCTIONAL_ROLES` excluye Soporte en validator/service/UI |
| Admin puede cambiar su propio rol o desvincularse | controles server-side + tests 409 |
| PIN llega al controller/repo de update | `requirePin` valida actor y borra `body.pin` |
| Hash/ciphertext PIN se devuelve al browser | `toUserResponse`/DTO no los proyectan |
| Create copia nombre/RUT a Auth0 | payload create contiene email/connection/password únicamente |
| Contraseña temporal se devuelve/persiste | solo memoria, no respuesta/test confirma ausencia |
| Listado permite SQL injection raw | usa filtros Prisma; no concatena SQL |
| PIN aceptado deja de validar si rota PIN_SECRET | validación usa scrypt hash/salt; lo que se rompe es pending/fingerprint |
| `signatureUpload.js` sigue activo | archivo ausente, historial confirma retiro |
| UserCreatePage sigue en router | ruta redirige; componente sin import |
| Base actual contiene duplicados normalizados o PII obligatoria vacía | agregados físicos dieron cero |

## 37. Observaciones no confirmadas

- Estado actual de Auth0: roles por usuario, permisos directos, scope M2M, Action/binding, blocked/email y provider de correo.
- Duración/revocación de tokens y ventana real tras role/status change.
- Si `app_metadata` es consumida por integraciones externas no presentes en el repositorio.
- Política autorizada para que admins consulten movimientos laborales y texto libre.
- Finalidad/base jurídica exacta del RUT y períodos de conservación.
- Contratos/localización/subencargados de Auth0/Aiven/hosting.
- Contraste y experiencia con tecnologías de asistencia.
- Latencia a 1k/10k usuarios y cuotas reales Auth0.
- Aplicabilidad organizacional de Ley 21.663 y normas públicas/sectoriales.

## 38. Matriz de archivos

| Archivo | Rol/símbolos clave | Consumidores | Tablas/API | Estado | Hallazgos |
|---|---|---|---|---|---|
| `capaVista/src/modules/users/api/adminUsersApi.js` | `createAdminUsersApi`, cache movements | hook, tests | 7 endpoints | Activo | PERF-002/PRIV-002 |
| `hooks/useAdminUsersApi.js` | token + client factory | pages/forms | Auth0 SDK/API | Activo | — |
| `pages/UserManagementPage.jsx` | load list/summary, mutations | router | admin API | Activo | FUNC-001, races |
| `pages/UserManagementPage.module.css` | layout/table/modals/movements | casi todo Users UI | DOM | Activo | mantenibilidad |
| `pages/UserCreatePage.jsx` | página alta | ninguno | create form | Muerto | DEAD-001 |
| `pages/UserCreatePage.module.css` | estilos página/legado firma | solo página muerta | DOM | Muerto | DEAD-001 |
| `components/UserCreateForm.jsx` | validation/create/resend | create modal; página muerta | create/email | Activo parcial | ARCH-001/FUNC-001 |
| `components/UserCreateModal.jsx` | dialog custom | management page | DOM | Activo | QUAL-002 |
| `components/UserEditModal.jsx` | edit+PIN+self role UI | management page | PATCH user | Activo | QUAL-002 |
| `components/UserUnlinkConfirmModal.jsx` | unlink+PIN | management page | PATCH status | Activo | FUNC-001/QUAL-002 |
| `components/UserMovementsModal.jsx` | dialog, activity | management page | GET movements | Activo | PRIV-002 |
| `components/UserManagementFilters.jsx` | search/status/roles | management page | list/summary | Activo | DATA-002 |
| `components/UserManagementTable.jsx` | table/pagination/actions | management page | DTO | Activo | — |
| `components/UserManagementMobileList.jsx` | responsive list | table | DTO | Activo | — |
| `components/UserStatusBadge.jsx` | state labels | list | status | Activo | DATA-002 |
| `components/UserSummaryCards.jsx` | counters | management page | summary | Activo | DATA-002 |
| `components/UserButton.jsx` | shared Users button | components | DOM | Activo | — |
| `utils/userValidation.js` | name/email/RUT/role | create form | payload | Activo | DATA-004 |
| `capaServidor/src/modules/users/routes/adminUsers.routes.js` | route/middleware order | server | admin endpoints | Activo | auth map |
| `controller/adminUsers.controller.js` | 7 handlers/orchestration | router/tests | Auth0/Usuario/PIN | Activo | ARCH-001/DATA-003 |
| `repo/users.repo.js` | reads/writes/DTO/movements | controllers/auth/orders | Usuario/Registros | Activo | PRIV-001/DATA-002/PERF-001 |
| `service/auth0Management.service.js` | M2M/RBAC/status/email | users + auth + identity | Auth0 APIs | Activo | SEC-001/PERF-002/DOC-001 |
| `validators/adminUsers.validator.js` | allowlists/formats/query | controllers/tests | HTTP | Activo | DATA-004 |
| `shared/authorization.js` | roles/capabilities/scope | ambas capas | claims | Activo crítico | protegido |
| `middlewares/checkJwt.js` | JWT + identity + rate | todas rutas auth | Auth0/JWT | Activo crítico | DATA-003 |
| `middlewares/requireActiveIdentity.js` | estado/role sync | checkJwt | Usuario/Auth0 roles | Activo crítico | DATA-003 |
| `middlewares/requirePin.js` | PIN actor + body scrub | mutaciones sensibles | Usuario PIN | Activo crítico | protegido |
| `modules/auth/service/pin.service.js` | ciclo PIN/recovery | auth/users | Usuario/Challenge | Activo crítico | SEC-002/PRIV-003 |
| `pinDelivery.service.js` | delivery abstracto | PIN service | logs/proveedor | Activo crítico | SEC-002 |
| `app/providers/AuthProvider.jsx` | sesión backend verificada | toda SPA | auth verify | Activo crítico | token freshness |
| `prisma/schema.prisma` | modelo físico esperado | Prisma/runtime | MySQL | Activo, deriva | DATA-001 |
| `prisma/migrations/**` | historial declarativo | deploy | MySQL | Incompleto/divergente | DATA-001 |
| `docs/auth0/**`, READMEs | configuración/evidencia | operadores/tests | Auth0 | Histórico/divergente | DOC-001 |

## 39. Matriz de endpoints consolidada

| Método/endpoint | Auth | Permiso/scope | PIN | Input | Output | Sistemas | Fallos relevantes |
|---|---|---|---|---|---|---|---|
| GET users | JWT+active | manage:users + allowedRoles | No | page/perPage/search/status/role | PII+pagination | MySQL | query invalid 400; repo 500 |
| GET summary | igual | allowedRoles | No | — | 3 counts | MySQL | silent zero en SPA |
| GET movements | igual | target current role | No | strict page/perPage | records+total | MySQL | activity exposure; cache |
| POST users | igual | requested role | No | 5 fields allowlist | created/partial | Auth0, DB, PIN, email | parciales sin recovery |
| POST password email | igual | target active/current role | No | email only | requested flag | DB, Auth0 email | no per-target cooldown |
| PATCH user/:idAuth0 | igual | current+next role | Sí | 4 fields after scrub | user DTO | Auth0, DB | destructive role sequence |
| PATCH user/:idAuth0/status | igual | current role; no self unlink | Sí | status only after scrub | user DTO | Auth0, DB, PIN | blocked/local/PIN divergence |

## 40. Matriz de ciclo de vida

| Acción | UI/API | Controller | Auth0 | Repo/DB | PIN | Email | Parcial | Recovery/consumidor |
|---|---|---|---|---|---|---|---|---|
| Listar | page/GET | validate+scope | — | findMany+count | — | — | summary puede divergir | table/mobile |
| Crear | modal/POST | create handler | create+assign | create Activo/Pendiente | provision | setup | 3 parciales | solo PIN automático; otros incompletos |
| Editar datos/email | edit/PATCH | self/scope | patch email/metadata | update local | actor PIN | — | externo/local | profile/reset/list consumers |
| Cambiar rol | edit/PATCH | self/scope | delete+assign | update role | actor PIN | — | sin rol/local viejo | token/guards/all modules |
| Desvincular | modal/PATCH status | self/scope | blocked=true | estado desvinculado | invalidate | — | blocked/local/PIN | active middleware |
| Reactivar | solo request manual | scope | blocked=false | estado activo | ensure | — | activo sin rol/PIN | no UI; verify ayuda PIN |
| Reenviar password | solo create state/API | scope+active | change_password | find email | — | sí | delivery unknown | no UI durable |
| Autoprovision PIN | login verify | auth handler | — | Usuario updateMany | create pending | — | ciphertext pending | profile reveal/ack |
| Recuperar PIN | profile/auth API | auth handler | — | Challenge+Usuario | replace | delivery abstracto | prod 503/dev log | profile |

## 41. Matriz de consumidores detallada

| Contrato | Consumidor | Campos | Propósito | Rol/estado | Riesgo de cambio |
|---|---|---|---|---|---|
| `UserRepository.findByAuth0Id` DTO | active identity | id, auth0, role, status | validar sesión | crítico | todo acceso |
| mismo | order service | idUsuario | actor en pagos/etiquetas/transiciones | ya active por middleware | atribución/FK |
| mismo | message service | idUsuario | destinatario propio | ya active | acceso mensajes ajenos si rompe |
| `req.currentUser` | auth/profile/controllers | PII/id/role/status | perfil/actor/log | crítico | PII y autorización |
| `req.pinActor` | orders/payments/users | id+PII mínima | actor de operación sensible | PIN active | auditoría equivocada |
| Usuario relation en Pedidos | history/payments/metrics | id/nombre | vendedor/responsable | histórica | UI/estadística |
| Usuario relation en Registros | history/profile/movements | id/nombre/observación | actor/evento | histórica | privacidad/trazabilidad |
| Usuario→MENSAJE_USUARIO | messages/orders notifications | id | destinatario | admins activos seleccionados | mensajes perdidos/indebidos |
| Usuario→Pedido_Etiqueta | orders | id actor | atribución tag | histórica | FK/audit |
| Usuario→Avance_Lanyard | production load | id actor | avance | histórica | FK/audit |
| role catalog | backend capability/frontend guard/Auth0 docs | nombres/permisos | autorización | exactitud estricta | escalación/denegación |
| status strings | identity/PIN/Users/notifications | Activo/Vinculado/Desvinculado/Pending | lifecycle | crítico | inconsistencias |

## 42. Matriz de privacidad consolidada

La matriz completa está en §20. Decisiones pendientes por campo:

| Grupo | Mantener | Reducir | Decisión requerida |
|---|---|---|---|
| PII de identidad | local, scope departamental | idUsuario en DTO y app_metadata redundante | finalidad/base RUT y retención |
| PIN | hash/salt y pending solo mientras necesario | overfetch/logs/challenges vencidos | rotación coordinada futura, no ahora |
| Actividad | FK/registro necesario para negocio | prefetch, texto libre, exposición admin | permiso/finalidad/retención laboral |
| Audit security | actor/request/outcome | URL/id externo si no necesario | plazo e integridad del log |
| Proveedor | email/sub/rol estrictamente necesarios | metadata auxiliar | contratos/transferencias |

## 43. Matriz de calidad de identidad

| Invariante | Evidencia BD | Evidencia código/Auth0 | Resultado | Riesgo |
|---|---|---|---|---|
| id_auth0 único/no vacío | 0 inválidos/duplicados; unique | lookup exacto | Cumple local actual | Auth0 no contrastado |
| email único/normalizado | 0 inválidos/no normalizados; unique CI | normaliza create/update | Cumple local actual | drift externo |
| RUT lógico único/válido | 0 duplicados normalizados | solo regex | Parcial | DV/unique ausentes |
| rol reconocido | todos los datos actuales reconocidos | catalog/validator | Cumple local actual | tenant no contrastado |
| estado reconocido | 11 activo/1 desvinculado | strings + Pending posible | Actual OK; modelo abierto | clasificación pending |
| rol local↔RBAC | no visible en DB | sync condicional | No verificable | escalación/denegación |
| estado local↔blocked | no visible en DB | write secuencial | No verificable | token viejo |
| usuario activo utilizable | 1 activo sin PIN, autoprovisionable | ensure on verify | Parcial | depende de login y rol externo |
| desvinculado inutilizable | 1 sin PIN | middleware rechaza local | Cumple local | externo no leído |
| PIN consistente | 0 incoherencias estructurales | crypto flow | Cumple datos observados | delivery/secret/retention |
| challenge↔usuario | FK cascade | service | Integridad referencial | 12 vencidos |
| campos secretos no API | no inspección de valores | DTO explícito | Cumple salida | overfetch interno |
| relaciones históricas | counts/FK | consumidores múltiples | Conservadas | impiden borrado simple |
| self restrictions | N/A | tests/controller | Cumple | mantener tests |
| parciales recuperables | N/A | responses | No cumple | huérfanos |

## 44. Matriz de BD

| Operación | Service/repo | Modelo/tabla | Query | Índices | Cardinalidad observada | Plan | Hallazgo |
|---|---|---|---|---|---:|---|---|
| find email | UserRepository | Usuario | findUnique lower(email) | unique email | 12 | unique esperado | OK local |
| find sub | UserRepository/PIN | Usuario | findUnique id_auth0 | unique id_auth0 | 12 | unique esperado | OK |
| list | UserRepository | Usuario | OR contains + scope + order/skip/take | PK/unique no búsqueda | 12 | backward PK + where | PERF-001 |
| count list | UserRepository | Usuario | count same where | ninguno rol/status | 12 | scan posible | PERF-001 |
| summary | UserRepository | Usuario | 2 counts allowedRoles/status | ninguno | 12 | ALL | PERF-001/DATA-002 |
| create/update | UserRepository | Usuario | create/update unique sub | unique | 12 | point write | distribuida fuera de tx |
| role CAS | identity | Usuario | updateMany sub+old role+active | id_auth0 unique + filters | 12 | point candidate | robusto |
| movements | UserRepository | Registros | user + order time/id, count | user individual | 406 actor rows | no EXPLAIN específico | medir compuesto |
| PIN provision | PinService | Usuario | updateMany id+hash null | PK | 12 | point | idempotente local |
| recovery | PinService | Challenge | latest unused delivered | `(user,created)` | 12 | index útil | retención |
| audit admin | supportAudit | SecurityAuditEvent | create | schema indexes | tabla ausente | falla | DATA-001 |
| rate | throttle | SecurityThrottle | upsert | tabla ausente | 0 | dev usa memoria | prod bloqueado |

## 45. Matriz de optimización

| ID | Área | Baseline | Problema demostrado | Propuesta | Métrica futura | Riesgo |
|---|---|---|---|---|---|---|
| OPT-01 | list/search | 12 filas; plan PK/where | wildcard 4 campos | medir staging; límite; estrategia de search | p50/p95, rows examined | índice inútil si patrón sigue `%x%` |
| OPT-02 | summary | full scan 12 | 2 counts + no rol/status index | medir; groupBy/índice solo con beneficio | queries, latency, plan | write overhead |
| OPT-03 | movements | 406 actor rows | sort no cubierto por índice user | EXPLAIN y candidato compuesto | filesort/rows/p95 | DDL deriva |
| OPT-04 | Auth0 roles | 2 GET iguales/update | duplicación confirmada | una enumeración paginada | calls update 6→5 | respuesta parcial/stale |
| OPT-05 | M2M token | token por operación | llamada extra | cache segura condicionada | hit ratio/latency | token leakage/stale |
| OPT-06 | frontend summary | requests separadas/race | stale/zero silencioso | request version/estado error | stale incidents | complejidad |
| OPT-07 | repo projection | lee modelo completo | material PIN innecesario | select seguro | bytes/columns | olvidar campo consumidor |

## 46. Matriz de símbolos candidatos a cambio

| Símbolo | Definición | Imports/call sites | Tests | HTTP/dynamic | Cambio propuesto | Riesgo |
|---|---|---|---|---|---|---|
| `createAdminUserHandler` | controller | router, tests | admin routes | POST users | orquestación idempotente | Alto contrato |
| `createUpdateAdminUserHandler` | controller | router/tests | admin/self role | PATCH user | operation/reconcile | Alto |
| `createUpdateAdminUserStatusHandler` | controller | router/tests/RBAC | status tests | PATCH status | state machine | Alto |
| `replaceUserRole` | Auth0 service privado | updateAuth0User | Auth0 tests | Management API | delta/verify/compensate | Alto external |
| `requestManagementToken` | privado | all management funcs | mocks | OAuth | timeout/cache opcional | Alto secret |
| `getAuth0UserRole` | service | active identity/tests | role sync | GET roles | ampliar snapshot solo si necesario | Alto auth latency |
| `UserRepository.toUserResponse` | privado | all repo reads/writes | repo/routes | DTO | select constante | Medio |
| `buildListWhere/getSummary` | repo | list/tests | routes | GET | estados explícitos | Medio |
| `PinService` methods | auth service | auth/users/requirePin | auth/pin tests | auth API | delivery/purge/concurrency | Alto PIN |
| `UserCreateForm` | component | modal + dead page | frontend static | POST | conservar parciales | Medio UX |
| `UserManagementPage` loaders | page | router | frontend checks | GET/mutations | race/error states | Medio |
| `UserCreatePage` | page | ninguno | ruta redirect | no dynamic import | delete | Bajo; repetir rg |
| `updateRoleByAuth0Id` | repo | solo tests | users.repo | no HTTP directo | posible delete | Bloqueado hasta búsqueda final |
| status/role strings | shared/code/DB/docs | muchos | amplios | contracts/claims | centralizar sin rename inmediato | Alto compatibilidad |

## 47. Matriz de trazabilidad hallazgo → acción → prueba

| Hallazgo | Acción | Prueba de cierre |
|---|---|---|
| ARCH-USR-001 | 004, 008 | fault matrix + retry idempotente + UI conserva parcial |
| SEC-USR-001 | 005, 014 | assign/delete/rollback y tokens previos |
| DATA-USR-001 | 001, 003 | migrate status reproducible + tablas/indexes + rollback staging |
| SEC-USR-002 | 002, 007 | matriz APP_ENV/NODE_ENV, cero secreto log, provider stub/integration |
| DATA-USR-002 | 007 | filtros/summary con Pending/unknown/null |
| FUNC-USR-001 | 008 | E2E mock create partial/resend/reactivate |
| DATA-USR-003 | 004–006 | cada paso OK/FAIL y reconciliación |
| PRIV-USR-001 | 009 | mocks Prisma comprueban select y DTO mínimo |
| PRIV-USR-002 | 009 | decisión aprobada + authorization/privacy tests |
| PRIV-USR-003 | 007 | purge batch/TTL y counts |
| DATA-USR-004 | 010 | DV/canonicalización/conflictos/preflight |
| PERF-USR-001 | 011 | p50/p95 + EXPLAIN 10/100/1k/10k |
| PERF-USR-002 | 013 | timeout, retries y call-count tests |
| DOC-USR-001 | 013, 014 | docs-check/snapshot actualizado |
| QUAL-USR-001 | 014 | suites fault/E2E/ephemeral DB |
| QUAL-USR-002 | 012 | keyboard/AT tests |
| DEAD-USR-001 | 015 | build, routes, `rg` cero referencias |

## 48. Plan maestro de acciones

Las acciones siguientes son especificación de trabajo futuro: **esta auditoría no implementó ninguna de ellas**. Los estados significan:

- `LISTA PARA IMPLEMENTAR`: evidencia y contrato suficientes; aún requiere PR, revisión y pruebas.
- `BLOQUEADA`: no ejecutar hasta cumplir todas las precondiciones indicadas.
- `CONDICIONADA A MEDICIÓN`: no justificar DDL u optimización sin baseline representativo.

### USR-ACT-001 — Reconciliar schema, migraciones y base física

- **Hallazgos / prioridad / estado:** DATA-USR-001; **P0**; `BLOQUEADA`.
- **Objetivo y evidencia:** recuperar una cadena de migraciones reproducible antes de cualquier cambio funcional. La BD física registra dos migraciones de PIN ausentes del repositorio y no registra varias migraciones locales; faltan físicamente `SecurityAuditEvent`, `SecurityThrottle` e `idx_records_order_cursor`; `prisma migrate status` terminó en `Schema engine error` mientras `prisma validate` aprobó.
- **Archivos y símbolos exactos:** `capaServidor/prisma/schema.prisma`; `capaServidor/prisma/migrations/**/migration.sql`; scripts Prisma de `capaServidor/package.json`; modelos `SecurityAuditEvent`, `SecurityThrottle`, `Usuario`, `PinRecoveryChallenge`, `Registros`.
- **Consumidores / operaciones / tablas:** arranque y despliegue backend, `supportAudit`, rate limiter, Users, PIN, pedidos e historial; `_prisma_migrations`, tablas anteriores e índices de `Registros`.
- **Contrato antes → después:** hoy el schema Git no describe de forma reproducible la BD observada; después, una base vacía y una copia del estado real deben converger al mismo schema y checksums mediante una secuencia documentada, sin editar migraciones ya aplicadas.
- **Precondiciones:** backup verificable; restore ensayado; acceso a staging clonada y anonimizada; recuperar desde artefactos de despliegue los SQL y checksums ausentes; dueño técnico/DBA; ventana y rollback acordados. No inferir ni marcar migraciones como aplicadas en producción por conveniencia.
- **Implementación propuesta:** 1) exportar inventario y checksums de `_prisma_migrations`; 2) localizar los dos SQL ausentes en artefactos/CI; 3) comparar schema lógico, físico y una BD reconstruida; 4) crear, solo si hace falta, una migración de reconciliación nueva y aditiva; 5) probar `migrate deploy` desde cero y sobre clon; 6) validar tablas, FKs, índices y datos; 7) ensayar rollback/restore; 8) desplegar antes que acciones dependientes.
- **Búsquedas a repetir:** `rg -n "SecurityAuditEvent|SecurityThrottle|PinRecoveryChallenge|idx_records_order_cursor" capaServidor`; listar directorios de migración; consultar `information_schema` y `_prisma_migrations` en cada ambiente.
- **No modificar:** checksums/SQL ya aplicados, datos reales, nombres de rol/estado o contratos HTTP durante esta acción.
- **Capas:** frontend ninguna; backend solo compatibilidad/health checks si se aprueba; BD/migración sí, exclusivamente tras precondiciones.
- **Pruebas / baseline / métrica:** `prisma validate`, `migrate status`, despliegue desde BD vacía y clon, smoke de Users/PIN/audit/rate limit; baseline de §29; éxito = cero drift no explicado, mismas tablas/índices/checksums y restore dentro del RTO acordado.
- **Trazabilidad:** Ley 21.719: seguridad, responsabilidad y continuidad; ISO 27001 A.8.9/A.8.13/A.8.32, ISO 27701 controles de seguridad; OWASP ASVS V14; CWE-1104.
- **Riesgos / regresiones / aceptación / rollback / dependencias:** riesgo crítico de caída o pérdida si se ejecuta sin clon. Aceptar solo con acta de comparación y pruebas verdes. Rollback mediante restore ensayado o reversa específica no destructiva. Bloquea 003, 004, 006, 007 y cualquier nuevo DDL.

### USR-ACT-002 — Corregir entrega y exposición del PIN

- **Hallazgos / prioridad / estado:** SEC-USR-002; **P0**; `BLOQUEADA` para habilitar producción, aunque el endurecimiento de logs/configuración queda listo para un PR aislado.
- **Objetivo y evidencia:** impedir que el código PIN se registre o se entregue por una ruta equivocada y disponer de un canal real seguro. `pin.service.js` decide con `NODE_ENV`, mientras la aplicación usa `APP_ENV`; el adaptador de desarrollo imprime correo y código; producción responde indisponibilidad.
- **Archivos y símbolos exactos:** `capaServidor/src/modules/auth/service/pin.service.js`, `PinService`; `capaServidor/src/modules/auth/service/pinDelivery.service.js`, adaptador de delivery y selección de ambiente; `capaServidor/src/modules/auth/controller/auth.controller.js` handlers de PIN; `capaServidor/src/config/environment.js` y sus pruebas.
- **Consumidores / operaciones / tablas:** alta de usuario, recuperación/cambio/verificación de PIN, soporte y login; `Usuario`, `PinRecoveryChallenge`; no cambiar el hash aceptado en esta acción.
- **Contrato antes → después:** hoy una configuración divergente puede activar delivery de desarrollo y exponer el secreto; después, producción falla cerrada sin proveedor configurado, ningún ambiente registra PIN/email completos y el resultado distingue entrega pendiente de entrega exitosa sin revelar el secreto.
- **Precondiciones:** elegir proveedor/canal, finalidad y retención; aprobar plantilla y tratamiento de PII; gestionar secretos fuera del repo; sandbox del proveedor. No habilitar envíos reales durante desarrollo de la acción.
- **Implementación propuesta:** 1) centralizar un único resolver de ambiente validado al arrancar; 2) reemplazar logs por event ID y destino enmascarado; 3) definir interfaz de delivery y adaptadores `disabled/test/provider`; 4) fallar cerrado en producción; 5) mantener códigos solo en fixtures de test; 6) integrar proveedor en sandbox; 7) documentar runbook y alertas; 8) probar expiración, reintento y no enumeración.
- **Búsquedas a repetir:** `rg -n "NODE_ENV|APP_ENV|console\.|pin|recovery" capaServidor/src capaServidor/test`; revisar captura central de logs.
- **No modificar:** `PIN_SECRET`, PINs reales, algoritmo/hash vigente ni challenges reales; no rotar secretos como parte de este trabajo.
- **Capas:** frontend solo mensajes genéricos si cambia el error; backend sí; BD sin DDL; proveedor externo solo sandbox.
- **Pruebas / baseline / métrica:** matriz `development/test/production` con variables presentes/ausentes, inspección de logs, provider fake y sandbox; baseline: producción no tiene delivery y desarrollo registra el valor; éxito = cero secretos/PII completos en logs, 100% de intentos con outcome auditable y entrega sandbox medida.
- **Trazabilidad:** Ley 21.719: seguridad, confidencialidad, minimización; ISO 27001 A.5.17/A.8.11/A.8.12, ISO 27701; OWASP ASVS V2/V7, NIST 800-63B; CWE-532/CWE-312.
- **Riesgos / regresiones / aceptación / rollback / dependencias:** riesgo de bloquear recuperación o filtrar PIN. Aceptar con revisión de secretos/logs y prueba sandbox. Rollback al adaptador `disabled`, nunca al log de código. La entrega real depende de decisión/proveedor; la persistencia de audit depende de 001/003.

**Avance posterior a la auditoría — 2026-09-27:** se completó el endurecimiento local no bloqueado. `APP_ENV` es ahora la única fuente de entorno para PIN/debug; el adaptador de consola fue retirado; el delivery por defecto falla cerrado en `development`, `test` y `production`; la SPA ya no instruye buscar códigos en consola; se añadieron pruebas con delivery falso y respuesta 503. El proveedor real, sandbox, plantillas, secretos operacionales, métricas y auditoría durable continúan bloqueados por las precondiciones anteriores. No se tocaron Auth0, correo, PIN ni BD reales.

### USR-ACT-003 — Auditoría administrativa semántica y durable

- **Hallazgos / prioridad / estado:** DATA-USR-001, PRIV-USR-003; **P0**; `BLOQUEADA` por USR-ACT-001 y por política de retención.
- **Objetivo y evidencia:** registrar de forma verificable quién intentó y completó altas, cambios de rol/estado, reintentos y recovery, incluidos fallos parciales. `supportAudit` captura acción/recurso de modo asíncrono, pero la tabla física `SecurityAuditEvent` no existe; el evento actual no representa before/after ni pasos distribuidos.
- **Archivos y símbolos exactos:** middleware `supportAudit` y su registro en rutas; `capaServidor/src/modules/users/routes/adminUsers.routes.js`; controladores `createAdminUserHandler`, `createUpdateAdminUserHandler`, `createUpdateAdminUserStatusHandler`, `createResendPasswordSetupEmailHandler`; `schema.prisma` modelo `SecurityAuditEvent`.
- **Consumidores / operaciones / tablas:** seguridad, soporte, investigaciones y titulares; todas las mutaciones `/api/admin/users*`; `SecurityAuditEvent`, eventualmente una operación correlacionada aprobada por diseño.
- **Contrato antes → después:** hoy el audit es best-effort, técnico y puede desaparecer; después cada mutación emite `operationId`, actor local/external, objetivo, propósito/action, before/after minimizado, pasos/outcomes, error clasificado y timestamp, sin PIN/token/cuerpo sensible.
- **Precondiciones:** 001 cerrado; catálogo de eventos; base legal/finalidad, acceso y plazo; decisión sobre atomicidad/outbox; revisión de privacidad.
- **Implementación propuesta:** 1) diseñar esquema de evento versionado; 2) redactar lista de campos prohibidos; 3) instrumentar inicio, pasos externos/locales y resultado; 4) usar escritura durable u outbox según ADR; 5) alertar si no persiste; 6) filtrar URL/body/PII; 7) crear consultas operacionales con acceso restringido; 8) definir purge legal-hold aware.
- **Búsquedas a repetir:** `rg -n "supportAudit|SecurityAuditEvent|audit" capaServidor`; inventariar cada ruta mutadora y cada logger/error middleware.
- **No modificar:** respuestas públicas con datos sensibles, historiales operacionales existentes ni logs reales sin aprobación.
- **Capas:** frontend puede propagar `operationId` para soporte; backend y BD sí tras 001; migración nueva, nunca edición de una aplicada.
- **Pruebas / baseline / métrica:** éxito/fallo por cada paso con fake Auth0/DB, redacción de secretos, caída del audit store y correlación; baseline: tabla ausente y persistencia cero; éxito = 100% de mutaciones correlacionables, 0 campos prohibidos, alertas por pérdida.
- **Trazabilidad:** Ley 21.719: responsabilidad, seguridad, trazabilidad y ejercicio de derechos; ISO 27001 A.8.15/A.8.16, ISO 27701; OWASP ASVS V7/V10; CWE-778/CWE-532.
- **Riesgos / regresiones / aceptación / rollback / dependencias:** riesgo de registrar PII/secreto o degradar disponibilidad. Aceptar con threat/privacy review y pruebas de carga. Rollback desactiva el nuevo sink conservando eventos ya emitidos; no borrar audit. Depende de 001 y alimenta 004–008.

### USR-ACT-004 — Alta idempotente y reconciliable Auth0 ↔ MySQL

- **Hallazgos / prioridad / estado:** ARCH-USR-001, DATA-USR-003; **P0**; `BLOQUEADA`.
- **Objetivo y evidencia:** eliminar huérfanos y permitir reintento seguro del alta. El flujo actual crea en Auth0, asigna rol, crea local, provisiona PIN y entrega; un fallo local tras crear Auth0 deja un usuario externo que hace fallar el retry por duplicado; `Pendiente rol` no tiene reconciliador formal.
- **Archivos y símbolos exactos:** `capaServidor/src/modules/users/controller/adminUsers.controller.js:createAdminUserHandler`; `capaServidor/src/modules/users/service/auth0Management.service.js:createAuth0User`, asignación de rol y lookup; `capaServidor/src/modules/users/repo/users.repo.js:createUser`; `PinService`; `capaServidor/src/modules/users/validators/adminUsers.validator.js`; frontend `UserCreateForm`/`UserCreateModal`.
- **Consumidores / operaciones / tablas:** `POST /api/admin/users`, reenvío de configuración y futura consola de recovery; Auth0 user/roles; `Usuario`, PIN/challenges y audit.
- **Contrato antes → después:** hoy repetir la misma solicitud no garantiza el mismo resultado; después un `operationId`/idempotency key y una máquina de pasos devuelven el estado actual, retoman lo pendiente o compensan de forma segura, sin crear identidades distintas.
- **Precondiciones:** 001 y 003; política explícita para adoptar o eliminar huérfanos; ventana de idempotencia; verificación de capacidades/scopes en tenant de prueba; no reconciliar por email solamente.
- **Implementación propuesta:** 1) definir identidad estable y estados de operación; 2) reservar/validar idempotency key; 3) buscar por `id_auth0` y metadata de operación; 4) ejecutar pasos con compare-and-set; 5) verificar postcondición tras cada write; 6) compensar solo cuando sea seguro; 7) crear reconciliador/cola manual auditable; 8) responder `completed|pending|failed_recoverable`; 9) adaptar UI.
- **Búsquedas a repetir:** `rg -n "createAdminUserHandler|createAuth0User|createUser|Pendiente rol|recoverable" capaServidor capaVista`; inventariar todos los callers HTTP.
- **No modificar:** usuarios reales/tenant productivo durante implementación; no borrar un usuario Auth0 preexistente por coincidencia de email; no acoplar idempotencia al PIN en claro.
- **Capas:** frontend, backend y posiblemente BD/migración tras 001; Auth0 únicamente tenant de prueba.
- **Pruebas / baseline / métrica:** matriz de fallo antes/después de cada paso, doble submit/concurrencia, timeout ambiguo y retry; baseline: secuencia lineal sin compensación; éxito = cero duplicados/huérfanos en pruebas, retry converge y cada parcial queda visible/auditable.
- **Trazabilidad:** Ley 21.719: exactitud, seguridad, responsabilidad; ISO 27001 A.8.26/A.8.32, ISO 25010 fiabilidad; OWASP ASVS V1/V4; CWE-362/CWE-841.
- **Riesgos / regresiones / aceptación / rollback / dependencias:** alto riesgo de borrar/adoptar identidad equivocada. Aceptar con tenant sandbox y fault injection completo. Rollback deshabilita nuevas operaciones, conserva ledger y deriva a runbook; no compensación masiva. Depende de 001/003 y precede 008/014.

### USR-ACT-005 — Reemplazo seguro de rol externo

- **Hallazgos / prioridad / estado:** SEC-USR-001, DATA-USR-003; **P0**; `BLOQUEADA` hasta validar semántica Auth0.
- **Objetivo y evidencia:** evitar ventanas sin rol o divergencia local. `replaceUserRole` enumera roles dos veces, elimina todos los roles oficiales y luego asigna el nuevo; el mock controlado confirmó que si el POST final falla queda sin rol y sin compensación.
- **Archivos y símbolos exactos:** `capaServidor/src/modules/users/service/auth0Management.service.js:replaceUserRole`, `updateAuth0User`, getters/assign/remove roles; `adminUsers.controller.js:createUpdateAdminUserHandler`; catálogo compartido de roles; `UserRepository.updateRoleByAuth0Id` y CAS vigente.
- **Consumidores / operaciones / tablas:** `PATCH /api/admin/users/:auth0Id`, active identity, guards, menús y permisos departamentales; Auth0 roles/app_metadata y `Usuario.rol`.
- **Contrato antes → después:** hoy delete-all seguido de add puede dejar cero roles y el local sin converger; después se calcula delta desde un snapshot, se añade/verifica el rol destino antes de retirar el anterior cuando el proveedor lo permita, o se compensa/verifica explícitamente; local solo confirma una postcondición externa inequívoca.
- **Precondiciones:** probar en tenant no productivo add-before-remove, propagación de claims, rate limits, paginación y scopes; decidir política ante múltiples roles/roles no oficiales; 003 para audit.
- **Implementación propuesta:** 1) una enumeración paginada; 2) validar exactamente el set reconocido; 3) add destino idempotente; 4) verificar; 5) remover solo roles oficiales anteriores; 6) verificar set final; 7) CAS local; 8) compensar al snapshot seguro si falla; 9) marcar operación pendiente si hay timeout ambiguo; 10) invalidar sesión según 006.
- **Búsquedas a repetir:** `rg -n "replaceUserRole|updateAuth0User|updateRoleByAuth0Id|getAuth0UserRole" capaServidor`; revisar todos los roles y tests RBAC.
- **No modificar:** roles no administrados por la app, tenant real, nombres canónicos ni permisos en el mismo PR.
- **Capas:** backend/Auth0; frontend solo estados pendientes; BD sin DDL salvo ledger ya aprobado.
- **Pruebas / baseline / métrica:** fallar cada GET/POST/DELETE/verify/CAS, paginación/múltiples roles y doble request; baseline = hasta 6 llamadas y ventana sin rol; éxito = ninguna postcondición silenciosa, convergencia demostrada y reducción 6→5 o menos sin sacrificar verificación.
- **Trazabilidad:** Ley 21.719 seguridad/acceso; ISO 27001 A.5.15/A.8.2/A.8.3; OWASP ASVS V4, NIST 800-53 AC-2/AC-6; CWE-269/CWE-284.
- **Riesgos / regresiones / aceptación / rollback / dependencias:** riesgo crítico de escalación o lockout. Aceptar con tenant sandbox, tokens antiguos/nuevos y fault matrix. Rollback ejecuta reconciliación al snapshot, no otro delete-all. Depende de 003 y se coordina con 006.

### USR-ACT-006 — Estado de usuario, bloqueo y sesión convergentes

- **Hallazgos / prioridad / estado:** DATA-USR-003, SEC-USR-001; **P0**; `BLOQUEADA` por decisión de sesión/estado.
- **Objetivo y evidencia:** asegurar que desvincular impida acceso aun ante fallos parciales y que reactivar sea controlado. Hoy se bloquea Auth0, luego se actualiza BD y se invalida PIN; si falla BD, el token anterior puede seguir aceptado porque `requireActiveIdentity` confía en el estado local y no consulta `blocked` externo.
- **Archivos y símbolos exactos:** `adminUsers.controller.js:createUpdateAdminUserStatusHandler`; `auth0Management.service.js:updateAuth0User`; middleware `requireActiveIdentity`, JWT/authorization y `requirePin`; `PinService.invalidate`; frontend action de desvincular.
- **Consumidores / operaciones / tablas:** `PATCH /api/admin/users/:auth0Id/status`, todas las rutas protegidas, PIN y sesiones; `Usuario.estado`, campos PIN y Auth0 `blocked/app_metadata`.
- **Contrato antes → después:** hoy una respuesta fallida no revela cuál autoridad cambió y un token previo puede sobrevivir; después existe transición versionada, deny-by-default para estados no activos/pending y estrategia explícita de revocación o límite de antigüedad del token, con reconciliación de Auth0/local/PIN.
- **Precondiciones:** decidir fuente de verdad durante transición, SLA de revocación, reactivación y tratamiento de sesiones; validar capacidades Auth0; 003 y, si hay nuevo estado persistido, 001.
- **Implementación propuesta:** 1) especificar estados/transiciones; 2) separar intención y confirmación; 3) bloquear acceso local inmediatamente con CAS; 4) ejecutar/confirmar bloqueo externo; 5) invalidar PIN de forma idempotente; 6) introducir `sessionVersion`/`updatedAt` o revocación equivalente; 7) reconciliar parciales; 8) reactivar con PIN nuevo o política aprobada; 9) alertar divergencias.
- **Búsquedas a repetir:** `rg -n "requireActiveIdentity|Desvinculado|Vinculado|Activo|blocked|invalidate" capaServidor capaVista` y todos los routers protegidos.
- **No modificar:** TTL global de tokens, reglas Auth0 ni usuarios reales sin análisis de impacto y tenant de prueba.
- **Capas:** backend/Auth0/posible migración; frontend para mostrar transición y reactivación; BD tras 001.
- **Pruebas / baseline / métrica:** tokens emitidos antes/después, fallo en cada paso, requests concurrentes, reactivación y PIN viejo; baseline: local activo permite token aunque externo ya esté bloqueado; éxito = acceso denegado dentro del SLA, cero PIN viejo tras desvinculación y reconciliación observable.
- **Trazabilidad:** Ley 21.719 seguridad y acceso; ISO 27001 A.5.16/A.5.18/A.8.5; OWASP ASVS V2/V4, NIST 800-63B; CWE-613/CWE-863.
- **Riesgos / regresiones / aceptación / rollback / dependencias:** lockout masivo o ventana de acceso. Aceptar con canary/sandbox y runbook break-glass auditado. Rollback del despliegue no debe reactivar usuarios; reconciliar caso a caso. Depende de 001/003/005 y precede la reactivación UI.

### USR-ACT-007 — Estados explícitos y retención de artefactos PIN

- **Hallazgos / prioridad / estado:** DATA-USR-002, PRIV-USR-003, SEC-USR-002; **P1**; `BLOQUEADA` por política de lifecycle/retención.
- **Objetivo y evidencia:** dejar de clasificar estados pendientes como vinculados y eliminar datos efímeros vencidos conforme a una regla aprobada. Listado y resumen usan “distinto de Desvinculado”; la BD observada contiene 12 challenges vencidos y un PIN pendiente.
- **Archivos y símbolos exactos:** `users.repo.js:buildListWhere`, `getSummary`; validators de status; catálogo/constantes de estado; `PinService` creación/consumo/cleanup; frontend filtros, badges y summary cards; `schema.prisma:PinRecoveryChallenge`.
- **Consumidores / operaciones / tablas:** list/summary Users, active identity, notificaciones, reactivación y recuperación; `Usuario`, `PinRecoveryChallenge`.
- **Contrato antes → después:** hoy `NOT Desvinculado` equivale implícitamente a vinculado; después cada consulta usa allowlists de estados, unknown/null falla cerrado y summary expone categorías coherentes. Challenges/códigos pendientes expiran y se purgan según TTL, legal hold y métricas.
- **Precondiciones:** dueño de negocio define `Activo`, `Vinculado`, `Pendiente rol`, transición y reactivación; privacidad/legal aprueban retención; 001 antes de jobs/DDL.
- **Implementación propuesta:** 1) documentar state machine; 2) centralizar predicados sin renombrar valores aún; 3) cambiar filtros/counts a allowlists; 4) definir política de PIN pendiente/challenge; 5) implementar job idempotente por lotes con dry-run; 6) métricas/alertas; 7) backfill solo con script revisado; 8) reflejar categorías en UI.
- **Búsquedas a repetir:** `rg -n 'Activo|Vinculado|Desvinculado|Pendiente rol|PinRecoveryChallenge' capaServidor capaVista`; consulta de distribución antes/después.
- **No modificar:** filas reales ni borrar challenges antes de aprobar retención, dry-run y backup; no reutilizar un PIN pendiente al reactivar.
- **Capas:** frontend/backend; BD job/migración solo tras 001.
- **Pruebas / baseline / métrica:** tabla exhaustiva de estados incluyendo null/unknown, summary=list, expiración/batches/concurrencia; baseline §29: 11 activos, 1 desvinculado, 12 challenges vencidos; éxito = clasificación exacta y backlog vencido dentro del SLA sin borrar eventos retenidos.
- **Trazabilidad:** Ley 21.719 exactitud, minimización, conservación limitada y seguridad; ISO 27701 PII lifecycle, ISO 27001 A.8.10; OWASP ASVS V8; CWE-459/CWE-672.
- **Riesgos / regresiones / aceptación / rollback / dependencias:** cambios de conteo, lockout o borrado prematuro. Aceptar con decisión firmada y dry-run comparado. Rollback de código conserva datos; purga requiere backup/restore definido. Depende de 001/002/003/006.

### USR-ACT-008 — UX de parciales, reintento y reactivación

- **Hallazgos / prioridad / estado:** FUNC-USR-001, ARCH-USR-001; **P1**; `BLOQUEADA` hasta estabilizar contratos 004/006/007.
- **Objetivo y evidencia:** no informar éxito total ni perder recuperación cuando el backend devuelve un alta parcial. El modal se cierra ante todo 201, la página muestra éxito y el estado/retry de `UserCreateForm` queda inaccesible; no hay acción de reactivación aunque el endpoint admite estado activo.
- **Archivos y símbolos exactos:** `UserCreateForm`, `UserCreateModal`, `UserManagementPage`, `UserUnlinkConfirmModal`, `useAdminUsersApi`, `adminUsersApi`, `UserStatusBadge`; handlers 004/006.
- **Consumidores / operaciones / tablas:** administradores autorizados; alta, resend/reconcile y status; sin acceso directo a tablas.
- **Contrato antes → después:** hoy HTTP 201 se interpreta como final; después la UI discrimina `completed|pending|failed_recoverable`, conserva `operationId` y contexto mínimo, permite retry idempotente, no repite datos sensibles y ofrece reactivación solo si backend/política lo permiten.
- **Precondiciones:** schemas de respuesta versionados 004/006; copy aprobada; matriz de permisos/estado; diseño accesible.
- **Implementación propuesta:** 1) tipar/normalizar outcomes API; 2) no cerrar modal en pending; 3) presentar pasos y acción segura; 4) reconsultar operación/usuario; 5) bloquear doble submit; 6) agregar reactivación con PIN/confirmación definidos; 7) manejar expiración y sesión; 8) instrumentar sin PII.
- **Búsquedas a repetir:** `rg -n "recoverable|onSuccess|201|status|resend|reactiv" capaVista/src/modules/users` y rutas/imports.
- **No modificar:** copy como promesa legal, ni habilitar acción antes del backend; no guardar PIN/email completo en storage o telemetría.
- **Capas:** frontend principal; backend solo contratos ya definidos; BD ninguna directa.
- **Pruebas / baseline / métrica:** component/integration/E2E mock para cada outcome, reload, doble click, retry y roles; baseline: modal se cierra en parcial; éxito = cero falso éxito en fixtures, retry conserva identidad y reactivación respeta permisos/estado.
- **Trazabilidad:** Ley 21.719 transparencia, exactitud y seguridad; ISO 25010 usabilidad/fiabilidad, ISO 27001 A.5.15; OWASP ASVS V4; CWE-451/CWE-841.
- **Riesgos / regresiones / aceptación / rollback / dependencias:** alta duplicada o acción incorrecta. Aceptar con contract tests y prueba de producto. Feature flag permite rollback UI sin revertir estado backend. Depende de 004/006/007 y se coordina con 012.

### USR-ACT-009 — Minimización de proyecciones y acceso a movimientos

- **Hallazgos / prioridad / estado:** PRIV-USR-001, PRIV-USR-002; **P1**; `BLOQUEADA` para cambios de acceso; la proyección explícita puede prepararse como PR separado.
- **Objetivo y evidencia:** evitar cargar secretos de PIN innecesariamente y justificar el acceso administrativo a actividad laboral. Las consultas Prisma de Users no usan `select` y materializan columnas de PIN antes de construir DTO; el modal de movimientos muestra observación libre y prefetch en hover/focus.
- **Archivos y símbolos exactos:** `users.repo.js` consultas y `toUserResponse`; `UserMovementsModal`; `UserManagementTable`/`MobileList`; hook/API de movimientos; handler `getAdminUserMovements`; consultas `Registros`.
- **Consumidores / operaciones / tablas:** listado/detalle/create/update Users, modal de movimientos, soporte; `Usuario`, `Registros`; ninguna respuesta debe incluir hash/salt/fingerprint/ciphertext.
- **Contrato antes → después:** hoy el proceso recibe el modelo completo y cualquier manager autorizado obtiene observaciones; después cada operación usa una proyección mínima centralizada y movimientos exige finalidad/permiso/scope documentado, carga por acción deliberada, campos/retención minimizados y audit.
- **Precondiciones:** mapa de campos por consumidor; decisión de negocio/legal sobre finalidad y roles; verificar que no haya dependencia oculta en tests/mocks; 003 para registrar acceso si se aprueba.
- **Implementación propuesta:** 1) definir `USER_PUBLIC_SELECT` y proyección interna separada para PIN; 2) migrar una query a la vez; 3) agregar assertions de campo prohibido; 4) detener prefetch hasta intención explícita; 5) introducir permiso específico o retirar endpoint según decisión; 6) minimizar observación/fechas; 7) TTL de cache y audit.
- **Búsquedas a repetir:** `rg -n "prisma.usuario|toUserResponse|Movements|movimientos|REGISTRO_OBSERVACION" capaServidor capaVista`; inventariar serializaciones y logs.
- **No modificar:** evidencia histórica, texto real ni permisos sin decisión; no reutilizar la proyección pública en código criptográfico que necesite campos secretos.
- **Capas:** backend/frontend; BD sin DDL salvo índice futuro de 011.
- **Pruebas / baseline / métrica:** mocks Prisma exigen `select`, snapshots negativos de secretos, autorización por rol/departamento y no-prefetch; baseline: modelo completo en memoria y prefetch; éxito = 0 campos PIN en query pública/response/log y acceso a movimientos conforme a política.
- **Trazabilidad:** Ley 21.719 finalidad, minimización, proporcionalidad, seguridad y acceso; ISO 27701 minimización/acceso, ISO 27001 A.5.15/A.8.11; OWASP ASVS V4/V8; CWE-200/CWE-201.
- **Riesgos / regresiones / aceptación / rollback / dependencias:** omitir campo necesario o exponer actividad. Aceptar con matriz de consumidores y pruebas negativas. Rollback de proyección por query, nunca ampliar response. Acceso depende de política/003; índice depende de 011.

### USR-ACT-010 — Calidad y unicidad canónica del RUT

- **Hallazgos / prioridad / estado:** DATA-USR-004; **P1**; `BLOQUEADA` por definición de dato y preflight.
- **Objetivo y evidencia:** validar dígito verificador y evitar identidades duplicadas por formato. El validator actual solo aplica regex y el schema no declara unicidad; la lectura física halló cero duplicados en 12 filas, lo que no garantiza el futuro.
- **Archivos y símbolos exactos:** `adminUsers.validator.js` reglas de create/update; normalizadores frontend `userValidation.js`; `schema.prisma:Usuario.rut`; repositorio create/update; formularios create/edit.
- **Consumidores / operaciones / tablas:** alta/edición/búsqueda e integraciones que usen RUT; `Usuario`; posibles reportes externos a inventariar.
- **Contrato antes → después:** hoy se acepta cualquier patrón plausible; después existe forma canónica, DV válido y una decisión explícita de unicidad/nullable, con conflicto 409 estable y presentación separada de persistencia.
- **Precondiciones:** negocio confirma si RUT es obligatorio/único y tratamiento de extranjeros/temporales; consulta de duplicados/casos inválidos en todos los ambientes; plan de corrección por dueño del dato; 001 antes de índice.
- **Implementación propuesta:** 1) especificar canonicalización y DV con casos oficiales; 2) compartir fixtures backend/frontend; 3) validar sin filtrar existencia; 4) ejecutar reporte read-only; 5) resolver excepciones manualmente; 6) agregar unique funcional/canónico mediante migración si se aprueba; 7) mapear conflicto; 8) monitorear rechazos.
- **Búsquedas a repetir:** `rg -n "rut|RUT" capaServidor capaVista`; revisar import/export/reportes y consultas case/punctuation-insensitive.
- **No modificar:** RUT reales en lote sin proceso de rectificación/autorización; no inventar RUT ni fusionar usuarios automáticamente.
- **Capas:** frontend/backend; BD/migración solo con 001 y preflight.
- **Pruebas / baseline / métrica:** tabla DV válida/inválida, formatos, concurrencia y 409; baseline = 0 duplicados observados, regex solamente; éxito = 100% fixtures canónicos, índice si corresponde y 0 merges automáticos.
- **Trazabilidad:** Ley 21.719 exactitud, calidad, minimización y derechos de rectificación; ISO 8000/25012 exactitud/consistencia, ISO 27701; OWASP ASVS V5; CWE-20/CWE-1287.
- **Riesgos / regresiones / aceptación / rollback / dependencias:** rechazar identificadores legítimos o colisionar personas. Aceptar con dueño de datos y muestra anonimizada. Rollback del validator/index según migración ensayada, preservando datos. Depende de 001 y decisiones de negocio/legal.

### USR-ACT-011 — Baseline y optimización medida de consultas

- **Hallazgos / prioridad / estado:** PERF-USR-001; **P2**; `CONDICIONADA A MEDICIÓN`.
- **Objetivo y evidencia:** escalar list/search/summary/movements sin índices especulativos. En 12 usuarios el listado usa backward primary scan con filtro, summary hace full scan y movimientos tiene 406 registros totales; búsqueda usa cuatro `contains` con wildcard inicial.
- **Archivos y símbolos exactos:** `users.repo.js:buildListWhere`, list/count/getSummary/getMovements; modelos/índices `Usuario`, `Registros`; loaders de `UserManagementPage`.
- **Consumidores / operaciones / tablas:** GET list/summary/movements y pantalla Users; `Usuario`, `Registros`.
- **Contrato antes → después:** no debe cambiar el resultado/orden/paginación; solo se aceptan cambios con p50/p95, rows examined, plan y costo de escritura mejores en cardinalidades representativas.
- **Precondiciones:** 001; dataset sintético 10/100/1k/10k y distribución realista; presupuesto/SLO; slow-query telemetry en staging; privacidad para datos de prueba.
- **Implementación propuesta:** 1) instrumentar latencia y call count; 2) generar datos sintéticos; 3) guardar `EXPLAIN ANALYZE`; 4) evaluar búsqueda prefix/full-text aprobada y groupBy; 5) evaluar índice `(id_usuario, FECHA_HORA, ID_REGISTRO)`; 6) medir costo de writes/size; 7) aceptar la mínima mejora; 8) repetir luego del deploy.
- **Búsquedas a repetir:** `rg -n "contains|getSummary|getMovements|orderBy|skip|take" capaServidor/src`; consultar índices y planes de cada ambiente.
- **No modificar:** índices/DDL de producción por intuición, semántica de búsqueda ni page contract sin versión.
- **Capas:** backend; frontend solo si se adopta nueva UX de búsqueda; BD/migración tras medición/001.
- **Pruebas / baseline / métrica:** equivalencia de resultados, load test 10→10k, p50/p95/p99, rows examined, filesort, DB CPU y write penalty; baseline numérico inicial en §27/§29; objetivo concreto se fija antes del PR con SLO aprobado.
- **Trazabilidad:** Ley 21.719 disponibilidad/seguridad; ISO 25010 eficiencia, ISO 27001 A.8.6; OWASP ASVS V14; CWE-400.
- **Riesgos / regresiones / aceptación / rollback / dependencias:** índice sin uso o búsqueda distinta. Aceptar solo si mejora supera umbral acordado sin regresión funcional. Rollback con migración inversa ensayada. Depende de 001; 009 puede reducir payload primero.

### USR-ACT-012 — Accesibilidad, foco y estados asíncronos

- **Hallazgos / prioridad / estado:** QUAL-USR-002 y parte de FUNC-USR-001; **P2**; `LISTA PARA IMPLEMENTAR` para infraestructura de modal y versionado de summary.
- **Objetivo y evidencia:** navegación por teclado robusta y feedback no engañoso. Los modales custom enfocan inicialmente y cierran con Escape, pero no encierran/restauran foco; movimientos usa `<dialog>`; summary puede aceptar respuestas fuera de orden y representa error como cero.
- **Archivos y símbolos exactos:** `UserCreateModal`, `UserEditModal`, `UserUnlinkConfirmModal`, `UserMovementsModal`, `UserManagementPage`, `UserSummaryCards`, CSS de Users.
- **Consumidores / operaciones / tablas:** usuarios administrativos y tecnologías de asistencia; carga/filtros/modales; sin BD.
- **Contrato antes → después:** foco queda dentro del diálogo, vuelve al invocador y estados loading/error/empty son distintos; solo la última solicitud de summary puede actualizar UI; Escape y confirmaciones mantienen semántica segura.
- **Precondiciones:** seleccionar patrón/dialog primitive compatible; inventario de browser support; copy de error; conservar diseño visual salvo ajustes necesarios.
- **Implementación propuesta:** 1) unificar modal accesible; 2) etiquetar título/descripción/error; 3) trap/restauración/inert; 4) probar teclado; 5) agregar AbortController o request version para summary; 6) representar error/retry; 7) anunciar cambios con live region moderada; 8) revisar mobile/reduced motion.
- **Búsquedas a repetir:** `rg -n "role=.?dialog|<dialog|aria-|Escape|focus|summary" capaVista/src/modules/users`.
- **No modificar:** permisos, API o estilos globales no relacionados; no convertir error en cero.
- **Capas:** frontend solamente.
- **Pruebas / baseline / métrica:** Testing Library/axe, keyboard manual, race de respuestas y build; baseline = tres modales sin trap/restore y summary sin versionado; éxito = cero violaciones críticas axe, flujo completo solo teclado y última-request-wins.
- **Trazabilidad:** Ley 21.719 transparencia/acceso en interfaz; ISO 25010 usabilidad/accesibilidad; WCAG 2.2 AA 2.1.1, 2.4.3, 3.3.1, 4.1.2; CWE-451 para feedback engañoso.
- **Riesgos / regresiones / aceptación / rollback / dependencias:** foco bloqueado o cierre accidental. Aceptar con matriz desktop/mobile/AT. Rollback al componente previo por modal. La UX de parciales completa depende de 008.

**Avance posterior a la auditoría — 2026-09-27:** se implementó el núcleo no bloqueado. Los tres modales custom comparten trap/restauración de foco, aislamiento `inert`/`aria-hidden` del fondo y Escape condicionado a que no haya submit; se añadieron título/descripción/error semánticos. Summary usa un tracker monotónico, descarta respuestas obsoletas, invalida al desmontar, conserva el último valor válido y ofrece error/reintento; el estado inicial fallido muestra “—”, no cero. Lint, pruebas unitarias de límites de foco/race y build pasan. Quedan pendientes QA manual en navegadores/mobile, lector de pantalla y axe antes de declarar la acción completamente aceptada.

### USR-ACT-013 — Resiliencia y eficiencia del cliente Auth0

- **Hallazgos / prioridad / estado:** PERF-USR-002, DOC-USR-001; **P1**; `BLOQUEADA` para retries/cache hasta acordar idempotencia; timeout está listo para diseño/PR.
- **Objetivo y evidencia:** limitar latencia y fallos colgantes sin repetir writes inseguros. Los `fetch` de Management API carecen de timeout/AbortSignal/retry; cada operación pide token; update de rol repite GET de roles y no demuestra paginación completa.
- **Archivos y símbolos exactos:** `auth0Management.service.js:requestManagementToken`, helper de request, `replaceUserRole`, getters/update/create; configuración Auth0; tests de servicio; documentación Auth0/RBAC.
- **Consumidores / operaciones / tablas:** altas, cambios de rol/estado, resend y sync de identidad; Auth0 Management API; sin tabla directa.
- **Contrato antes → después:** cada llamada tiene deadline, clasificación `timeout|network|4xx|5xx|rate_limit`, request correlation y retry solo para lecturas o writes idempotentes; token cache, si se aprueba, queda en memoria con margen, sin log/persistencia.
- **Precondiciones:** SLO/deadlines, semántica por endpoint, límites Auth0, test tenant; 004/005 para retries de writes; threat review de cache.
- **Implementación propuesta:** 1) wrapper con AbortController; 2) normalizar errores y `Retry-After`; 3) paginar roles; 4) eliminar enumeración duplicada; 5) retry jitter solo safe/idempotent; 6) evaluar cache M2M single-flight; 7) métricas por endpoint sin token/PII; 8) actualizar docs observadas.
- **Búsquedas a repetir:** `rg -n "fetch\(|requestManagementToken|roles|AUTH0_" capaServidor/src capaServidor/test docs`; revisar todos los callers y mocks.
- **No modificar:** scopes/tenant/secret real, política de rol o TTL arbitrariamente; nunca registrar access token.
- **Capas:** backend/documentación; frontend recibe errores estables; BD ninguna.
- **Pruebas / baseline / métrica:** fake timers, abort, 429/5xx, paginación, single-flight y call counts; baseline: sin deadline y update hasta 6 llamadas; éxito = 100% calls con deadline, retries seguros demostrados y llamadas redundantes eliminadas.
- **Trazabilidad:** Ley 21.719 seguridad/disponibilidad; ISO 27001 A.5.22/A.8.20/A.8.21, ISO 25010 fiabilidad; OWASP ASVS V10/V14; CWE-400/CWE-770.
- **Riesgos / regresiones / aceptación / rollback / dependencias:** timeout demasiado corto, retry storm o token leak. Aceptar con fault tests/rate-limit simulation. Rollback desactiva cache/retry conservando deadline. Se coordina con 004/005/006 y alimenta 014.

### USR-ACT-014 — Suite de fallos, integración y documentación ejecutable

- **Hallazgos / prioridad / estado:** QUAL-USR-001, DOC-USR-001; **P1**; `LISTA PARA IMPLEMENTAR` por etapas; pruebas externas quedan bloqueadas por sandbox/001.
- **Objetivo y evidencia:** convertir invariantes distribuidos y docs en controles de regresión. Las suites actuales aprobaron, pero faltan fault injection por cada paso, E2E del parcial, BD efímera representativa y contraste tenant; README afirma que update no escribe `app_metadata.rol`, mientras el código sí lo hace; falta el snapshot RBAC fechado 2026-09-25 referenciado.
- **Archivos y símbolos exactos:** tests de `adminUsers`, `auth0Management`, repositories, PIN, middleware y frontend Users; scripts `package.json`; README/docs Auth0/RBAC; fixtures/snapshots de permisos.
- **Consumidores / operaciones / tablas:** CI/CD, reviewers y todas las acciones 001–013; BD efímera y tenant sandbox exclusivamente.
- **Contrato antes → después:** CI prueba no solo happy path sino fallos/timeout/concurrencia y verifica que documentación/snapshot correspondan al código; suites externas se etiquetan y no corren contra producción.
- **Precondiciones:** matriz de escenarios aprobada; containers/BD compatibles; tenant Auth0 sandbox con datos sintéticos; secretos CI scoped; fuente autorizada para snapshot RBAC.
- **Implementación propuesta:** 1) contract tests de endpoints/outcomes; 2) fault injector Auth0/Prisma/PIN; 3) tests de concurrencia/idempotencia; 4) BD efímera desde migraciones; 5) E2E UI con API fake; 6) suite sandbox opt-in; 7) validación automatizada de catálogo/doc/snapshot; 8) cobertura de logs/PII; 9) publicar tiempos y flaky rate.
- **Búsquedas a repetir:** inventario `rg --files | rg '(test|spec|README|docs/auth0)'`; comparar roles/permisos definidos, documentados y observados.
- **No modificar:** tenant o BD productivos; no guardar snapshots con emails/subs/tokens; no “arreglar” una prueba debilitando invariantes.
- **Capas:** frontend/backend/CI/docs; BD efímera, no real.
- **Pruebas / baseline / métrica:** baseline de esta auditoría: backend 682 pass + 2 skipped; frontend 106 checks + 14 tests; lint/build pass. Éxito = matriz crítica completa, migración desde cero, cero flakes acordados y docs-check reproducible.
- **Trazabilidad:** Ley 21.719 responsabilidad/seguridad desde diseño; ISO 27001 A.8.25/A.8.29/A.8.32, ISO 25010; OWASP ASVS y SAMM Verification; CWE-693.
- **Riesgos / regresiones / aceptación / rollback / dependencias:** falsos positivos, suite lenta o secreto CI. Aceptar con separación unit/integration/external y redacción. Rollback desactiva solo suite externa problemática, no tests unitarios. Se amplía conforme cierran 001–013.

### USR-ACT-015 — Retiro verificado de código muerto

- **Hallazgos / prioridad / estado:** DEAD-USR-001; **P2**; `LISTA PARA IMPLEMENTAR` para `UserCreatePage`; `BLOQUEADA` para otros candidatos hasta repetir referencias.
- **Objetivo y evidencia:** reducir superficie sin borrar contratos ocultos. `UserCreatePage.jsx` y su CSS no tienen import/dynamic import y `/admin/usuarios/nuevo` redirige; hay selectores legacy de firma. `updateRoleByAuth0Id` aparece solo en definición/tests, pero se mantiene como candidato hasta la búsqueda final. `signatureUpload.js` ya no existe y el historial confirma su retiro.
- **Archivos y símbolos exactos:** `capaVista/src/modules/users/pages/UserCreatePage.jsx`, `UserCreatePage.css`; router de frontend; CSS de Users con selectores de firma; `users.repo.js:updateRoleByAuth0Id`; tests/imports asociados.
- **Consumidores / operaciones / tablas:** build/router y repositorio; ningún consumidor probado para la página; ninguna tabla debe cambiar.
- **Contrato antes → después:** rutas y comportamiento permanecen iguales; solo desaparecen módulos/selectores/símbolos con cero referencias estáticas, dinámicas, HTTP, scripts, tests y documentación relevante.
- **Precondiciones:** worktree limpio de cambios ajenos; repetir mapa de referencias en la revisión; bundle/build y rutas; confirmar con dueño si existe carga externa no visible.
- **Implementación propuesta:** 1) `rg` exacto y por variantes; 2) revisar router, `lazy/import()`, barrel exports, scripts y tests; 3) retirar página+CSS en un commit aislado; 4) build/test/sourcemap/bundle; 5) revisar selectores legacy contra DOM; 6) para repo method, instrumentar/buscar HTTP/dynamic antes de decidir; 7) documentar exclusiones.
- **Búsquedas a repetir:** `rg -n "UserCreatePage|UserCreatePage.css|updateRoleByAuth0Id|signatureUpload|firma|signature" . --glob '!node_modules/**' --glob '!USERS_AUDITORIA_PLAN_ACCION.md'`; revisar imports dinámicos y Git history.
- **No modificar:** `UserCreateForm`, modal activo, endpoints, migración de firmas ya aplicada, historial Git ni símbolo dudoso sin cero referencias.
- **Capas:** frontend inicialmente; backend solo si se confirma el método; BD/migración ninguna.
- **Pruebas / baseline / métrica:** frontend tests/lint/build, navegación de redirect y bundle diff; backend tests si se retira método; baseline: página sin refs y build actual pasa; éxito = cero refs posteriores, conducta idéntica y menos bytes/código.
- **Trazabilidad:** Ley 21.719 minimización de superficie y seguridad por diseño; ISO 27001 A.8.8/A.8.9, ISO 25010 mantenibilidad; OWASP SAMM; CWE-1059 como categoría de código no mantenido.
- **Riesgos / regresiones / aceptación / rollback / dependencias:** import oculto o documentación rota. Aceptar con búsqueda y build en CI. Rollback es restaurar el commit aislado. Sin dependencia para página; método backend después de 014 o evidencia equivalente.

## 49. Orden de implementación recomendado

| Fase | Acciones | Puerta de salida |
|---|---|---|
| 0 — Contención | 002 (logs/config), decisiones de no-write, runbooks | ningún PIN/PII en logs; producción falla cerrada |
| 1 — Fundaciones | 001, luego 003 y base de 014 | migraciones reproducibles, audit durable, CI de BD |
| 2 — Consistencia crítica | 004, 005, 006 | fault matrix completa y sandbox Auth0 convergente |
| 3 — Semántica y privacidad | 007, 009, 010 | lifecycle/retención/finalidad aprobados y aplicados |
| 4 — Experiencia | 008, 012 | parciales/reactivación accesibles y contract-tested |
| 5 — Resiliencia y escala | 013, luego 011 si las métricas lo justifican | deadlines y SLO; DDL solo con mejora medida |
| 6 — Limpieza | 015 y cierre de 014 | cero referencias, build/tests/docs consistentes |

Regla de release: no agrupar reconciliación de migraciones, cambio de autorización, lifecycle y limpieza en un único despliegue. Cada fase debe tener observabilidad, rollback y dueño de decisión. P0 no significa “desplegar rápido”: significa cerrar primero sus precondiciones de seguridad.

## 50. Plan futuro de pruebas

| Suite | Escenarios mínimos | Ambiente | Gate |
|---|---|---|---|
| Unit backend | validadores, allowlists, proyecciones, error mapping, state transitions | local/CI | cada PR |
| Contract HTTP | success/pending/recoverable, 400/401/403/404/409/429/5xx, redacción | CI | cada PR |
| Fault injection | fallo/timeout antes y después de cada operación Auth0/DB/PIN/audit | CI con fakes | acciones 003–006 |
| Concurrencia | doble submit, idempotency key, CAS rol/estado, retry ambiguo | CI | acciones 004–007 |
| BD efímera | migrate from zero, migrate clone, constraints, cleanup, plans | MySQL compatible | acción 001 y cada migración |
| Auth0 sandbox | scopes, role pagination/delta, blocked, claims/tokens previos | tenant exclusivo | antes de 004–006/013 |
| Frontend integration | request race, modales, errors, parciales/retry/reactivación | jsdom/browser | acciones 008/012 |
| E2E | alta→pending→recovery, rol, desvincular→deny, reactivar | stack sintético | release crítica |
| Seguridad/privacidad | mass assignment, IDOR/scope, PIN logs, campos prohibidos, audit access | CI + revisión | release crítica |
| Performance | 10/100/1k/10k, p50/p95/p99, DB plans, Auth0 call counts | staging sintética | acción 011/013 |
| Accesibilidad | axe, teclado, foco, screen reader smoke, mobile | browser | acción 012 |
| Recovery | restore backup, reconciler resume/compensate, rollback de release | staging clonada | antes de producción |

Fixtures obligatorios: cada rol oficial, rol desconocido, cero/múltiples roles, cada estado, null/unknown, usuario propio, usuario ajeno al departamento, PII con caracteres límite, PIN accepted/pending/absent/expired y respuestas Auth0 paginadas/429/timeout. Ninguna fixture debe copiar datos reales.

## 51. Estrategia de rollback y recovery

1. **Antes de cualquier write futuro:** backup cifrado, restore ensayado, inventario de migraciones/checksums, tenant sandbox y `operationId` habilitado.
2. **Código:** despliegues pequeños y compatibles hacia atrás; feature flags para UI/retry/cache; rollback no debe reinterpretar estados nuevos como activos.
3. **Migraciones:** expand/contract; nunca editar una aplicada; reversa ensayada. Si revertir perdería datos, preferir forward-fix o restore con decisión explícita.
4. **Auth0:** snapshot mínimo de estado previo y verificación posterior; compensar solo con identidad inequívoca. Nunca borrar por email ni ejecutar reconciliación masiva automática.
5. **BD local:** compare-and-set y ledger/outbox; los parciales permanecen visibles. No “limpiar” filas para ocultar divergencia.
6. **PIN:** ante duda, invalidar y reprovisionar por canal seguro; nunca restaurar el código en claro ni rotar `PIN_SECRET` sin un plan de secretos versionados.
7. **Sesiones:** el rollback de código no reactiva cuentas; mantener deny-by-default para estado desconocido/pending y revocar según SLA.
8. **Auditoría:** eventos ya escritos son append-only bajo su política; una reversa genera un nuevo evento correlacionado.
9. **Criterio de abortar release:** error rate o divergencias sobre umbral, audit no durable, fallo de deny, pérdida de deadline o discrepancia de migración. Congelar nuevas mutaciones, no lectura, y ejecutar runbook.
10. **Recovery manual:** cola de casos con `operationId`, estado Auth0/local/PIN, último paso confirmado, acción propuesta, aprobador y outcome. Dos personas para operaciones destructivas o de privilegio.

## 52. Elementos bloqueados y decisiones requeridas

| Bloqueo | Decisión/evidencia requerida | Responsable sugerido | Acciones |
|---|---|---|---|
| Migraciones físicas divergentes | recuperar SQL/checksums, clon, backup y restore | DBA/Plataforma | 001 y todas con DDL |
| Tenant Auth0 no contrastado | sandbox, scopes, paginación, claims, rate limits | IAM/Seguridad | 004–006, 013 |
| Semántica de estados | fuente de verdad, transición, reactivación y SLA de sesión | Producto + Seguridad | 006–008 |
| Compensación de huérfanos | adoptar, bloquear o eliminar; identificación inequívoca | IAM + Producto | 004/005 |
| Canal PIN | proveedor, secretos, template, SLA y privacidad | Seguridad + Legal + Operaciones | 002 |
| Retención | PIN/challenges/audit/movimientos y legal hold | Legal/Privacidad | 003/007/009 |
| Movimientos de usuario | finalidad, base, roles y granularidad | Privacidad + RR.HH./Producto | 009 |
| RUT | obligatorio/único, extranjeros y proceso de rectificación | Dueño de datos + Legal | 010 |
| SLO/cardinalidad | dataset sintético y umbral que justifica índices | Plataforma/DBA | 011 |
| Snapshot RBAC | fuente autorizada y archivo observado faltante | IAM | 014 |

La falta de estas decisiones no justifica inferir políticas ni ejecutar escrituras. Sí permite preparar tests, interfaces, métricas y documentación que no alteren producción.

## 53. Handoff para una nueva sesión Codex

Objetivo recomendado de la siguiente sesión: implementar **una sola acción desbloqueada**, comenzando por el endurecimiento sin proveedor de USR-ACT-002 o por USR-ACT-012; no iniciar USR-ACT-001 sin las precondiciones de §52.

Contexto mínimo a releer:

1. `USERS_AUDITORIA_PLAN_ACCION.md` completo, en especial §§2, 10, 15–18, 29–31, 35, 47–52.
2. Estado Git y diff antes de actuar; baseline fue branch `opt-users`, commit `d7645ab202dfc7ba2c7ca0c33827d804df224c08`, worktree limpio antes de crear este informe.
3. Prompt de auditoría original en `/Users/overmine/Downloads/PROMPT_USERS_AUDITORIA_PLAN_MAESTRO_v1_LEY_21719.md` como especificación histórica, no como autoridad superior.
4. Para cualquier DDL: repetir consultas read-only de migraciones/schema y obtener backup/restore/staging. No confiar en que la BD permanezca igual a la observada.
5. Para Auth0/email: usar fakes o sandbox expresamente autorizado. No tocar tenant, usuarios ni envíos reales.
6. Antes de borrar código: repetir el mapa de referencias exacto indicado en USR-ACT-015.
7. Ejecutar las suites de §31 y añadir la prueba que cierre el hallazgo elegido; documentar resultados y efectos externos.

Prompt de arranque sugerido para la siguiente sesión:

> Lee por completo `USERS_AUDITORIA_PLAN_ACCION.md`. Implementa únicamente `USR-ACT-XXX`, respetando sus precondiciones, archivos prohibidos, pruebas, aceptación y rollback. Primero verifica Git y evidencia vigente; detente si el estado `BLOQUEADA` no ha cambiado con evidencia explícita. No uses datos, Auth0, correo ni PIN reales.

## 54. Estado final de la auditoría

- **Artefacto creado:** `USERS_AUDITORIA_PLAN_ACCION.md`.
- **Implementación de producción:** ninguna.
- **Escrituras en BD:** ninguna; solo `SELECT`, `EXPLAIN` y metadatos read-only. **Cleanup:** no requerido.
- **Auth0 real:** no consultado ni modificado. El fallo de reemplazo de rol se reprodujo solo con mocks controlados.
- **Correo/PIN real:** no enviado, leído, rotado ni modificado.
- **Filesystem persistente:** únicamente este informe; el build frontend se dirigió a un directorio temporal y fue eliminado.
- **Verificación:** backend 682 tests aprobados y 2 integraciones MySQL omitidas; frontend 106 verificaciones de scripts y 14 tests aprobados; lint y build aprobados; `npm audit --omit=dev` sin vulnerabilidades reportadas en ambos paquetes; `prisma validate` aprobado; `prisma migrate status` bloqueado por `Schema engine error`.
- **Riesgos prioritarios abiertos:** drift de migraciones/BD, operaciones distribuidas no reconciliables, ventana de rol/estado/sesión, audit durable ausente y delivery PIN inseguro/no disponible.
- **Bloqueos formales:** enumerados en §52. Ninguna acción bloqueada debe ejecutarse basándose solo en este documento.

**Seguimiento posterior al cierre:** los puntos anteriores describen el instante final de la auditoría. Luego, por instrucción expresa del usuario, comenzó la ejecución del plan: los addenda de USR-ACT-002 y USR-ACT-012 registran los cambios locales realizados. Ese trabajo posterior tampoco tocó BD, Auth0, correo ni PIN reales.

La auditoría termina aquí. El siguiente paso seguro es obtener las decisiones/evidencias de §52 y abrir una implementación acotada conforme al orden de §49.
