# Módulo `payments` / Cobranzas

Este módulo implementa la vista de Cobranzas para revisar Notas de Venta, visualizar documentos PDF asociados, gestionar visualmente el estado de pago y consultar el detalle de documentos firmados. En el estado actual de la rama, la pantalla trabaja con datos locales/mock y no contiene carpeta `api/`. El backend si expone `PATCH /api/orders/:orderId/payment-status` protegido por `update:payment-status`, pero esta pantalla todavía no consume ese endpoint.

La pantalla principal permite:

- Listar pedidos pendientes de revisión por Cobranzas.
- Filtrar por estado de pago: todos, pendientes, rechazados y confirmados.
- Buscar por número de Nota de Venta, cliente, RUT, estado o fecha.
- Abrir la vista previa del PDF original asociado a una Nota de Venta.
- Gestionar el estado de pago mediante confirmación sostenida.
- Simular firma digital demo cuando el pago se confirma.
- Ver el documento firmado cuando el pago está confirmado.
- Descargar e imprimir el PDF original o firmado.

## Relación con la arquitectura del proyecto

El módulo sigue la organización modular definida para el frontend inicial:

```txt
src/modules/payments/
├── components/
├── mocks/
├── pages/
└── utils/
```

La lógica persistente de negocio todavía no vive aquí. La pantalla prepara la interacción visual y usa datos simulados. En una integración posterior, los mocks se reemplazarán por respuestas del backend y el cambio de estado deberá delegarse al endpoint backend ya protegido por permiso.

No debe agregarse `api/` dentro del módulo hasta conectar formalmente esta vista con los contratos backend vigentes.

## Dependencia adicional

El visor PDF usa `pdfjs-dist` para renderizar el PDF real dentro del modal sin depender del visor nativo del navegador.

Instalación requerida en la raíz del frontend, donde está `package.json`:

```bash
npm install pdfjs-dist
```

No instalar dentro de `src/modules/payments/`, porque este módulo no es un proyecto npm independiente.

## Estructura completa del módulo

```txt
payments/
├── README.md
├── components/
│   ├── DocumentPreviewModalLayout.jsx
│   ├── DocumentPreviewModalLayout.module.css
│   ├── PaymentActionConfirmModal.jsx
│   ├── PaymentActionConfirmModal.module.css
│   ├── PaymentFilters.jsx
│   ├── PaymentFilters.module.css
│   ├── PaymentOrderMobileList.jsx
│   ├── PaymentOrderMobileList.module.css
│   ├── PaymentOrdersTable.jsx
│   ├── PaymentOrdersTable.module.css
│   ├── PaymentRowActions.jsx
│   ├── PaymentRowActions.module.css
│   ├── PaymentStatusBadge.jsx
│   ├── PaymentStatusBadge.module.css
│   ├── PaymentStatusSelect.jsx
│   ├── PaymentSummaryCards.jsx
│   ├── PaymentSummaryCards.module.css
│   ├── PdfPreviewFrame.jsx
│   ├── PdfPreviewFrame.module.css
│   ├── SalesNoteButton.jsx
│   ├── SalesNoteButton.module.css
│   ├── SalesNotePreviewModal.jsx
│   └── SalesNotePreviewModal.module.css
├── mocks/
│   ├── documents/
│   │   ├── notv-42852.pdf
│   │   └── notv-42852-firmada-demo.pdf
│   ├── paymentDocuments.mock.js
│   ├── paymentOrders.mock.js
│   └── paymentTransitions.mock.js
├── pages/
│   ├── PaymentConfirmationPage.jsx
│   └── PaymentConfirmationPage.module.css
└── utils/
    └── paymentDocuments.js
```

## Convenciones usadas

- Los componentes React viven en `components/`.
- Cada componente con estilos propios tiene su `.module.css` en la misma carpeta.
- La página principal vive en `pages/` y solo conserva estilos macro de pantalla.
- Los datos de prueba viven en `mocks/`.
- Los PDFs de prueba viven en `mocks/documents/`, porque son documentos mock y no assets finales de UI.
- Las funciones auxiliares reutilizables viven en `utils/`.
- La lógica simulada de transición de estado vive en `mocks/`, no en backend todavía.

## Flujo funcional principal

1. `PaymentConfirmationPage.jsx` carga pedidos simulados desde `createMockPaymentOrders()`.
2. La página calcula contadores, aplica filtros y búsqueda.
3. La tabla desktop se renderiza con `PaymentOrdersTable.jsx`.
4. La vista móvil se renderiza con `PaymentOrderMobileList.jsx`.
5. El botón `Nota de venta` abre `SalesNotePreviewModal.jsx` con el PDF original.
6. El botón `Gestionar` abre un menú de acciones desde `PaymentRowActions.jsx`.
7. Al elegir `Pendiente`, `Confirmar` o `Rechazar`, se abre `PaymentActionConfirmModal.jsx`.
8. El modal de acción exige mantener presionado el botón de confirmación.
9. Al confirmar, `applyMockPaymentStatusTransition()` simula el cambio de estado.
10. Si el estado queda `Confirmado`, se asigna un PDF firmado demo.
11. El botón `Ver detalle` abre `SalesNotePreviewModal.jsx` en modo documento firmado.
12. Los botones `Imprimir PDF` y `Descargar PDF` usan funciones documentales desde `paymentDocuments.js`.

## Archivos de `pages/`

### `pages/PaymentConfirmationPage.jsx`

Es la página principal del módulo. Actúa como orquestador de la vista de Cobranzas.

Responsabilidades:

- Inicializar los pedidos mock mediante `createMockPaymentOrders()`.
- Mantener el estado de filtros, búsqueda, dropdown activo, modal de vista previa, modal de gestión y feedback visual.
- Calcular contadores por estado.
- Filtrar pedidos por estado y texto de búsqueda.
- Abrir/cerrar la vista previa de Nota de Venta.
- Abrir/cerrar el modal de acción sostenida.
- Ejecutar la transición mock de estado.
- Lanzar descarga o impresión de PDF.
- Mostrar mensajes de error controlados cuando una operación documental falla.

Estados principales:

- `orders`: listado mock de pedidos.
- `activeFilter`: filtro rápido seleccionado.
- `editingStatus`: controla qué menú `Gestionar` está abierto.
- `pendingTransition`: acción de cambio de estado pendiente de confirmación.
- `previewState`: estado del modal de vista previa/documento firmado.
- `searchTerm`: texto de búsqueda.
- `isHoldingConfirmation`: indica si el usuario mantiene presionado el botón de confirmación.
- `feedback`: mensaje visual temporal de error o estado.

Funciones relevantes:

- `handleUpdatePaymentStatus(orderId, newStatus)`: aplica transición mock.
- `handleDownloadNV(order, variant, options)`: descarga PDF original o firmado.
- `handlePrintNV(filePath)`: inicia impresión del PDF.
- `openPaymentEditor(orderId)`: abre/cierra dropdown de acciones.
- `openPaymentActionConfirmation(order, targetStatus)`: prepara modal de confirmación.
- `startHoldConfirmation()` / `cancelHoldConfirmation()`: gestionan confirmación sostenida.

Notas de integración futura:

- `orders` dejará de venir de `createMockPaymentOrders()` y deberá cargarse desde backend.
- `handleUpdatePaymentStatus()` deberá llamar a un endpoint de actualización de estado.
- La transición automática a producción deberá venir del backend.
- El frontend no debe decidir reglas críticas de pago en integración real.

### `pages/PaymentConfirmationPage.module.css`

Contiene estilos macro de la página.

Responsabilidades:

- Variables CSS propias del módulo, como colores y sombras.
- Layout general del contenedor.
- Hero/header de la página de Cobranzas.
- Alertas de feedback visual.
- Ajustes responsive macro.

No debe contener estilos internos de componentes, modales, tabla, filtros ni visor PDF. Esos estilos ya están colocalizados en `components/`.

## Archivos de `components/`

### `components/DocumentPreviewModalLayout.jsx`

Layout base reusable para modales documentales.

Responsabilidades:

- Renderizar backdrop del modal.
- Renderizar encabezado negro superior con kicker, título, descripción y botón de cierre.
- Renderizar cuerpo con dos columnas: panel izquierdo y preview a la derecha.
- Renderizar footer de acciones.
- Aplicar variantes visuales del modal.

Props principales:

- `kicker`: texto pequeño superior, por ejemplo `NOTA DE VENTA` o `DETALLE DE PAGO`.
- `title`: título principal del modal.
- `description`: bajada del modal.
- `leftPanel`: contenido del panel izquierdo.
- `children`: contenido principal, normalmente el visor PDF.
- `footer`: botones del modal.
- `variant`: variante visual para ajustar tamaño/comportamiento.
- `onClose`: callback de cierre.

Este componente no conoce reglas de pago. Solo define estructura visual.

### `components/DocumentPreviewModalLayout.module.css`

Estilos del layout base de modales.

Incluye:

- Backdrop.
- Contenedor modal.
- Header negro.
- Botón de cierre.
- Grid de contenido.
- Footer.
- Variantes responsive.

Debe mantenerse genérico para que sirva tanto en vista previa, detalle firmado y gestión.

### `components/SalesNotePreviewModal.jsx`

Modal para revisar una Nota de Venta.

Tiene dos contextos:

- Vista previa del documento original antes de firma.
- Ver detalle del documento firmado cuando el pago está confirmado.

Responsabilidades:

- Determinar si se muestra documento original o firmado.
- Obtener el asset PDF mediante `getPdfAsset()`.
- Construir el panel izquierdo con detalle de Nota de Venta.
- Mostrar información general o datos de firma según contexto.
- Renderizar `PdfPreviewFrame`.
- Exponer botones `Cerrar`, `Imprimir PDF` y `Descargar PDF`.
- Manejar zoom y fullscreen del panel PDF.

Props principales:

- `order`: pedido actual.
- `context`: `PREVIEW_CONTEXT.ORIGINAL` o `PREVIEW_CONTEXT.SIGNED_DETAIL`.
- `onClose`: cierre del modal.
- `onDownload`: descarga del PDF.
- `onPrint`: impresión del PDF.

Notas:

- No decide transición de pago.
- No firma documentos reales.
- Solo muestra el documento correspondiente al estado/contexto.

### `components/SalesNotePreviewModal.module.css`

Estilos específicos del modal de vista previa/detalle firmado.

Incluye:

- Panel izquierdo con secciones negras.
- Íconos naranjos.
- Detalle de Nota de Venta.
- Información general.
- Datos de firma.
- Badges de estado.
- Footer del modal.
- Ajustes responsive.

### `components/PaymentActionConfirmModal.jsx`

Modal de confirmación sostenida para cambios de estado de pago.

Responsabilidades:

- Mostrar la acción solicitada: confirmar, rechazar o volver a pendiente.
- Mostrar estado actual y estado objetivo.
- Mostrar el documento PDF que será afectado.
- Si la acción es confirmar, mostrar preview del documento firmado demo.
- Exigir mantener presionado el botón para aplicar el cambio.
- Evitar selección de texto/callout táctil en iPhone durante la acción sostenida.
- Cancelar o ejecutar la acción final.

Props principales:

- `order`: pedido actual.
- `targetStatus`: estado objetivo.
- `isHolding`: indica si el usuario mantiene presionado.
- `onCancel`: cancela la acción.
- `onHoldStart`: inicia temporizador de confirmación.
- `onHoldCancel`: cancela temporizador.
- `onClose`: cierra modal.

Notas:

- La confirmación sostenida es una validación visual/preventiva.
- En backend real, el servidor debe validar rol, permisos y transición.

### `components/PaymentActionConfirmModal.module.css`

Estilos del modal de confirmación de acción.

Incluye:

- Banner de advertencia.
- Cards de estado actual/objetivo.
- Panel izquierdo de gestión.
- Preview PDF a la derecha.
- Botón hold con estado visual.
- Protección visual y táctil para móvil.
- Responsive del modal.

### `components/PdfPreviewFrame.jsx`

Componente encargado de renderizar PDFs reales dentro del sistema.

Responsabilidades:

- Cargar PDF mediante `pdfjs-dist`.
- Usar el build legacy de PDF.js para mejorar compatibilidad móvil/WebKit.
- Configurar worker de PDF.js.
- Aplicar polyfill defensivo para `Map.prototype.getOrInsert` y `Map.prototype.getOrInsertComputed`.
- Medir el ancho real del visor con `ResizeObserver`.
- Calcular escala `fit-width` según contenedor.
- Renderizar páginas en canvas.
- Controlar zoom por botones `-`, `100%`, `+`.
- Permitir fullscreen del panel PDF.
- Mostrar fallback controlado si no se puede previsualizar.
- Permitir abrir PDF en pestaña nueva desde fallback.

Props principales:

- `filePath`: URL/import del PDF.
- `fileName`: nombre visible del archivo.
- `zoom`: porcentaje de zoom.
- `isExpanded`: estado fullscreen del panel.
- `onZoomOut`: callback para reducir zoom.
- `onZoomIn`: callback para aumentar zoom.
- `onToggleExpanded`: callback para fullscreen/restaurar.
- `title`: título del panel.
- `description`: bajada del panel.
- `emptyTitle` / `emptyDescription`: textos cuando no hay PDF.

Notas técnicas:

- Ya no usa `iframe` para previsualizar, por lo que no aparece la barra nativa del visor PDF del navegador.
- El PDF mostrado es el archivo real, no una imagen PNG.
- El zoom manual con rueda/cursor no está implementado; solo zoom por botones.

### `components/PdfPreviewFrame.module.css`

Estilos del visor PDF.

Incluye:

- Header negro del visor.
- Toolbar de zoom.
- Contenedor scrolleable.
- Canvas de páginas PDF.
- Estado vacío.
- Estado de error/fallback.
- Modo fullscreen del panel.
- Ajustes mobile para evitar overflow.

### `components/PaymentFilters.jsx`

Componente de filtros y búsqueda.

Responsabilidades:

- Renderizar buscador textual.
- Renderizar botones rápidos de estado.
- Mostrar contadores por filtro.
- Notificar cambios de filtro y búsqueda a la página.

Props principales:

- `filters`: arreglo de filtros.
- `activeFilter`: filtro seleccionado.
- `searchTerm`: texto actual.
- `getFilterCount`: función que retorna contador por filtro.
- `onFilterChange`: callback al seleccionar filtro.
- `onSearchChange`: callback al escribir búsqueda.

### `components/PaymentFilters.module.css`

Estilos de filtros.

Incluye:

- Card contenedora.
- Input de búsqueda.
- Botones de filtro.
- Grilla responsive uniforme.
- Contadores circulares.
- Estado activo.

En móvil los filtros se ordenan en columnas iguales para evitar tamaños irregulares.

### `components/PaymentSummaryCards.jsx`

Resumen superior de indicadores.

Responsabilidades:

- Construir tarjetas de resumen desde contadores.
- Mostrar total de notas, pendientes, rechazadas y confirmadas.
- Servir como lectura rápida del estado de Cobranzas.

Props:

- `counters`: objeto con `all`, `pending`, `rejected`, `confirmed`.

### `components/PaymentSummaryCards.module.css`

Estilos de tarjetas resumen.

Incluye:

- Grid de cards.
- Iconos.
- Jerarquía de títulos y valores.
- Colores/acento visual.
- Responsive.

### `components/PaymentOrdersTable.jsx`

Tabla desktop de pedidos.

Responsabilidades:

- Renderizar pedidos filtrados en formato tabla.
- Mostrar pedido, fecha, cliente, RUT, estado, Nota de Venta y acciones.
- Usar `PaymentStatusBadge` para representar estado.
- Usar `SalesNoteButton` para abrir PDF.
- Usar `PaymentRowActions` para gestionar estado y ver detalle.

Props principales:

- `orders`: pedidos filtrados.
- `editingStatus`: estado de dropdown abierto.
- `onOpenSalesNote`: abre vista previa.
- `onToggleEditor`: abre/cierra gestión.
- `onCloseEditor`: cierra gestión.
- `onSelectStatus`: selecciona nuevo estado.
- `onViewSignedDetail`: abre documento firmado.

### `components/PaymentOrdersTable.module.css`

Estilos de tabla desktop.

Incluye:

- Card de tabla.
- Encabezados.
- Celdas.
- Empty state.
- Responsive desktop.

### `components/PaymentOrderMobileList.jsx`

Lista de cards para móvil.

Responsabilidades:

- Renderizar pedidos en formato card cuando la pantalla es pequeña.
- Mostrar datos clave del pedido.
- Mostrar estado con `PaymentStatusBadge`.
- Mostrar botón de Nota de Venta.
- Mostrar acciones con `PaymentRowActions`.
- Aplicar acento visual por estado.

Props iguales a `PaymentOrdersTable`, adaptadas a mobile.

### `components/PaymentOrderMobileList.module.css`

Estilos de cards móviles.

Incluye:

- Card de pedido.
- Acento por estado.
- Layout interno.
- Botones en mobile.
- Empty state mobile.

### `components/PaymentRowActions.jsx`

Componente de acciones por pedido.

Responsabilidades:

- Renderizar botón `Gestionar`.
- Mostrar dropdown con acciones disponibles.
- Ocultar la acción correspondiente al estado actual.
- Mostrar `Ver detalle` cuando el pago está confirmado.
- Cerrar dropdown con click fuera.
- Cerrar dropdown con Escape.
- Permitir navegación básica con teclado dentro del menú.
- Evitar el bug de cierre prematuro cuando tabla desktop y cards mobile coexisten en DOM.

Detalles técnicos:

- Usa `data-payment-action-root={order.id}` para identificar cualquier menú de acciones del mismo pedido.
- El click-outside revisa si el evento ocurre dentro de ese root antes de cerrar.
- El menú usa `role="menu"` y opciones con `role="menuitem"`.

Props principales:

- `order`: pedido.
- `editingStatus`: mapa de dropdowns abiertos.
- `isMobile`: adapta botones en móvil.
- `onToggleEditor`: abre/cierra menú.
- `onCloseEditor`: cierra menú.
- `onSelectStatus`: selecciona acción.
- `onViewSignedDetail`: abre documento firmado.

### `components/PaymentRowActions.module.css`

Estilos del botón de acciones y dropdown.

Incluye:

- Grupo de acciones.
- Botón `Gestionar`.
- Botón `Ver detalle`.
- Dropdown.
- Opciones por estado.
- Variante móvil.

### `components/PaymentStatusBadge.jsx`

Componente oficial para mostrar estado de pago.

Responsabilidades:

- Recibir `status` o `label`.
- Normalizar estado por defecto a `Pendiente`.
- Aplicar clase visual según estado.
- Mostrar texto del estado.

Estados esperados:

- `Pendiente`.
- `Rechazado`.
- `Confirmado`.

Este componente reemplazó el uso previo de `PaymentStatusPill` para evitar duplicidad conceptual.

### `components/PaymentStatusBadge.module.css`

Estilos del badge de estado.

Incluye:

- Estilo base.
- Variante pendiente.
- Variante rechazado.
- Variante confirmado.

### `components/PaymentStatusSelect.jsx`

Componente preparado para seleccionar estado de pago.

Estado actual:

- Existe en el módulo, pero el flujo principal ya no lo usa.
- El cambio de estado actual se realiza mediante `PaymentRowActions` + `PaymentActionConfirmModal`.
- Se conserva porque el stack original contemplaba un selector visual de estado para `payments`.

Responsabilidades si se reutiliza:

- Renderizar selector tradicional o menú de estados.
- Validar que el valor seleccionado exista en `PAYMENT_STATUS_OPTIONS`.
- Notificar cambios con `onChange`.

Recomendación:

- Si no se usa antes del cierre del incremento, documentarlo como preparado para integración futura o eliminarlo para evitar código muerto.

### `components/SalesNoteButton.jsx`

Botón para abrir la Nota de Venta.

Responsabilidades:

- Renderizar botón `Nota de venta`.
- Deshabilitar si el pedido no tiene PDF asociado.
- Adaptarse a mobile con `w-100` cuando corresponde.
- Ejecutar `onOpen(order)`.

### `components/SalesNoteButton.module.css`

Estilos del botón de Nota de Venta.

Incluye:

- Borde.
- Icono.
- Hover.
- Estado disabled.
- Variante mobile.

## Archivos de `mocks/`

### `mocks/documents/notv-42852.pdf`

PDF mock original de Nota de Venta.

Uso:

- Vista previa antes de firma.
- Flujo de rechazo.
- Flujo de volver a pendiente.
- Descarga/impresión del documento original.

En integración real será reemplazado por un archivo/URL proveniente del backend.

### `mocks/documents/notv-42852-firmada-demo.pdf`

PDF mock firmado demo.

Uso:

- Preview de confirmación de pago.
- Ver detalle cuando el pago está confirmado.
- Descarga/impresión del documento firmado demo.

No representa firma digital criptográfica real. Es una simulación visual para frontend inicial.

### `mocks/paymentDocuments.mock.js`

Define documentos mock disponibles para el módulo.

Exporta:

- `MOCK_SALES_NOTE_DOCUMENT`.
- `MOCK_SIGNED_SALES_NOTE_DOCUMENT`.
- `MOCK_SIGNATURE_NOTE`.

Responsabilidades:

- Centralizar imports a PDFs mock.
- Centralizar nombres de archivo mock.
- Evitar que `utils/` dependa de documentos de prueba.

### `mocks/paymentOrders.mock.js`

Crea pedidos simulados para la pantalla.

Exporta:

- `createMockPaymentOrders()`.

Responsabilidades:

- Entregar pedidos iniciales.
- Simular diferentes estados de pago.
- Simular pedidos con y sin PDF asociado.
- Asociar PDF original y PDF firmado cuando corresponde.

Datos típicos por pedido:

- `id`.
- `nvNumber`.
- `createdAt`.
- `companyName`.
- `rut`.
- `paymentStatus`.
- `actionStatus`.
- `orderStatus`.
- `nvFileName`.
- `nvFilePath`.
- `signedNvFileName`.
- `signedNvFilePath`.
- `signature`.

En integración real, esta función se reemplazará por datos del backend.

### `mocks/paymentTransitions.mock.js`

Simula la transición de estado de pago.

Exporta:

- `isValidPaymentStatus(status)`.
- `applyMockPaymentStatusTransition(order, newStatus)`.

Responsabilidades:

- Validar estados permitidos en frontend mock.
- Simular confirmación, rechazo o vuelta a pendiente.
- Simular asignación de firma demo al confirmar.
- Simular asignación de documento firmado demo.
- Quitar datos de firma al volver a pendiente o rechazado.

Importante:

- Esta lógica es temporal.
- En backend real, la transición debe validarse en servidor.
- El cambio automático a producción debe venir del backend.

## Archivos de `utils/`

### `utils/paymentDocuments.js`

Utilidades documentales del módulo.

Exporta:

- `PDF_VARIANT`.
- `PREVIEW_CONTEXT`.
- `formatPaymentDateTime(value)`.
- `getPaymentActionMeta(targetStatus)`.
- `getPdfAsset(order, variant, options)`.
- `printPdf(filePath)`.

Responsabilidades:

- Definir variantes de documento: original o firmado.
- Definir contextos de preview.
- Formatear fechas para UI.
- Entregar metadata visual de acciones de pago.
- Resolver qué PDF debe usarse según pedido y variante.
- Preparar impresión de PDF.
- Manejar impresión móvil de forma distinta a desktop.

Detalles de impresión:

- En desktop usa `iframe` oculto para lanzar impresión directa del PDF.
- En móvil abre el PDF real en un contexto imprimible, porque algunos navegadores móviles pueden imprimir la página actual en vez del iframe oculto.

No debe contener:

- Imports directos a PDFs mock.
- Datos de pedidos mock.
- Firmas demo hardcodeadas.

## Estados y reglas simuladas

Estados de pago usados:

- `Pendiente`.
- `Rechazado`.
- `Confirmado`.

Reglas actuales de frontend mock:

- Si el usuario confirma pago, se asigna firma demo y PDF firmado demo.
- Si el usuario rechaza pago, se remueven datos de firma.
- Si el usuario vuelve a pendiente, se remueven datos de firma.
- Si un pedido confirmado existe, aparece botón `Ver detalle`.

Reglas futuras de backend:

- Validar rol de Cobranzas.
- Validar si el usuario puede cambiar estado.
- Persistir cambio de estado.
- Crear o asociar documento firmado real.
- Registrar auditoría de la acción.
- Ejecutar transición automática hacia producción cuando corresponda.
- Bloquear avance si el pago no está confirmado.

## Responsive

El módulo considera tres zonas principales:

- Desktop: tabla (`PaymentOrdersTable`).
- Mobile: cards (`PaymentOrderMobileList`).
- Modales documentales: layout de dos columnas en desktop y layout apilado en pantallas pequeñas.

Puntos implementados:

- Filtros rápidos con grilla uniforme.
- Cards móviles con acento por estado.
- Modales con scroll controlado.
- PDF.js ajusta render a ancho disponible usando medición del contenedor.
- Toolbar del PDF adaptada para móvil.
- Botón hold protegido contra selección de texto en iPhone.

## Accesibilidad y UX

Implementado:

- Modales con `role="dialog"` y `aria-modal="true"` desde el layout base.
- Dropdown con `aria-haspopup="menu"`, `aria-expanded` y `role="menu"`.
- Opciones con `role="menuitem"`.
- Cierre del menú con Escape.
- Cierre del menú con click fuera.
- Navegación básica del menú con ArrowUp, ArrowDown, Home y End.
- Botones reales, no elementos no interactivos.
- Estados con texto, no solo color.

Pendiente posible:

- Trap de foco completo dentro de modales.
- Retorno de foco al botón que abrió el modal.
- Pruebas manuales con lector de pantalla.

## Estado frente al backend

El flujo actual de pagos en frontend no consume backend. `PaymentConfirmationPage.jsx` inicializa datos con `createMockPaymentOrders()` y aplica transiciones locales con `applyMockPaymentStatusTransition()`.

El backend actual expone este contrato para actualizar estado de pago sobre pedidos mock/en memoria:

```txt
PATCH /api/orders/:orderId/payment-status
```

Cuerpo aceptado:

```json
{
  "paymentStatusId": 1
}
```

IDs vigentes en backend: `0` Pendiente, `1` Confirmado y `2` Rechazado. El endpoint requiere access token Auth0 con permiso `update:payment-status`.

La pantalla todavia no esta conectada a ese endpoint. Tampoco existen endpoints backend documentados en este repo para detalle de pedido, descarga de Nota de Venta o documento firmado de pagos.

Cuando se integre esta vista con backend, el cambio debe ser:

1. Reemplazar `createMockPaymentOrders()` por carga desde un contrato backend implementado.
2. Reemplazar `applyMockPaymentStatusTransition()` por una llamada al endpoint backend correspondiente.
3. Reemplazar PDFs mock por URLs/archivos entregados por backend.
4. Crear `api/` solo cuando el contrato esté implementado.
5. Mantener validaciones críticas en backend.
6. Mantener frontend como capa visual y de feedback.

## Requisitos relacionados

Requisitos base del módulo:

- `UR 3.1`: Cobranzas clasifica estado de pago.
- `UR 3.3`: Cambio automático a listo para producción.
- `UR 3.7`: Impedir avance sin pago confirmado.

Requisitos sugeridos por evolución del módulo:

- `UR 3.8`: Visualizar Nota de Venta asociada al pago.
- `UR 3.9`: Descargar o imprimir Nota de Venta desde Cobranzas.
- `UR 3.10`: Confirmar cambio de estado mediante acción sostenida.
- `UR 3.11`: Visualizar documento firmado tras confirmación de pago.
- `UR 11.2`: Compatibilidad del visor documental en navegadores modernos.
- `UR 12.2`: Usabilidad responsive del módulo Cobranzas.

Estos requisitos sugeridos deben formalizarse en la matriz de trazabilidad si se defenderán como parte del incremento.

## Checklist de QA manual recomendado

### Desktop

- Abrir página de Cobranzas.
- Validar contadores superiores.
- Filtrar por todos, pendientes, rechazados y confirmados.
- Buscar por NV, cliente, RUT o estado.
- Abrir Nota de Venta original.
- Probar zoom `-`, `100%`, `+`.
- Probar fullscreen del panel PDF.
- Descargar PDF original.
- Imprimir PDF original.
- Abrir Gestionar.
- Elegir Confirmar.
- Mantener botón de confirmación.
- Validar cambio a Confirmado.
- Abrir Ver detalle.
- Descargar PDF firmado.
- Imprimir PDF firmado.
- Elegir Rechazar en un pedido no rechazado.
- Validar que el dropdown se cierre correctamente al hacer click fuera.
- Validar que el dropdown no se cierre antes de seleccionar una acción.

### Mobile

- Validar que se rendericen cards y no tabla.
- Validar filtros en grilla uniforme.
- Abrir Nota de Venta.
- Confirmar que el PDF se ve dentro del modal.
- Probar zoom por botones.
- Probar fullscreen del panel.
- Probar descarga.
- Probar impresión móvil / apertura del PDF.
- Abrir Gestionar.
- Mantener botón de confirmación sin que se seleccione texto.
- Validar que los estados sigan siendo legibles.

### Casos vacíos/error

- Pedido sin PDF asociado.
- Descarga fallida.
- Impresión no disponible.
- PDF no previsualizable.
- Búsqueda sin resultados.

## Decisiones técnicas importantes

- Se usa PDF.js para preview, no `iframe`, para evitar barra nativa del navegador.
- Se usa `iframe` oculto solo para impresión desktop.
- Se abre PDF en móvil para impresión porque algunos navegadores móviles imprimen el contexto actual en vez del documento.
- Los PDFs mock están en `mocks/documents` porque representan datos de prueba, no assets finales.
- `PaymentStatusBadge` es el componente oficial de estado visual.
- `PaymentStatusSelect` queda como componente preparado, pero no forma parte del flujo actual.

## Estado actual del módulo

Estado: funcional como vista de Cobranzas con datos locales/mock. El backend RF32 de estado de pago existe y esta protegido, pero queda pendiente conectarlo a esta pantalla.

Pendiente antes de integración real:

- Formalizar trazabilidad final.
- Decidir destino final de `PaymentStatusSelect.jsx`.
- Actualizar `requirementsMap.js` si existe en el proyecto.
- Validar manualmente QA desktop/mobile.
- Documentar contrato backend cuando corresponda.

