# Módulo `orders` / Registro de Pedido

Este módulo implementa la vista de **Registro de Pedido** para el rol de Ventas. Su objetivo es permitir la creación visual de un pedido a partir de una Nota de Venta, adjuntando el PDF obligatorio de la Nota de Venta y, opcionalmente, archivos de diseño en formato PDF.

## Nota de integración BD

En `fix/integrar-disenio-users-bd`, este módulo conserva el flujo visual de diseño como experiencia frontend. Los datos locales y `sessionStorage` son apoyo visual temporal; no reemplazan el backend modular de órdenes, los estados reales ni las reglas de pago/Kanban existentes en `capaServidor/src/modules/orders`.

Actualmente corresponde a la fase de **Frontend visual con datos locales**, por lo que no realiza creación real contra backend ni contiene una carpeta `api/` propia dentro del módulo. La creación definitiva del pedido debe conectarse a backend cuando exista contrato de API para registrar órdenes con archivos.

La pantalla principal permite:

- Ingresar el código de Nota de Venta.
- Buscar/exportar información simulada de la Nota de Venta desde mocks.
- Adjuntar el PDF obligatorio de Nota de Venta.
- Visualizar el PDF cargado antes de continuar.
- Adjuntar archivos de diseño opcionales, restringidos a PDF.
- Revisar la información mínima del pedido antes del registro.
- Agregar observaciones de registro con límite de caracteres.
- Confirmar el registro mediante un modal final.
- Mostrar pantalla de éxito centrada al completar el flujo.
- Ir al Kanban o registrar otro pedido después de finalizar.

## Relación con la arquitectura del proyecto

El módulo sigue la lógica modular definida para el frontend inicial:

```txt
src/modules/orders/
├── components/
├── mocks/
├── pages/
└── utils/
```

La lógica del flujo no vive directamente en la página, sino en el hook global:

```txt
src/hooks/useOrderCreateFlow.js
```

Esta decisión evita que `OrderCreatePage.jsx` se convierta en una vista monolítica. La página principal actúa como orquestadora y delega responsabilidades en componentes pequeños, siguiendo el mismo criterio usado en `payments`.

En esta etapa, el frontend prepara la interacción visual y usa datos simulados. En integración posterior, los mocks deberán ser reemplazados por respuestas del backend y la creación real del pedido deberá validarse desde servicios backend.

No debe agregarse `api/` dentro de `src/modules/orders/` en esta fase. Cuando existan contratos backend aprobados, la integración debe hacerse desde la capa correspondiente, no desde componentes visuales.

## Dependencia adicional

El visor PDF usa `pdfjs-dist` para renderizar el PDF real dentro del modal documental sin depender del visor nativo del navegador.

Instalación requerida en la raíz del frontend, donde está `package.json`:

```bash
npm install pdfjs-dist
```

No instalar dentro de `src/modules/orders/`, porque este módulo no es un proyecto npm independiente.

## Estructura completa del módulo

```txt
orders/
├── README.md
├── AUDITORIA_ORDERS.md
├── components/
│   ├── DesignFilesStep.jsx
│   ├── DesignFilesStep.module.css
│   ├── DesignFilesUploader.jsx
│   ├── DesignFilesUploader.module.css
│   ├── DocumentPreviewModalLayout.jsx
│   ├── DocumentPreviewModalLayout.module.css
│   ├── OrderCreateConfirmModal.jsx
│   ├── OrderCreateConfirmModal.module.css
│   ├── OrderCreateHeader.jsx
│   ├── OrderCreateHeader.module.css
│   ├── OrderCreateStepper.jsx
│   ├── OrderCreateStepper.module.css
│   ├── OrderCreateSuccess.jsx
│   ├── OrderCreateSuccess.module.css
│   ├── OrderNotice.jsx
│   ├── OrderNotice.module.css
│   ├── OrderRequirementSummary.jsx
│   ├── OrderRequirementSummary.module.css
│   ├── OrderReviewStep.jsx
│   ├── OrderReviewStep.module.css
│   ├── PdfPreviewFrame.jsx
│   ├── PdfPreviewFrame.module.css
│   ├── SalesNotePdfUploader.jsx
│   ├── SalesNotePdfUploader.module.css
│   ├── SalesNotePreviewModal.jsx
│   ├── SalesNotePreviewModal.module.css
│   ├── SalesNoteStep.jsx
│   ├── SalesNoteStep.module.css
│   ├── UploadedFileList.jsx
│   └── UploadedFileList.module.css
├── mocks/
│   └── orderCreate.mock.js
├── pages/
│   ├── OrderCreatePage.jsx
│   └── OrderCreatePage.module.css
└── utils/
    ├── orderCreateFormatters.js
    └── orderCreateValidation.js
```

Hook global relacionado:

```txt
src/hooks/
└── useOrderCreateFlow.js
```

## Convenciones usadas

- Los componentes React viven en `components/`.
- Cada componente con estilos propios tiene su `.module.css` en la misma carpeta.
- La página principal vive en `pages/` y conserva solo estilos macro de pantalla.
- Los datos de prueba viven en `mocks/`.
- Las funciones auxiliares reutilizables viven en `utils/`.
- La lógica de flujo visual vive en `src/hooks/useOrderCreateFlow.js`.
- El módulo no contiene `styles/Orders.module.css` porque se eliminó el CSS monolítico.
- El módulo no contiene `api/` porque sigue en fase de frontend inicial con mocks.
- Los archivos de detalle de pedido se eliminaron de este flujo. El detalle deberá consultarse desde Kanban cuando corresponda.

## Flujo funcional principal

1. `OrderCreatePage.jsx` inicializa el flujo mediante `useOrderCreateFlow()`.
2. La vista renderiza el header, el stepper, el contenido del paso activo y el resumen lateral.
3. En el paso 1, `SalesNoteStep.jsx` permite ingresar el código de Nota de Venta y buscar información simulada.
4. `SalesNotePdfUploader.jsx` permite adjuntar únicamente el PDF obligatorio de Nota de Venta.
5. El resumen lateral `OrderRequirementSummary.jsx` muestra los tres requisitos visuales: código, PDF de Nota de Venta y archivos de diseño.
6. En el paso 2, `DesignFilesStep.jsx` permite adjuntar archivos de diseño opcionales en PDF.
7. `DesignFilesUploader.jsx` maneja selección, drag/drop y reemplazo visual de archivos de diseño.
8. `UploadedFileList.jsx` muestra los archivos cargados con acciones de ver, reemplazar y eliminar.
9. En el paso 3, `OrderReviewStep.jsx` muestra la revisión final y permite agregar observaciones.
10. El botón `Registrar pedido` abre `OrderCreateConfirmModal.jsx`.
11. Al confirmar, `buildRegisteredOrder()` genera un pedido mock y se guarda una copia visual en `sessionStorage`.
12. `OrderCreateSuccess.jsx` muestra la confirmación final centrada con dos acciones: `Ir a Kanban` y `Registrar otro pedido`.

## Archivos de `pages/`

### `pages/OrderCreatePage.jsx`

Es la página principal del módulo. Actúa como orquestador del flujo de Registro de Pedido.

Responsabilidades:

- Inicializar `useOrderCreateFlow()`.
- Renderizar `OrderCreateHeader`.
- Renderizar `OrderCreateStepper`.
- Renderizar el paso activo del wizard.
- Renderizar `OrderRequirementSummary` como resumen lateral persistente.
- Mostrar el modal `OrderCreateConfirmModal` cuando corresponde.
- Mostrar `OrderCreateSuccess` cuando el pedido queda registrado en el mock.

No debe contener:

- Validaciones de archivo.
- Datos mock hardcodeados.
- Lógica de persistencia visual.
- Reglas de negocio definitivas.
- CSS interno de componentes.

### `pages/OrderCreatePage.module.css`

Contiene estilos macro de la página.

Responsabilidades:

- Variables CSS propias del módulo, incluyendo el naranja oficial usado en `payments`.
- Layout general de la página.
- Contenedor principal del dashboard.
- Grid entre columna izquierda y resumen lateral.
- Ajustes responsive macro.

No debe contener estilos internos de formularios, modales, carga de archivos, stepper o pantalla de éxito. Esos estilos viven en el CSS Module de cada componente.

## Hook global relacionado

### `src/hooks/useOrderCreateFlow.js`

Hook encargado de controlar el flujo visual de creación de pedido.

Responsabilidades:

- Mantener el paso actual del wizard.
- Mantener el borrador del pedido.
- Mantener errores preventivos de Nota de Venta.
- Mantener error de archivos de diseño.
- Buscar información simulada de Nota de Venta en `MOCK_MANAGER_RECORDS`.
- Validar antes de avanzar de paso.
- Agregar, reemplazar y eliminar archivos de diseño.
- Abrir/cerrar modal de confirmación.
- Construir pedido mock al confirmar.
- Guardar copia visual en `sessionStorage`.
- Mostrar pantalla de éxito.
- Reiniciar flujo para registrar otro pedido.
- Navegar a Kanban.

Estados principales:

- `viewMode`: modo actual del flujo (`CREATE` o `SUCCESS`).
- `currentStep`: paso activo del wizard.
- `draft`: borrador del pedido.
- `errors`: errores preventivos del paso 1.
- `designFileError`: error preventivo de archivos de diseño.
- `notice`: feedback visual temporal.
- `showConfirmModal`: visibilidad del modal final.
- `registeredOrder`: pedido mock generado al finalizar.

Funciones relevantes:

- `updateDraftField(field, value)`: actualiza campos del borrador.
- `handleSearchSalesNote()`: busca/exporta información mock de la Nota de Venta.
- `handleAddDesignFiles(files)`: agrega archivos de diseño validados.
- `handleRemoveDesignFile(index)`: elimina un archivo de diseño.
- `handleReplaceDesignFile(index, file)`: reemplaza un archivo de diseño.
- `continueFromCurrentStep`: ejecuta la acción correcta según el paso actual.
- `handleConfirmRegister()`: confirma el registro y genera el pedido mock.
- `resetFlow()`: limpia el flujo para registrar otro pedido.
- `goToKanban()`: navega al tablero Kanban.

Notas de integración futura:

- `handleConfirmRegister()` deberá reemplazar `buildRegisteredOrder()` por una llamada a `orderApi.create` cuando exista contrato backend.
- La persistencia en `sessionStorage` es solo apoyo visual para frontend inicial.
- El backend debe validar rol, datos, PDF, duplicidad de Nota de Venta y reglas de estado.

## Archivos de `components/`

### `components/OrderCreateHeader.jsx`

Encabezado principal de la vista de Registro de Pedido.

Responsabilidades:

- Mostrar el contexto `Ventas`.
- Mostrar el título `Registro de pedido`.
- Mantener consistencia visual con el banner negro usado en `payments`.

### `components/OrderCreateHeader.module.css`

Estilos del header.

Incluye:

- Banner negro.
- Texto superior naranja.
- Título principal espaciado.
- Alto y padding homologados con `payments`.
- Ajustes responsive.

### `components/OrderCreateStepper.jsx`

Stepper visual del wizard.

Responsabilidades:

- Mostrar los tres pasos del flujo.
- Marcar pasos completados con check.
- Marcar paso activo con naranja.
- Mantener lectura visual clara entre Nota de Venta, Archivos de Diseño y Revisión.

Pasos:

1. Nota de Venta.
2. Archivos de Diseño.
3. Revisión y Registro.

### `components/OrderCreateStepper.module.css`

Estilos del stepper.

Incluye:

- Layout horizontal desktop.
- Círculos numerados.
- Líneas divisorias.
- Estados activo, completado y pendiente.
- Ajustes responsive para pantallas pequeñas.

### `components/OrderRequirementSummary.jsx`

Resumen lateral del registro.

Responsabilidades:

- Mostrar estado del código de Nota de Venta.
- Mostrar estado del archivo PDF de Nota de Venta.
- Mostrar estado de archivos de diseño.
- Mantener el botón principal del flujo.
- Mostrar botón `Volver` desde el paso 2 en adelante.

Elementos mostrados:

- `Código de Nota de Venta`.
- `Archivo de Nota de Venta`.
- `Archivos de Diseño`.

Estados visuales:

- `Pendiente`.
- `Completado`.
- `Opcional`.

Notas visuales:

- Los tres ítems deben conservar altura y estructura equivalentes.
- Los badges `Pendiente`, `Completado` y `Opcional` deben mantener tamaño consistente.
- El ícono de archivos de diseño usa el mismo naranja oficial del módulo aunque el requisito sea opcional.

### `components/OrderRequirementSummary.module.css`

Estilos del resumen lateral.

Incluye:

- Card lateral.
- Título con ícono naranja.
- Filas de requisito.
- Marcadores circulares.
- Badges de estado.
- Botón principal.
- Botón `Volver` negro.
- Alineación vertical de contenido.
- Sticky desktop y layout estático mobile.

### `components/SalesNoteStep.jsx`

Paso 1 del wizard.

Responsabilidades:

- Mostrar card de datos de Nota de Venta.
- Renderizar campo de código de Nota de Venta.
- Ejecutar búsqueda/exportación simulada.
- Renderizar `SalesNotePdfUploader`.
- Mostrar errores preventivos.

Validaciones asociadas:

- Código obligatorio.
- Código no duplicado en mock.
- Información mock encontrada.
- PDF obligatorio.

### `components/SalesNoteStep.module.css`

Estilos del paso de Nota de Venta.

Incluye:

- Cards de sección.
- Encabezados internos.
- Layout del input y botón de búsqueda.
- Estados de error/success.
- Responsive.

### `components/SalesNotePdfUploader.jsx`

Carga del PDF obligatorio de Nota de Venta.

Responsabilidades:

- Permitir seleccionar o arrastrar un archivo PDF.
- Rechazar archivos que no sean PDF desde validación preventiva.
- Mostrar archivo cargado.
- Permitir vista previa.
- Permitir reemplazar archivo.
- Permitir eliminar archivo.

Restricciones:

- Solo PDF.
- Máximo 10 MB.

### `components/SalesNotePdfUploader.module.css`

Estilos del uploader de Nota de Venta.

Incluye:

- Zona de drag/drop.
- Estado vacío.
- Estado con archivo cargado.
- Botones de ver, reemplazar y eliminar.
- Hover/focus.
- Responsive.

### `components/DesignFilesStep.jsx`

Paso 2 del wizard.

Responsabilidades:

- Mostrar información de archivos opcionales.
- Renderizar `DesignFilesUploader`.
- Mostrar errores preventivos de archivos de diseño.

Regla importante:

- El paso puede continuar aunque no existan archivos de diseño, porque son opcionales.
- No existe botón separado de `Omitir archivos de diseño`; el botón `Continuar` cumple esa función.

### `components/DesignFilesStep.module.css`

Estilos del paso de archivos de diseño.

Incluye:

- Card de sección.
- Texto de ayuda.
- Contenedor de uploader.
- Ajustes responsive.

### `components/DesignFilesUploader.jsx`

Carga de archivos de diseño opcionales.

Responsabilidades:

- Permitir seleccionar o arrastrar archivos.
- Restringir carga a PDF.
- Agregar archivos válidos al borrador.
- Renderizar lista de archivos cargados.
- Permitir reemplazo y eliminación mediante `UploadedFileList`.

Restricciones:

- Solo PDF.
- Máximo 50 MB por archivo.

### `components/DesignFilesUploader.module.css`

Estilos del uploader de archivos de diseño.

Incluye:

- Zona de drag/drop homogénea con el uploader de Nota de Venta.
- Estado vacío.
- Estado hover/drag con acento naranja.
- Responsive.

### `components/UploadedFileList.jsx`

Lista reutilizable de archivos cargados.

Responsabilidades:

- Mostrar nombre de archivo.
- Mostrar tamaño.
- Mostrar tipo visual.
- Permitir ver, reemplazar o eliminar archivo.
- Usarse tanto para Nota de Venta como para archivos de diseño cuando corresponde.

### `components/UploadedFileList.module.css`

Estilos de la lista de archivos.

Incluye:

- Fila de archivo.
- Icono documental.
- Datos del archivo.
- Acciones por archivo.
- Variantes responsive.

### `components/OrderReviewStep.jsx`

Paso 3 del wizard.

Responsabilidades:

- Mostrar resumen final antes del registro.
- Mostrar datos mínimos de Nota de Venta.
- Mostrar documento de Nota de Venta.
- Mostrar archivos de diseño si existen.
- Mostrar textarea de observaciones.
- Controlar escritura de observaciones desde el hook.

Datos visibles de Nota de Venta:

- Código de Nota de Venta.
- Cliente.
- RUT.

No se muestran:

- Tipo de producto.
- Cantidad.
- Fecha de emisión.
- Estado inicial del pedido.
- Estado de pago.

Esos datos no son necesarios visualmente en esta etapa del registro.

### `components/OrderReviewStep.module.css`

Estilos de revisión final.

Incluye:

- Layout de columnas.
- Cards de revisión.
- Documento de Nota de Venta.
- Archivos de diseño.
- Observaciones.
- Textarea con altura controlada.
- Contador de caracteres.
- Responsive.

### `components/OrderCreateConfirmModal.jsx`

Modal final de confirmación de registro.

Responsabilidades:

- Confirmar la intención de registrar el pedido.
- Mostrar aviso de estado inicial esperado.
- Mostrar resumen breve de código, PDF y archivos de diseño.
- Permitir cancelar.
- Permitir confirmar registro.

Contenido principal:

- Título `Confirmar registro`.
- Texto explicativo.
- Código de Nota de Venta.
- Nota de Venta PDF adjunta.
- Archivos de Diseño opcionales o completados.

### `components/OrderCreateConfirmModal.module.css`

Estilos del modal final.

Incluye:

- Backdrop fijo.
- Centrado real en pantalla.
- Card modal.
- Header negro.
- Línea inferior naranja.
- Botón de cierre.
- Filas resumen.
- Footer con botones.
- Responsive.

### `components/OrderCreateSuccess.jsx`

Pantalla final posterior al registro.

Responsabilidades:

- Mostrar confirmación visual del registro.
- Mantener el contenido centrado vertical y horizontalmente en desktop.
- Informar que el pedido queda en proceso de confirmación de pago.
- Ofrecer las dos acciones permitidas para Ventas.

Acciones disponibles:

- `Ir a Kanban`.
- `Registrar otro pedido`.

No contiene:

- Botón `Ver detalle del pedido`.
- Resumen de documentos.
- Cards de estado o ID.

### `components/OrderCreateSuccess.module.css`

Estilos de la pantalla de éxito.

Incluye:

- Centrado vertical y horizontal.
- Card principal.
- Ícono de éxito ampliado.
- Título principal.
- Texto explicativo.
- Botones más anchos para evitar una vista vacía.
- Responsive para mobile.

### `components/OrderNotice.jsx`

Componente de feedback visual.

Responsabilidades:

- Mostrar mensajes temporales de éxito o error.
- Informar resultado de búsqueda/exportación simulada.
- Informar errores preventivos relevantes del flujo.

### `components/OrderNotice.module.css`

Estilos del feedback visual.

Incluye:

- Variante success.
- Variante error.
- Card compacta.
- Espaciado y color coherentes con el módulo.

### `components/SalesNotePreviewModal.jsx`

Modal de vista previa de Nota de Venta.

Responsabilidades:

- Mostrar el PDF cargado por el usuario.
- Usar `DocumentPreviewModalLayout` como base visual.
- Usar `PdfPreviewFrame` para renderizar el documento.
- Permitir cerrar la vista previa.
- Mantener toolbar de zoom y fullscreen del PDF.

### `components/SalesNotePreviewModal.module.css`

Estilos específicos de la vista previa de Nota de Venta.

Incluye:

- Panel de metadata documental.
- Variantes de layout del modal.
- Footer y acciones.
- Responsive.

### `components/DocumentPreviewModalLayout.jsx`

Layout base reusable para modales documentales.

Responsabilidades:

- Renderizar backdrop del modal.
- Renderizar encabezado documental.
- Renderizar panel lateral si corresponde.
- Renderizar área principal de preview.
- Renderizar footer.

Este componente no contiene reglas de pedido. Solo define estructura visual documental.

### `components/DocumentPreviewModalLayout.module.css`

Estilos base de modales documentales.

Incluye:

- Backdrop.
- Contenedor modal.
- Header negro.
- Grid de contenido.
- Footer.
- Responsive.

### `components/PdfPreviewFrame.jsx`

Componente encargado de renderizar PDFs reales dentro del sistema.

Responsabilidades:

- Cargar PDF mediante `pdfjs-dist`.
- Configurar worker de PDF.js.
- Aplicar compatibilidad defensiva para funciones de `Map` usadas por PDF.js.
- Medir el ancho real del visor.
- Calcular escala `fit-width`.
- Renderizar páginas en canvas.
- Controlar zoom por botones.
- Permitir fullscreen del panel PDF.
- Mostrar fallback controlado si no se puede previsualizar.

Props principales:

- `file` o datos equivalentes del PDF.
- `fileName`.
- `zoom`.
- `isExpanded`.
- `onZoomOut`.
- `onZoomIn`.
- `onToggleExpanded`.

### `components/PdfPreviewFrame.module.css`

Estilos del visor PDF.

Incluye:

- Header del visor.
- Toolbar de zoom.
- Canvas de páginas PDF.
- Estado vacío.
- Estado de error.
- Modo fullscreen.
- Responsive.

## Archivos de `mocks/`

### `mocks/orderCreate.mock.js`

Define datos simulados para el flujo de creación.

Exporta:

- `ORDER_FLOW_STEPS`.
- `ORDER_PROCESS_STATUS`.
- `ORDER_PAYMENT_STATUS`.
- `EXISTING_SALES_NOTES`.
- `MOCK_MANAGER_RECORDS`.
- `DEFAULT_ORDER_DRAFT`.
- `buildRegisteredOrder(draft)`.

Responsabilidades:

- Centralizar los pasos del wizard.
- Simular notas de venta ya existentes.
- Simular información importada desde gerencia/ventas.
- Definir estado inicial de pedido.
- Definir estado inicial de pago.
- Construir un pedido mock al confirmar registro.

Datos típicos usados:

- `salesNoteCode`.
- `client`.
- `rut`.
- `productType`.
- `quantity`.
- `issueDate`.
- `salesNotePdf`.
- `designFiles`.
- `comments`.
- `orderStatus`.
- `paymentStatus`.

Notas:

- Aunque algunos datos existan en el mock, no todos se muestran en la revisión final.
- El mock sirve para simular integración posterior, no para definir reglas definitivas de negocio.

## Archivos de `utils/`

### `utils/orderCreateFormatters.js`

Utilidades de formato para creación de pedido.

Responsabilidades:

- Normalizar código de Nota de Venta.
- Formatear tamaño de archivo.
- Entregar textos consistentes para UI.
- Evitar formato disperso dentro de componentes.

### `utils/orderCreateValidation.js`

Validaciones preventivas del flujo.

Responsabilidades:

- Validar código de Nota de Venta obligatorio.
- Validar que la Nota de Venta no esté duplicada en mocks.
- Validar que exista información mock importada.
- Validar PDF obligatorio de Nota de Venta.
- Validar tipo PDF para Nota de Venta.
- Validar tamaño máximo de Nota de Venta.
- Validar tipo PDF para archivos de diseño.
- Validar tamaño máximo de archivos de diseño.

Restricciones actuales:

- Nota de Venta: PDF obligatorio, máximo 10 MB.
- Archivos de Diseño: PDFs opcionales, máximo 50 MB por archivo.

Importante:

- Estas validaciones son preventivas de frontend.
- En integración real, el backend debe validar tipo, tamaño, existencia, duplicidad, permisos y persistencia.

## Estados y reglas simuladas

Estados usados al crear pedido:

- Estado inicial del pedido: `Confirmación de pago`.
- Estado inicial de pago: `Pendiente`.

Reglas actuales de frontend mock:

- El pedido no avanza del paso 1 sin código válido, información importada y PDF obligatorio.
- Los archivos de diseño son opcionales.
- Si hay archivos de diseño, deben ser PDF.
- El usuario puede continuar desde Archivos de Diseño sin adjuntar archivos.
- El usuario debe confirmar el registro en un modal final.
- Al confirmar, se genera un pedido mock y se muestra pantalla de éxito.
- La pantalla de éxito permite ir a Kanban o registrar otro pedido.

Reglas futuras de backend:

- Validar rol de Ventas.
- Validar si el usuario puede crear pedidos.
- Validar duplicidad real de Nota de Venta.
- Validar y guardar PDF obligatorio.
- Validar y guardar archivos de diseño opcionales.
- Persistir pedido en base de datos.
- Registrar auditoría de creación.
- Devolver ID real de pedido.
- Entregar estado inicial oficial.

## Responsive

El módulo considera tres zonas principales:

- Desktop: layout de dos columnas, con contenido principal y resumen lateral.
- Tablet: columnas más flexibles, manteniendo orden de lectura.
- Mobile: layout apilado, con cards y botones a ancho completo cuando corresponde.

Puntos implementados:

- Header responsive.
- Stepper adaptable.
- Resumen lateral se vuelve estático en pantallas pequeñas.
- Uploaders con zonas táctiles amplias.
- Modales con scroll controlado.
- Pantalla de éxito centrada en desktop y adaptada en mobile.

## Accesibilidad y UX

Implementado:

- Botones reales para acciones.
- Labels visibles en inputs.
- Mensajes de error y éxito con texto.
- Estados con texto, no solo color.
- Modales con estructura `dialog` cuando corresponde.
- Botones con `aria-label` en acciones iconográficas.
- Carga de archivos con alternativa por click además de drag/drop.
- Contraste alto en botones principales.
- Resumen lateral persistente para orientar el avance del flujo.

Pendiente posible:

- Trap de foco completo dentro de modales.
- Retorno de foco al elemento que abrió el modal.
- Revisión manual con lector de pantalla.
- Pruebas mobile reales en Safari iOS y Chrome Android.

## Preparación para backend

Cuando exista integración real, se espera:

1. Reemplazar `MOCK_MANAGER_RECORDS` por consulta real de Nota de Venta.
2. Reemplazar `EXISTING_SALES_NOTES` por validación real de duplicidad.
3. Reemplazar `buildRegisteredOrder()` por respuesta del backend.
4. Enviar creación mediante `multipart/form-data`.
5. Crear `api/` solo cuando el contrato esté definido.
6. Mover validaciones críticas al backend.
7. Mantener frontend como capa visual y de feedback.

Endpoint esperado según diseño general:

```txt
POST /api/orders
```

Formato esperado:

```txt
Content-Type: multipart/form-data

Campos:
- salesNoteNumber
- salesNotePdf
- designFiles[]
- comments
```

Respuesta esperada de referencia:

```json
{
  "id": 100,
  "salesNoteNumber": "NV-2026-001",
  "orderStatus": "Confirmación de pago",
  "paymentStatus": "Pendiente"
}
```

Los nombres exactos deben definirse en contrato de integración.

## Requisitos relacionados

Requisitos base del módulo:

- `UR 2.1`: Ventas registra pedidos.
- `UR 2.2`: Crear pedido con formulario, Nota de Venta y PDF.
- `UR 12.1`: Usabilidad visual del flujo, botones, colores, iconos y badges.

Requisitos relacionados por integración posterior:

- `UR 1.4`: Permisos por roles mínimos.
- `UR 1.13`: Restringir URL protegidas por rol.
- `UR 5.1`: Visualizar tablero Kanban.
- `UR 5.3`: Consultar detalle de pedido desde Kanban o panel de detalle correspondiente.
- `UR 11.1`: Compatibilidad en navegadores modernos.

Requisitos sugeridos por evolución del módulo:

- `UR 2.3`: Validar duplicidad de Nota de Venta antes de crear pedido.
- `UR 2.4`: Vista previa de PDF de Nota de Venta antes de registrar.
- `UR 2.5`: Adjuntar archivos de diseño opcionales en registro.
- `UR 2.6`: Confirmar registro mediante modal preventivo.
- `UR 2.7`: Mostrar confirmación visual posterior al registro.
- `UR 12.2`: Usabilidad responsive del módulo Ventas.

Estos requisitos sugeridos deben formalizarse en la matriz de trazabilidad si se defenderán como parte del incremento.

## Checklist de QA manual recomendado

### Desktop

- Abrir página de Registro de Pedido.
- Validar header negro y naranja homologado con `payments`.
- Validar stepper en tres pasos.
- Intentar continuar sin datos.
- Ingresar código vacío y validar error.
- Ingresar código inexistente y validar feedback.
- Ingresar `NV-2024-0014` y buscar/exportar información mock.
- Adjuntar archivo no PDF en Nota de Venta y validar rechazo.
- Adjuntar PDF mayor al máximo permitido y validar rechazo.
- Adjuntar PDF válido y validar resumen lateral.
- Abrir vista previa de PDF.
- Reemplazar PDF de Nota de Venta.
- Eliminar PDF de Nota de Venta.
- Continuar al paso Archivos de Diseño.
- Continuar sin archivos de diseño y validar que el flujo avance.
- Adjuntar archivo de diseño no PDF y validar rechazo.
- Adjuntar PDF de diseño válido y validar resumen lateral.
- Reemplazar archivo de diseño.
- Eliminar archivo de diseño.
- Continuar a Revisión y Registro.
- Escribir observaciones y validar contador.
- Abrir modal de confirmación.
- Cancelar modal y validar retorno a revisión.
- Confirmar registro.
- Validar pantalla de éxito centrada.
- Validar botón `Ir a Kanban`.
- Validar botón `Registrar otro pedido`.

### Mobile

- Validar que la vista se apile correctamente.
- Validar que el resumen lateral no quede sticky en mobile.
- Validar botones a ancho completo cuando corresponda.
- Validar carga de archivo por click.
- Validar lectura del stepper.
- Validar modal de confirmación centrado y con scroll controlado.
- Validar pantalla de éxito adaptada a ancho móvil.

### Casos vacíos/error

- Código de Nota de Venta vacío.
- Código de Nota de Venta no encontrado.
- Nota de Venta duplicada en mock.
- PDF obligatorio ausente.
- Archivo con formato inválido.
- Archivo con tamaño excedido.
- Vista previa PDF no disponible.
- Error al escribir en `sessionStorage`.

## Decisiones técnicas importantes

- Se eliminó el CSS monolítico `styles/Orders.module.css`.
- Se usan CSS Modules por componente para mejorar mantenibilidad.
- `OrderCreatePage.jsx` quedó como orquestador, no como vista monolítica.
- La lógica de flujo vive en `src/hooks/useOrderCreateFlow.js`.
- El resumen lateral se mantiene como componente independiente.
- El botón `Omitir archivos de diseño` fue eliminado porque duplicaba la función de `Continuar`.
- Los archivos de diseño son opcionales, pero si se cargan deben ser PDF.
- La pantalla de éxito no muestra detalle de pedido ni resumen documental.
- El detalle de pedido no vive en este flujo de `orders`; debe resolverse desde Kanban o la vista de detalle correspondiente.
- Se usa PDF.js para preview, no `iframe`, para evitar depender del visor nativo del navegador.
- La persistencia en `sessionStorage` es solo simulación visual.

## Estado actual del módulo

Estado: funcional en frontend inicial con mocks.

Pendiente antes de integración real:

- Formalizar trazabilidad final en `requirementsMap.js`.
- Validar QA manual desktop/mobile.
- Definir contrato backend para `POST /api/orders`.
- Definir respuesta oficial del backend después de crear pedido.
- Definir manejo real de archivos en backend.
- Definir desde dónde se consultará el detalle de pedido en Kanban.
- Reemplazar mocks por endpoints cuando corresponda.
- Mantener evidencia visual para defensa de Sprint Review.
