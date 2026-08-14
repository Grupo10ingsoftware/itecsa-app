# Convenciones UI Frontend

Este documento define criterios visuales y patrones de layout para nuevas pantallas de `capaVista`. No reemplaza la documentacion de arquitectura, backend ni autenticacion; solo concentra decisiones de interfaz reutilizables en la SPA React.

## Proposito

Usar este documento cuando se cree o modifique una vista frontend para mantener coherencia visual entre modulos.

Debe consultarse junto con:

- [`capaVista/README.md`](../capaVista/README.md), para ejecucion, variables de entorno y autenticacion frontend.
- [`docs/ARQUITECTURA.md`](./ARQUITECTURA.md), para flujo Auth0, roles, permisos y limites vigentes.

## Estilo Visual General

La interfaz debe mantener una apariencia consistente en todos los modulos:

- Cabeceras oscuras para secciones principales.
- Color naranjo como acento visual.
- Tarjetas blancas con bordes suaves.
- Sombras ligeras para separar bloques de contenido.
- Bordes redondeados en tarjetas, botones, inputs y selects.
- Botones con estados `hover`, `focus` y `disabled` claramente distinguibles.
- Labels consistentes en peso, color y espaciado.
- Inputs, selects y textareas con altura, tipografia y separacion uniforme.
- Separacion clara entre secciones de formularios.

Los tokens visuales globales viven en `capaVista/src/styles/theme.css` y los estilos base globales en `capaVista/src/styles/global.css`.

## Layout Principal

El layout principal debe evitar depender solo de columnas fijas tipo Bootstrap para separar menu y contenido. La estructura esperada es:

- Sidebar visible en pantallas grandes.
- Sidebar colapsable en escritorio cuando corresponda.
- Sidebar tipo panel lateral en pantallas pequenas.
- Overlay o backdrop para cerrar el menu movil.
- Contenido principal adaptable al ancho disponible.
- Transiciones suaves al abrir, cerrar o colapsar navegacion.

Archivos relacionados:

```txt
capaVista/src/shared/components/layout/AppLayout.jsx
capaVista/src/shared/components/layout/Sidebar.jsx
capaVista/src/shared/components/layout/Topbar.jsx
capaVista/src/shared/components/layout/Layout.module.css
capaVista/src/shared/components/navigation/NavigationMenu.jsx
```

## Formularios

Los formularios nuevos deben seguir estas reglas:

- Agrupar campos relacionados en bloques visuales claros.
- Usar `form-label`, `form-control` y `form-select` o componentes compartidos equivalentes.
- Mostrar errores cerca del campo correspondiente.
- Usar `aria-invalid` y `aria-describedby` cuando haya validaciones visibles.
- Mantener botones de accion alineados y con jerarquia visual clara.
- Evitar agregar campos que la integracion actual no persiste, salvo que esten deshabilitados y explicados.

No se deben solicitar ni persistir contrasenas desde frontend. El RUT solo debe enviarse en flujos con contrato backend aprobado, como la creacion administrativa de usuarios.

## Modulos Y Paginas

Cada modulo nuevo deberia mantener una estructura similar:

```txt
src/modules/<modulo>/
├── components/
├── pages/
├── utils/
└── mocks/        # solo si la fase actual usa datos simulados
```

Reglas recomendadas:

- La pagina principal vive en `pages/` y orquesta la pantalla.
- Componentes reutilizables o de secciones internas viven en `components/`.
- Funciones puras o auxiliares viven en `utils/`.
- Datos simulados viven en `mocks/` y deben reemplazarse por servicios backend cuando existan contratos aprobados.
- Cada componente con estilos propios puede usar un `.module.css` junto al componente.

## Kanban

El modulo Kanban usa una pantalla de seguimiento de produccion con columnas y arrastre de ordenes entre estados.

Archivos principales actuales:

```txt
capaVista/src/modules/kanban/pages/KanbanBoardPage.jsx
capaVista/src/modules/kanban/pages/KanbanBoardPage.module.css
capaVista/src/modules/kanban/components/KanbanCard.jsx
capaVista/src/modules/kanban/components/KanbanColumn.jsx
capaVista/src/modules/kanban/components/KanbanFilters.jsx
capaVista/src/modules/kanban/styles/Kanban.module.css
```

La dependencia de drag and drop `@dnd-kit/react` esta declarada en `capaVista/package.json`. No debe instalarse dentro de `src/modules/kanban/`, porque el modulo no es un proyecto npm independiente.

## Cobranzas / Payments

El modulo `payments` ya posee documentacion propia en `capaVista/src/modules/payments/README.md`. Las convenciones generales de este documento aplican al modulo, pero los detalles funcionales de Cobranzas deben mantenerse en su README local.

## Checklist Para Nuevas Pantallas

Antes de dar por terminada una nueva vista frontend, revisar:

- Usa contenedor principal claro, preferentemente tipo tarjeta o shell de pagina.
- Tiene cabecera visual consistente con el resto del sistema.
- Usa el acento naranjo de forma moderada y coherente.
- Los formularios mantienen labels, inputs, selects y botones consistentes.
- La vista responde correctamente en escritorio y movil.
- Los mocks quedan separados de la logica real.
- Las acciones sensibles no dependen solo de controles visuales frontend.
- No se registran tokens, contrasenas, datos personales reales ni secretos en archivos o documentacion.

## Que No Documentar Aqui

No usar este documento para:

- Secretos, tokens, client secrets o credenciales reales.
- Configuracion detallada de Auth0, que vive en `docs/ARQUITECTURA.md` y los README de capa.
- Endpoints backend, que corresponden a `capaServidor/README.md`.
- Historial granular de cambios por commit o por integrante.
- Instrucciones locales de IDE salvo que sean necesarias para todo el equipo.
