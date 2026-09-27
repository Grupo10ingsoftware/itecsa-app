# Asignación manual de permisos ITECSA

Generado desde `shared/authorization.js` con `node scripts/rbac.mjs --generate`. No editar las listas a mano en este archivo.

**API:** ITECSA API · **Identifier:** `https://api.itecsa.local`.

En Auth0: User Management → Roles → elegir rol → Permissions → Add Permissions → ITECSA API. Asignar exactamente la lista del rol. Los nombres técnicos usan `Produccion` sin tilde.

No seleccionar Auth0 Management API. No conceder permisos directos adicionales a usuarios. Cada usuario debe tener exactamente un rol ITECSA y coincidir con su registro interno. Soporte se asigna únicamente por el equipo técnico.

Esta matriz describe la configuración esperada del código. La evidencia del tenant se registra por separado con fecha y commit en [la auditoría histórica](../archivo/auditorias/AUDITORIA-2026-09-25.md); consultar [la guía vigente](README.md). Generar este archivo no verifica Auth0.

El catálogo contiene 25 permisos funcionales. Soporte recibe los 25; nunca scopes de Management API. Renovar las sesiones después de cambiar asignaciones.

Kanban usa read:orders y Pagos usa read:payments. view:kanban-module y view:payments-module son permisos retirados. Guardar carga operativa acepta manage:production-load o manage:production-capacity.

En Applications → APIs → ITECSA API, verificar RS256, Enable RBAC y Add Permissions in the Access Token. Verificar la Action vinculada a Post Login y el claim https://itecsa.local/roles.

## Administrador Produccion

Rol funcional. Mínimo privilegio según requisitos vigentes.

- `read:own-profile`
- `manage:own-pin`
- `read:orders`
- `read:production-capacity`
- `read:own-messages`
- `update:own-messages`
- `manage:users`
- `move:orders`
- `update:production-subprocesses`
- `start:production`
- `rollback:production-subprocesses`
- `manage:production-capacity`
- `manage:production-load`
- `manage:order-tags`
- `review:orders`
- `cancel:orders`
- `read:production-calendar`
- `update:order-delivery-date`
- `view:metrics`

## Administrador Ventas

Rol funcional. Mínimo privilegio según requisitos vigentes.

- `read:own-profile`
- `manage:own-pin`
- `read:orders`
- `read:production-capacity`
- `read:own-messages`
- `update:own-messages`
- `manage:users`
- `read:sales-notes`
- `create:orders`
- `reevaluate:orders`
- `read:production-calendar`

## Administrador Cobranzas

Rol funcional. Mínimo privilegio según requisitos vigentes.

- `read:own-profile`
- `manage:own-pin`
- `read:orders`
- `read:production-capacity`
- `read:own-messages`
- `update:own-messages`
- `manage:users`
- `read:payments`
- `update:payment-status`
- `revise:payment-status`

## Operario Produccion

Rol funcional. Mínimo privilegio según requisitos vigentes.

- `read:own-profile`
- `manage:own-pin`
- `read:orders`
- `read:production-capacity`
- `read:own-messages`
- `update:own-messages`
- `move:orders`
- `update:production-subprocesses`

## Operario Ventas

Rol funcional. Mínimo privilegio según requisitos vigentes.

- `read:own-profile`
- `manage:own-pin`
- `read:orders`
- `read:production-capacity`
- `read:own-messages`
- `update:own-messages`
- `read:sales-notes`
- `create:orders`
- `reevaluate:orders`
- `read:production-calendar`

## Operario Cobranzas

Rol funcional. Mínimo privilegio según requisitos vigentes.

- `read:own-profile`
- `manage:own-pin`
- `read:orders`
- `read:production-capacity`
- `read:own-messages`
- `update:own-messages`
- `read:payments`
- `update:payment-status`

## Gerencia

Rol funcional. Mínimo privilegio según requisitos vigentes.

- `read:own-profile`
- `manage:own-pin`
- `read:orders`
- `read:production-capacity`
- `read:own-messages`
- `update:own-messages`
- `view:metrics`

## Soporte

Rol técnico de desarrollo/testing. Todos los **25 permisos funcionales**; conserva PIN y reglas de estado. No se ofrece en formularios.

- `read:own-profile`
- `manage:own-pin`
- `read:orders`
- `read:production-capacity`
- `read:own-messages`
- `update:own-messages`
- `manage:users`
- `read:sales-notes`
- `create:orders`
- `reevaluate:orders`
- `read:payments`
- `update:payment-status`
- `revise:payment-status`
- `move:orders`
- `start:production`
- `update:production-subprocesses`
- `rollback:production-subprocesses`
- `manage:production-capacity`
- `manage:production-load`
- `manage:order-tags`
- `review:orders`
- `cancel:orders`
- `read:production-calendar`
- `update:order-delivery-date`
- `view:metrics`

## Trazabilidad del catálogo

| Permission | Justificación / condición |
| --- | --- |
| `read:own-profile` | RF04, RF10 |
| `manage:own-pin` | RF06–07 |
| `read:orders` | RF17–18, RF20, RF23, RF32, RF64–68 |
| `read:production-capacity` | RF25 |
| `read:own-messages` | RF56–63 |
| `update:own-messages` | RF56–63 |
| `manage:users` | RF10–16, RNF02; departamento obligatorio |
| `read:sales-notes` | RF42–45 |
| `create:orders` | RF42–48 |
| `reevaluate:orders` | RF34 |
| `read:payments` | RF35, RF37–39 |
| `update:payment-status` | RF36; PIN |
| `revise:payment-status` | RF40; AC, motivo y PIN; aprobaciones pendientes fuera de alcance |
| `move:orders` | RF19; PIN; solo transiciones manuales |
| `start:production` | RF19 y decisión del usuario: AP |
| `update:production-subprocesses` | RF21–22; PIN, producción y pago confirmado |
| `rollback:production-subprocesses` | RF30; PIN y motivo |
| `manage:production-capacity` | RF24 |
| `manage:production-load` | Gestionar la carga operativa diaria de producción |
| `manage:order-tags` | RF26–27 |
| `review:orders` | RF28 |
| `cancel:orders` | RF29; PIN y motivo |
| `read:production-calendar` | RF49, RF52; AV/OV solo lectura |
| `update:order-delivery-date` | RF51 y decisión del usuario: PIN obligatorio |
| `view:metrics` | Consultar el resumen e indicadores de métricas |
