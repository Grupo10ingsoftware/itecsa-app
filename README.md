# ITECSA

Aplicacion web para apoyar procesos internos de ITECSA. Esta rama incorpora autenticacion inicial con Auth0 en una SPA React y validacion de access tokens en una API Express.

## Estructura

- `capaVista/`: SPA React + Vite, con Universal Login/Logout de Auth0.
- `capaServidor/`: API Express, con validacion JWT y endpoint de verificacion de sesion.
- `docs/`: documentacion tecnica transversal.
- `Mockups/`: material de referencia visual del proyecto.

Documentacion especifica:

- [Frontend](capaVista/README.md)
- [Backend](capaServidor/README.md)
- [Arquitectura](docs/ARQUITECTURA.md)

## Requisitos

- Node.js y npm.
- Una SPA y una API configuradas en Auth0 para desarrollo local.
- Variables de entorno locales basadas en las plantillas `env.example`.

## Ejecucion Local

Frontend:

```bash
cd capaVista
npm install
npm run dev
```

Backend:

```bash
cd capaServidor
npm install
npm start
```

El frontend usa `http://localhost:5173` y el backend usa `http://localhost:3000` con las plantillas actuales.

## Configuracion

- Copiar `capaVista/env.example` a un archivo `.env` local de la SPA y ajustar los identificadores publicos de Auth0 cuando corresponda.
- Copiar `capaServidor/env.example` a un archivo `.env` local del backend.
- No registrar archivos `.env`, client secrets, access tokens ni contrasenas en Git.
- Las variables de Auth0 Management del backend quedan reservadas para desarrollo posterior; la SPA nunca debe recibir esas credenciales.

## Estado Actual De Auth0

- La SPA inicia y cierra sesion mediante Auth0 Universal Login/Logout.
- La API expone `GET /api/auth/verify`, protegido por bearer access token Auth0.
- La validacion backend comprueba issuer y audience configurados.
- La API proyecta un unico rol RBAC emitido en el claim `https://itecsa.local/roles` a `rolUsuario`.
- El frontend aun no consume `/api/auth/verify`; sus guards actuales son controles visuales.

## Restricciones Vigentes

- No implementar Prisma ni MySQL en esta integracion inicial.
- No persistir RUT, firma electronica ni contrasenas.
- No exponer credenciales Auth0 Management en frontend.
- No incluir secretos reales ni tokens en documentacion o plantillas.
