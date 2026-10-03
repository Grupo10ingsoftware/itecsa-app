# Funcionalidades demo y separación por ambiente

## Configuración

El backend exige `NODE_ENV=development`, `test` o `production`. Las rutas y datos exclusivamente demo requieren además `ENABLE_DEMO_ROUTES=true`; el valor se valida estrictamente y su ausencia equivale a deshabilitado. El servidor rechaza `ENABLE_DEMO_ROUTES=true` en producción y no inicia con ambiente ausente/desconocido o flag inválido.

| Elemento | Clasificación | Uso de Soporte | Control |
| --- | --- | --- | --- |
| `/api/demo-orders/**` y `demoOrders.store.js` | API demo legacy retirada | No disponible | La ruta y su store fueron eliminados; responde 404 en todos los ambientes |
| `/api/auth/pin/debug-reset` | Herramienta de depuración, no operación normal del perfil | Disponible solo en development con opt-in explícito, rol/capacidad Soporte y controles del servicio PIN | La ruta no se registra sin opt-in; producción rechaza el opt-in |
| `data/demo/sales-notes-fixture.json` y `SalesNoteSourceService` | Datos de prueba que sustituyen temporalmente una fuente de Notas de Venta | Sirven para probar la interfaz/flujo funcional con notas sintéticas | La fixture solo se lee con opt-in demo explícito; de otro modo la fuente responde 503. El endpoint funcional no se elimina |
| `POST /api/production-calendar/operational-load` | Endpoint legacy retirado | No disponible | Calendario usa `GET /api/orders/calendar-summary` y `GET /api/orders/:id/calendar-detail` |
| `/api/orders/**`, pagos, capacidad, carga, calendario, mensajes, historial, métricas y usuarios | Rutas funcionales del producto, con autorización por capacidad | Sí; Soporte conserva su matriz y restricciones de PIN/estado | Se mantienen montadas en producción; no dependen del flag demo |
| `productionHistory` en la SPA | Prototipo retirado junto con sus alias de rutas | El historial vigente usa `orderHistory` y datos de la API | Rutas vigentes: `/historial-pedidos` y `/historial-pedidos/:orderId` |
| `orders/mocks/orderCreate.mock.js` | Borrador vacío de presentación, no store ni endpoint de pedidos | Apoyo de la vista funcional | Se conserva; no expone registros ficticios ni mutaciones demo |
| Tests titulados con “mock” | Dobles de prueba del backend | No son runtime | No se publican ni se montan como rutas |

Los nombres `mock` en tests de pedidos/Kanban o en constantes de la interfaz no bastan para clasificar un flujo como demo: se conserva cuando corresponde a una operación de producto y no expone datos ficticios persistentes.

## Soporte y requisitos funcionales

`Soporte` es un rol técnico separado de los roles funcionales definidos por RF01–RF75. Su acceso transversal a funcionalidades **reales** del sistema es intencional y se mantiene. No se cambia `ROLE_PERMISSIONS`, no se reduce su lista de capacidades, no se modifica el alcance por rol de las rutas reales y se mantienen sus validaciones normales de PIN, estado y pertenencia.

`/api/demo-orders` ya no existe. La herramienta de depuración de PIN requiere `NODE_ENV=development` y opt-in. Su control visual requiere `VITE_ENABLE_DEMO_ROUTES=true`; la fuente fixture de Notas de Venta exige `ENABLE_DEMO_ROUTES=true`. Deshabilitar estas herramientas no restringe la API real.

## Comprobación

La validación histórica del aislamiento de demo comprobó los siguientes comportamientos. La suite se retiró el 03-10-2026; deben confirmarse en el entorno autorizado antes de entregar:

- `NODE_ENV` explícito y valores admitidos del flag;
- ausencia de las rutas demo/debug en producción y sin opt-in;
- permanencia del 404 de `/api/demo-orders` incluso con opt-in;
- acceso de Soporte a una operación real y conservación de todas sus capacidades;
- rechazo de acceso a la fixture de Notas de Venta sin modo demo.
