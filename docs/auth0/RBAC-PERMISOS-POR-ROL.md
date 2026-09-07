# Asignación manual de permisos ITECSA

Generado desde `shared/authorization.js` con `node scripts/rbac.mjs --generate`. No editar las listas a mano en este archivo.

**API:** ITECSA API · **Identifier:** `https://api.itecsa.local`.

En Auth0: User Management → Roles → elegir rol → Permissions → Add Permissions → ITECSA API. Asignar exactamente la lista del rol. Los nombres técnicos usan `Produccion` sin tilde.

No seleccionar Auth0 Management API. No conceder permisos directos adicionales a usuarios. Cada usuario debe tener exactamente un rol ITECSA y coincidir con su registro interno. Soporte se asigna únicamente por el equipo técnico.

Estado: el usuario confirmó la configuración manual del dashboard. El MCP no ofrece herramientas de roles, por lo que las asociaciones no se han releído de forma independiente. Falta validar sesiones nuevas.

Los ocho scopes antiguos ya se eliminaron de ITECSA API por solicitud del usuario. El catálogo contiene exactamente estos 23 permisos. Asignar las listas a los roles y renovar las sesiones. Soporte debe recibir los 23; nunca scopes de Management API.

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
- `manage:order-tags`
- `review:orders`
- `cancel:orders`
- `read:production-calendar`
- `update:order-delivery-date`

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

## Soporte

Rol técnico de desarrollo/testing. Todos los **23 permisos funcionales**; conserva PIN y reglas de estado. No se ofrece en formularios.

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
- `manage:order-tags`
- `review:orders`
- `cancel:orders`
- `read:production-calendar`
- `update:order-delivery-date`

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
| `manage:order-tags` | RF26–27 |
| `review:orders` | RF28 |
| `cancel:orders` | RF29; PIN y motivo |
| `read:production-calendar` | RF49, RF52; AV/OV solo lectura |
| `update:order-delivery-date` | RF51 y decisión del usuario: PIN obligatorio |
