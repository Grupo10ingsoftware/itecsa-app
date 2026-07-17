# Mockups HTML de muestras

Abrir `index.html` con Live Server. No requiere Node.js, Auth0, variables de entorno ni backend.

## Navegación

La aplicación utiliza rutas hash para funcionar correctamente desde cualquier servidor estático:

- `#/desarrollos`: listado y filtros.
- `#/nuevo`: formulario de creación.
- `#/detalle/DM-001`: desarrollo finalizado y reutilizado en tres pedidos.
- `#/detalle/DM-002`: desarrollo pendiente.
- `#/detalle/DM-003`: segundo cliente con desarrollo finalizado.
- `#/pedido`: asociación del desarrollo a un pedido.

Todos los datos, cargas, validaciones y cambios son simulados en memoria. Al recargar la página o usar **Restablecer demo**, se recuperan los datos originales.
