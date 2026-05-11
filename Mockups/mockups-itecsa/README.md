# Mockups estáticos ITECSA

Carpeta de mockups HTML/CSS/JS estáticos para validar visualmente las pantallas M01 a M14 del sistema interno de gestión de producción de ITECSA.

## Cómo abrir

1. Abre `index.html` en un navegador web.
2. El archivo redirige a `pages/login.html`, que corresponde a M01.
3. Usa los accesos de demostración del login. La contraseña válida simulada es `Demo123!`.
4. Dentro del sistema puedes cambiar el rol desde el selector superior para validar menús, permisos y bloqueos.

## Estructura

```text
mockups-itecsa/
├── index.html
├── README.md
├── css/styles.css
├── js/data.js
├── js/auth.js
├── js/app.js
├── pages/login.html
├── pages/m02-layout.html
├── pages/m03-registro-pedido.html
├── pages/m14-seguimiento-pedidos.html
├── pages/m04-kanban.html
├── pages/m05-detalle-pedido.html
├── pages/m06-confirmacion-pago.html
├── pages/m07-asociacion-op.html
├── pages/m08-produccion-lanyards.html
├── pages/m09-produccion-tarjetas.html
├── pages/m10-capacidad.html
├── pages/m11-anuncios.html
├── pages/m12-reportes.html
└── pages/m13-gestion-usuarios.html
```

## Notas de implementación

- No requiere backend ni servidor local.
- Los datos están embebidos en `js/data.js`.
- La navegación, permisos y sesión son simulados con `localStorage`.
- El movimiento del Kanban se simula con botones.
- La exportación de reportes genera un CSV de ejemplo desde el navegador.
- Los roles válidos usados son: Administrador, Ventas, Cobranzas, Operario y Gerencia.
