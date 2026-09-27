# H09 — Integridad de creación de pedidos

Corrección del 27-09-2026. Alcance exclusivo: origen confiable del alta de pedidos. No se modificaron permisos, Soporte, autenticación, PIN, pagos, cifrado, logging global ni dependencias. No se conectó ninguna BD ni servicio externo.

## Flujo anterior y clasificación

La búsqueda devolvía una nota normalizada. `useOrderCreateFlow` reenviaba esa información al confirmar y `createOrderFromSalesNote` utilizaba cliente, origen, observaciones e ítems del body. También existía una rama legacy de `createOrder` que aceptaba cliente/productos sin referencia de nota.

| Campo | Origen real | Lo enviaba frontend | Confianza al crear |
| --- | --- | --- | --- |
| numeroNota | Referencia elegida por usuario | Sí | Validar y consultar; no acredita el contenido |
| cliente.rut | Fuente | Sí | Sólo fuente reconsultada |
| cliente.nombre, usado como nombre y razón social | Fuente | Sí | Sólo fuente reconsultada |
| cliente.direccion/comuna/ciudad/tipoClienteOrigen | Fuente | Sí, dentro de cliente | No se usan para crear |
| origen.usuarioManager | Fuente: vendedor externo | Sí | Sólo fuente reconsultada |
| origen.tipoNotaVenta | Fuente | Sí | No se usa para crear |
| observaciones | Fuente | Sí | Sólo fuente reconsultada; observacion_origen |
| items.codigo/producto/cantidad/familia/subfamilia/tipoProducto | Fuente: datos de fabricación disponibles | Sí | Sólo fuente reconsultada |
| itemsSinSeguimientoProductivo.codigo/producto/cantidad/subfamilia | Fuente | Sí | Sólo fuente reconsultada |
| Motivo del ítem sin seguimiento | Fuente | Sí | No se persiste en el alta actual |
| fechaEntregaTentativaOrigen | Fuente | Sí | No fija la fecha de producción en el alta actual |
| observacionInterna | Usuario, RF45 | Sí | Texto validado, separado de la observación de origen |
| priority | Usuario, RF46 | Sí | Sólo urgent/contract; conserva también array compatible |
| id_usuario / actor que registra | Sesión backend | No | Se resuelve por sub; no por body |
| Estados, fecha de creación, IDs, subproceso inicial | Backend/catálogos | No | No se aceptan sustituciones del body |

El vendedor externo no reemplaza al usuario autenticado que registra. No hay campos independientes adicionales de fabricación en el contrato normalizado actual; se conserva el tratamiento existente de descripciones, familias y tipos, sin inventar columnas nuevas.

## Nuevo contrato y ejecución

```json
{
  "numeroNota": "NV-2026-123",
  "observacionInterna": "Pedido para evento",
  "priority": "urgent"
}
```

`priority` puede ser `null`, `urgent`, `contract` o el array compatible de esas opciones. La UI conserva su selección vigente. El alias previo `observacion_interna` sigue aceptado para la observación interna.

`parseCreateOrderInput` construye una lista explícita de los tres campos admitidos. Los demás campos se ignoran por compatibilidad, incluyendo las copias antiguas de cliente, productos, fecha, vendedor y observaciones de origen. El frontend ya no los envía. Entradas de tipo incorrecto, referencia vacía/inválida o prioridad desconocida devuelven 400.

`createOrder` siempre delega al flujo de nota: no queda la alternativa sin referencia. `createOrderFromSalesNote` consulta `salesNoteSourceService.getByNumber`, verifica existencia y coincidencia de referencia, valida cliente e ítems, normaliza cantidades y construye los datos que entregará a los repositorios. La consulta usa la misma abstracción que RF34; no llama al flujo de reevaluación ni modifica sus reglas.

La transacción existente conserva el chequeo de duplicados, el mensaje y estado 409, etiquetas, detalles y avisos. No se añade una garantía nueva de unicidad concurrente ni se cambia el esquema. El actor se obtiene exclusivamente de la sesión en este flujo. Los estados iniciales y la programación posterior de fecha permanecen iguales.

## Cambios entre búsqueda y confirmación

Se usa la versión disponible en la fuente al confirmar. Si cambió desde el preview, prevalecen los valores reconsultados; el preview no se utiliza como respaldo. Si desaparece o falla la fuente, no se crea el pedido. No se añadió una pantalla de discrepancias.

La fuente no expone versión por nota. El adaptador JSON existente invalida su caché por mtime/tamaño; se conserva ese mecanismo y su límite (no detecta una sustitución con ambos atributos idénticos). La lógica de creación no conoce rutas de archivos ni detalles de una futura BD.

Se conserva `findOrCreateClient`: si el RUT ya existe en la persistencia propia, se reutiliza ese cliente, sin actualizar su nombre compartido. Por tanto, esta corrección evita incorporar identidades manipuladas desde el request, pero no constituye sincronización de nombres de clientes existentes. La fecha de producción sigue inicialmente nula. Código/descripción/familia de ítems productivos mantienen el tratamiento previo en el resumen devuelto; no se agregó persistencia nueva.

## Evidencia de pruebas

`salesOrderIntegrity.test.js` cubre creación válida, nota inexistente, RUT, razón social, cantidad, producto/código/familia, vendedor, observación de fuente, ítems sin seguimiento, atributos inesperados y estados/IDs inyectados. Comprueba observación interna, Urgente, Contrato y ambas prioridades; duplicados; reconsulta al confirmar; cambio entre preview y alta; rechazo de vía legacy; validación de input/fuente; falla de fuente sin fallback; actor del body sin sesión. Incluye controlador real con servicio real y adaptador JSON real con archivo sintético modificado tras el preview.

El test de creación anterior conserva sus verificaciones de observación, fecha, consultas de tipos/subprocesos y avisos, inyectando ahora la fuente canónica. Frontend tiene tres verificaciones del payload mínimo y prioridades.

Resultados:

- Backend completo: 678 pruebas declaradas, 677 pasan, 0 fallos, 0 canceladas, 0 omitidas y 1 TODO preexistente de H05 (consumo concurrente de recuperación de PIN).
- Frontend: 3 verificaciones H09 + 5 perfil + 84 autorización + 5 pagos; verificaciones de errores API y 2 entradas node:test exitosas.
- Compilación Vite exitosa; `git diff --check` sin errores.
- La primera ejecución backend dentro del sandbox no pudo completar pruebas HTTP; la suite completa pasó con autorización para puertos locales.

Estas pruebas usan datos sintéticos y dobles de persistencia; no certifican transacciones contra una BD real ni un despliegue. Bajo el contrato probado, modificar manualmente atributos de origen en el request ya no sustituye los datos de la fuente. Soporte conserva sus rutas, permisos y comportamiento.
