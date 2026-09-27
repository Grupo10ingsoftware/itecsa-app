# Auditoría Auth0 ITECSA — 25 de septiembre de 2026

## Referencias

- Tenant: `itecsa-sistema.us.auth0.com`
- API: `ITECSA API` · audience `https://api.itecsa.local`
- Código auditado: `dev` remoto, commit `0e6fb0a`

## Estado observado

- La API tiene 25 permisos, incluidos `view:metrics` y `manage:production-load`.
- RBAC está activo, los permisos se incluyen en el access token, la firma es RS256 y el dialecto es `access_token_authz`.
- `ITECSA Add Claims` está desplegada y conectada al trigger Post Login.
- `view:metrics` está asignado a Administrador Produccion, Gerencia y Soporte.
- `manage:production-load` está asignado a Administrador Produccion y Soporte; se retiró de Gerencia.
- Los otros roles coinciden con la matriz de `dev`.

## Pendientes

- Probar una sesión nueva de la aplicación y verificar audience, claim de rol y permisos efectivos.
- Revisar permisos directos de usuarios; esta auditoría cubrió asociaciones de roles.
