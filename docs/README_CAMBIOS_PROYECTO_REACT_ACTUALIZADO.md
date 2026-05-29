# README - Cambios de Estilo e Integración del Proyecto React

## Resumen general

Este documento resume los cambios realizados en el `src` del proyecto React para unificar el estilo visual de los módulos, integrar el módulo Kanban con drag and drop, mejorar la navegación lateral responsiva y ajustar detalles visuales detectados durante la revisión.

El estilo base tomado como referencia **Contaduría / Confirmación de pago**, replicando el lenguaje visual en el resto de la aplicación.

---

## 1. Estilo visual general del sistema

Se unificó el diseño general del proyecto para que todos los módulos mantengan una apariencia consistente.

### Cambios aplicados

- Uso de cabeceras negras para secciones principales.
- Uso de color naranjo como acento visual.
- Tarjetas blancas con bordes suaves.
- Sombras ligeras para separar visualmente los bloques.
- Bordes redondeados en tarjetas, botones e inputs.
- Botones con transiciones y efecto `hover`.
- Labels en mayúscula, con peso visual fuerte y color gris azulado.
- Inputs más limpios, con altura y espaciado consistente.
- Mejor separación entre secciones del formulario.

### Archivos relacionados

```txt
src/shared/styles/global.css
src/shared/styles/theme.css
```

---

## 2. Layout principal y sidebar responsivo

Se modificó la estructura del layout para que la aplicación no dependa únicamente de columnas fijas tipo Bootstrap como `col-2` y `col-10`.

Antes, el menú lateral ocupaba una columna fija y el contenido principal otra columna, lo que generaba problemas en pantallas pequeñas.

### Cambios aplicados

- Sidebar abierto en pantallas grandes.
- Sidebar colapsable en escritorio, dejando una barra angosta solo con íconos.
- Sidebar tipo panel lateral en pantallas pequeñas.
- Botón para abrir/cerrar menú en móvil.
- Overlay oscuro al abrir el menú en móvil.
- Contenido principal adaptable al ancho disponible.
- Transiciones suaves al abrir/cerrar el sidebar.
- Navegación más parecida a un panel moderno 

### Archivos modificados

```txt
src/shared/components/layout/AppLayout.jsx
src/shared/components/layout/Sidebar.jsx
src/shared/components/layout/Topbar.jsx
src/shared/components/layout/Layout.module.css
src/shared/components/navigation/NavigationMenu.jsx
```

---

## 3. Módulo Registro de Pedido / Nota de Venta

Se ajustó el módulo de registro de pedido para que use el mismo estilo visual del módulo de confirmación de pago.

### Cambios aplicados

- Cabecera principal con fondo negro.
- Secciones internas con título negro y detalles naranjos.
- Inputs con estilo consistente.
- Botones con color, tamaño y transición unificados.
- Mejor separación entre bloques.
- Corrección de alineación entre el input **Código de Nota de Venta** y el botón **Buscar / Exportar información**.
- El botón quedó alineado visualmente con el input, usando una estructura simétrica de columnas.

### Archivos relacionados

```txt
src/modules/orders/SalesNoteForm.jsx
src/modules/orders/pages/OrderCreatePage.jsx
src/modules/orders/pages/OrderCreatePage.module.css
```

---

## 4. Módulo Crear Usuario / Administración de Usuarios

Se adaptó el formulario de creación de usuario al mismo estilo general del sistema.

### Cambios aplicados

- Inputs alineados en columnas simétricas.
- Labels con mismo formato visual del resto del proyecto.
- Tarjetas y contenedores con bordes suaves.
- Botones ajustados al estilo negro/naranjo.
- Mejora visual del campo **Firma electrónica**.

### Arreglo nuevo: campo Firma electrónica

El input nativo de archivo se veía descuadrado, ya que el navegador aplica su propio estilo al botón **Elegir archivo**.

Para solucionarlo, se reemplazó visualmente por un componente personalizado:

- Se oculta el `input type="file"` real.
- Se crea un botón personalizado con `label`.
- El botón usa fondo negro y hover naranjo.
- El nombre del archivo queda alineado dentro del mismo contenedor.
- En pantallas pequeñas, el selector se adapta en columna.

### Archivos relacionados

```txt
src/modules/users/components/UserCreateForm.jsx
src/modules/users/pages/UserCreatePage.module.css
```

---

## 5. Módulo Kanban

Se integró el módulo Kanban `src` actualizado del proyecto.

### Cambios aplicados

- Integración del Kanban con drag and drop.
- Adaptación visual del Kanban al estilo general del sistema.
- Columnas con tarjetas blancas, bordes suaves y sombra ligera.
- Cabecera de módulo con fondo negro.
- Uso del color naranjo como acento visual.
- Botones y filtros con estilo consistente.
- Tarjetas Kanban con diseño más limpio.
- Separación visual entre columnas y elementos arrastrables.
- Conservación del funcionamiento drag and drop.

### Componentes integrados

```txt
src/modules/kanban/KanbanPage.jsx
src/modules/kanban/components/KanbanCard.jsx
src/modules/kanban/components/KanbanColumn.jsx
src/modules/kanban/components/KanbanFilters.jsx
src/modules/kanban/KanbanPage.module.css
```

### Dependencia necesaria

Para que el drag and drop funcione correctamente, se debe instalar la dependencia:

```bash
npm.cmd install @dnd-kit/react
```

Si PowerShell bloquea `npm`, usar `npm.cmd` en vez de `npm`.

---

## 6. Login

Se actualizó el login para mantener coherencia con el estilo del resto de la aplicación.

### Cambios aplicados

- Formulario más limpio.
- Tarjeta centrada con sombra y borde suave.
- Botón principal con estilo unificado.
- Inputs con mejor espaciado.
- Fondo más consistente con la identidad visual del sistema.

### Archivos relacionados

```txt
src/modules/auth/pages/LoginPage.jsx
src/modules/auth/pages/LoginPage.module.css
```

---

## 7. Acceso denegado

Se ajustó la pantalla de acceso denegado para que no quedara visualmente separada del resto del sistema.

### Cambios aplicados

- Contenedor tipo tarjeta.
- Mensajes más ordenados.
- Botón con estilo consistente.
- Uso del mismo sistema de colores.

### Archivos relacionados

```txt
src/modules/auth/pages/AccessDeniedPage.jsx
src/modules/auth/pages/AccessDeniedPage.module.css
```

---

## 8. Componentes compartidos

Se revisaron y ajustaron componentes reutilizables para que todos los módulos hereden un estilo visual similar.

### Cambios aplicados

- Inputs con altura y bordes consistentes.
- Selects con el mismo diseño de formularios.
- File inputs mejorados.
- Botones con transiciones suaves.
- Estados `hover`, `focus`, `disabled` más claros.

### Archivos relacionados

```txt
src/shared/components/forms/TextInput.jsx
src/shared/components/forms/SelectInput.jsx
src/shared/components/forms/FileInput.jsx
src/shared/components/buttons/LogoutButton.jsx
```

---

## 9. Responsividad

Se agregaron mejoras para que la interfaz se adapte mejor a diferentes tamaños de pantalla.

### Cambios aplicados

- Sidebar colapsable en escritorio.
- Sidebar tipo panel en móvil.
- Contenido principal adaptable.
- Inputs y botones reorganizados en pantallas pequeñas.
- Kanban preparado para mejor visualización horizontal.
- Selector de archivo de firma electrónica adaptado a móvil.
- Reducción de padding en pantallas pequeñas.

---

## 10. Comandos útiles

Desde Visual Studio Code, abrir la terminal con:

```txt
Terminal > New Terminal
```

O con el atajo:

```txt
Ctrl + Ñ
```

Si PowerShell bloquea `npm`, usar:

```bash
npm.cmd install
npm.cmd install @dnd-kit/react
npm.cmd run dev
```

---

## 11. Resumen final de cambios por módulo

| Módulo | Cambio principal |
|---|---|
| Layout | Sidebar responsivo y colapsable |
| Navegación | Menú lateral adaptado a escritorio y móvil |
| Registro de pedido | Estilo unificado y alineación de botón con input |
| Crear usuario | Formulario estilizado y selector de firma electrónica mejorado |
| Kanban | Integración con drag and drop y estilo visual unificado |
| Login | Diseño actualizado |
| Acceso denegado | Diseño actualizado |
| Componentes compartidos | Inputs, selects, botones y file inputs unificados |
| Estilos globales | Colores, sombras, bordes y tipografía normalizados |

---

## Estado actual

El `src` queda preparado con una base visual más consistente, una navegación más moderna y soporte para integrar más módulos manteniendo el mismo estilo.

Para futuras mejoras, se recomienda que cada nuevo módulo use la misma estructura visual:

- contenedor principal tipo tarjeta,
- cabecera negra,
- acento naranjo,
- formularios con inputs unificados,
- botones con hover,
- diseño adaptable a pantallas pequeñas.
