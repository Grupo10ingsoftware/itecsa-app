# Frontend ITECSA

SPA React 19 con Vite 8. Auth0 administra el login; la API verifica identidad y permisos. El catálogo compartido está en [authorization.js](../shared/authorization.js).

## Desarrollo

Después de completar la [configuración local](../docs/desarrollo/README.md), desde esta carpeta:

```bash
npm ci
npm run dev
```

La SPA local usa `http://localhost:5173`. Los comandos `npm test`, `npm run lint`, `npm run build` y `npm run preview` están disponibles; consultar [pruebas y requisitos de navegador](../docs/desarrollo/PRUEBAS.md).

## Referencias

- [Índice técnico](../docs/README.md) y [arquitectura](../docs/arquitectura/ARQUITECTURA.md).
- [Convenciones UI](../docs/desarrollo/CONVENCIONES_UI_FRONTEND.md).
- [API y permisos](../docs/desarrollo/API.md) y [Auth0](../docs/auth0/README.md).
- [Orders](../docs/modulos/ORDERS.md), [Payments](../docs/modulos/PAYMENTS.md) y [pendientes](../docs/PENDIENTES.md).

El borrador de Orders vive en memoria React y su confirmación llama `POST /api/orders`. Payments usa el workspace y preview JSON de la API; el flujo de PDF y firmas fue retirado. Las variables `VITE_*` son públicas: nunca incluir secretos de la API, de la base o de Auth0 Management.
