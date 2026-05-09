# Planificación de mockups MVP - Sistema de gestión de producción ITECSA

> Nota inicial: el archivo `Mockups.drawio` existente está vacío. Este documento queda como guía base para construir los mockups del MVP productivo y debe poder entenderse sin consultar el resto del repositorio.

## Objetivo del documento

Entregar el contexto y la especificación mínima necesaria para que una persona de UX/UI pueda crear mockups independientes del contexto previo del proyecto.

El documento describe:

- qué problema operativo se busca resolver;
- quiénes usan el sistema;
- cuál es el flujo productivo que debe representarse;
- qué pantallas componen el MVP;
- qué datos, acciones y estados alternativos debe contemplar cada mockup.

El resultado esperado es un set de mockups de fidelidad media, suficiente para validar flujo, contenido, jerarquía de información y permisos por rol. No se espera una interfaz final ni una implementación frontend.

## Contexto del proyecto

ITECSA es una empresa que vende y produce productos como lanyards y tarjetas personalizadas. El proceso productivo actual se apoya en varios soportes no integrados:

- `Manager`, usado como sistema administrativo y fuente de información para Notas de Venta y Órdenes de Producción.
- Google Sheets / Google Drive, usado como planilla compartida de seguimiento interno.
- Documentos físicos, como carpetas, fichas, muestras firmadas y documentos que se transfieren entre áreas.
- Coordinación manual entre Ventas, Cobranzas, Producción, Administración, Bodega y Gerencia.

El dolor central no es fabricar más rápido por software. El dolor principal es la falta de trazabilidad, visibilidad compartida y una fuente única del estado de cada pedido. Hoy una orden puede avanzar físicamente, pero su estado no siempre queda actualizado, disponible o consultable por las áreas que lo necesitan.

Esto genera problemas como:

- duplicación de datos entre sistemas y planillas;
- dependencia de una persona para saber dónde está una orden;
- dificultad para saber si el pago está confirmado;
- baja visibilidad sobre atrasos, sobrecarga y prioridades;
- riesgo de que una carpeta física o una etapa quede detenida sin alerta temprana;
- reportes gerenciales lentos o manuales.

El MVP productivo debe centralizar el seguimiento desde la Nota de Venta/Pedido hasta que el pedido queda listo para entrega, sin intentar reemplazar todo Manager ni resolver servicio técnico.

## Actores y necesidades

| Actor | Necesidad principal | Qué debe poder ver | Qué debe poder hacer |
| --- | --- | --- | --- |
| Administrador | Controlar configuración, usuarios, capacidad, documentos y seguimiento general. | Todos los pedidos, estado productivo, documentos, historial, capacidad, usuarios, anuncios y reportes operativos. | Crear/editar usuarios, adjuntar OP y ficha cliente, configurar capacidad, ajustar parámetros, publicar anuncios, modificar prioridades y etiquetas. |
| Ventas | Registrar pedidos desde Nota de Venta y consultar avance para informar al cliente. | Sus pedidos, estado actual, fecha estimada, alertas de sobrecarga, listo para entrega y comentarios relevantes. | Ingresar NV, adjuntar PDF, revisar datos importados, adjuntar archivos de diseño, comentar y consultar estado. |
| Cobranzas | Confirmar, rechazar o dejar pendiente el pago para desbloquear el avance productivo. | Pedidos en confirmación de pago, documentos asociados, estado de pago e historial de decisiones. | Cambiar estado de pago a Pendiente, Rechazado o Confirmado; registrar observación; gatillar firma digital de NV al confirmar. |
| Operario / Producción | Saber qué debe trabajar, en qué etapa está cada pedido y registrar avance real. | Pedidos en producción, subprocesos por tipo de producto, prioridad, etiquetas, responsable, atraso, comentarios y documentos necesarios. | Actualizar subprocesos, agregar comentarios, asignar/remover etiquetas permitidas y marcar avance con firma electrónica. |
| Gerencia | Consultar indicadores y estado general sin entrar al detalle operativo diario. | Cumplimiento de entregas, carga productiva, pedidos por estado, ranking de productos, tiempos de ciclo y cumplimiento por vendedor. | Filtrar por fechas, revisar gráficos/tablas y exportar reportes. |

## Flujo MVP

El flujo del MVP debe representarse como una aplicación interna de seguimiento productivo:

1. Ventas registra un pedido desde una Nota de Venta (`NV`) y adjunta el PDF correspondiente.
2. El sistema consulta o simula datos provenientes de Manager y muestra datos importados: cliente, RUT, producto, cantidad y datos para fabricación.
3. El sistema calcula o muestra una fecha estimada de término según tipo de producto, cantidad y capacidad disponible.
4. Si la capacidad está al 90% o más, Ventas ve una alerta de sobrecarga y una fecha alternativa.
5. El pedido entra al Kanban en `Confirmación de pago`.
6. Cobranzas actualiza el estado de pago a `Pendiente`, `Rechazado` o `Confirmado`.
7. Si el pago no está confirmado, el pedido no puede avanzar a producción.
8. Si el pago se confirma, se registra fecha, hora y usuario; la NV queda firmada digitalmente y el pedido pasa a `Listo para producción`.
9. Administrador adjunta Orden de Producción (`OP`) y ficha cliente.
10. Producción trabaja el pedido en `En producción` y actualiza subprocesos según el tipo de producto.
11. Cada cambio relevante genera trazabilidad: usuario, fecha, hora, estado, comentario y posible firma electrónica.
12. Cuando el pedido termina el flujo productivo, pasa a `Listo para entrega`.
13. Ventas recibe aviso de disponibilidad y Gerencia puede ver indicadores consolidados.

Columnas del Kanban MVP:

- `Confirmación de pago`
- `Listo para producción`
- `En producción`
- `Listo para entrega`

Subprocesos productivos MVP:

| Tipo de producto | Subprocesos visibles |
| --- | --- |
| Lanyard | Impresión, sublimación, corte, costura |
| Tarjeta | Revisar información, ordenar información, cargar datos |

## Principios de diseño

La interfaz debe sentirse como una herramienta interna de trabajo diario, no como una página comercial.

Principios recomendados:

- Priorizar claridad, velocidad de lectura y baja carga visual.
- Usar una estructura desktop-first, porque el trabajo principal ocurre en oficina o producción, con adaptación móvil básica para consulta.
- Mostrar mucha información sin saturar: tablas, filtros, tarjetas compactas, estados visuales y paneles laterales.
- Mantener navegación persistente por módulos y rol.
- Usar colores de estado con significado consistente: pendiente, confirmado, rechazado, atraso, urgencia, prioridad y sobrecarga.
- Evitar landing page, hero comercial, frases de marketing o elementos decorativos sin función.
- Diferenciar acciones permitidas y bloqueadas por rol.
- Hacer evidente que un pedido bloqueado por pago no puede avanzar a producción.
- Diseñar estados vacíos, errores, carga, permisos insuficientes y confirmaciones de acciones críticas.
- Mantener nombres de negocio visibles: NV, OP, cliente, vendedor, producto, cantidad, fecha comprometida y estado.

## Inventario de mockups

| ID | Nombre | Rol principal | Objetivo | RF cubiertos | Datos visibles | Acciones | Estados |
| --- | --- | --- | --- | --- | --- | --- | --- |
| M01 | Login, recuperación y primer acceso | Todos | Permitir autenticación, recuperación y cambio obligatorio de contraseña. | RF01, RF02, RF06, RF15, RF18 | Correo, contraseña, mensajes de error, estado de cuenta. | Iniciar sesión, recuperar contraseña, cambiar contraseña, cerrar sesión. | Credenciales inválidas, cuenta desactivada, enlace vencido, primer acceso. |
| M02 | Layout base y navegación por rol | Todos | Definir la estructura común del sistema y permisos visibles por rol. | RF04, RF07, RF08, RF13, RF14, RF18 | Menú, perfil, rol, últimos registros, notificaciones. | Navegar, abrir perfil, cerrar sesión, ver acceso denegado. | Rol sin permiso, sesión expirada, menú reducido por rol. |
| M03 | Registro de pedido desde Nota de Venta | Ventas | Crear pedido desde NV y revisar datos importados antes de enviarlo al flujo. | RF19-RF26, RF32, RF36-RF40 | Número NV, PDF, cliente, RUT, producto, cantidad, datos fabricación, fecha estimada, capacidad. | Buscar NV, adjuntar PDF, adjuntar diseño, confirmar pedido. | NV duplicada, datos incompletos, sobrecarga, fecha alternativa. |
| M04 | Kanban productivo | Producción / Administrador | Visualizar pedidos por estado y detectar prioridades, atrasos y bloqueos. | RF43-RF46, RF52-RF58 | Columnas, tarjetas, NV, OP, cliente, producto, fecha, etiquetas, atraso, responsable. | Filtrar, buscar, arrastrar, abrir detalle, asignar etiquetas. | Pedido bloqueado, sin resultados, atraso crítico, acción no permitida. |
| M05 | Detalle de pedido | Todos según permisos | Centralizar información completa del pedido. | RF27-RF31, RF44, RF47-RF51, RF60-RF64 | Resumen, pago, documentos, producción, comentarios, historial. | Cambiar estado según rol, comentar, adjuntar documentos, ver historial. | Documento faltante, pago pendiente, historial vacío, permisos limitados. |
| M06 | Confirmación de pago | Cobranzas | Actualizar estado de pago y desbloquear o bloquear avance productivo. | RF27-RF30, RF33 | Pedido, estado de pago, usuario, fecha, hora, observación, firma NV. | Confirmar, rechazar, dejar pendiente, guardar observación. | Pago rechazado, pago pendiente, confirmación exitosa, intento de avance bloqueado. |
| M07 | Asociación de OP y ficha cliente | Administrador | Adjuntar OP y ficha cliente luego del pago confirmado. | RF31, RF51, RF60, RF61 | NV, OP, ficha cliente, documentos adjuntos, estado documental. | Adjuntar archivos, validar documentos, confirmar asociación. | Falta OP, falta ficha, archivo inválido, pago no confirmado. |
| M08 | Producción lanyards | Operario / Producción | Actualizar avance de lanyards por subproceso. | RF47-RF51, RF56-RF58, RF63-RF65 | Impresión, sublimación, corte, costura, responsable, tiempo, comentarios. | Marcar avance, agregar comentario, firmar, asignar/remover etiqueta. | Comentario obligatorio, atraso, etapa incompleta, usuario sin firma. |
| M09 | Producción tarjetas | Operario / Producción | Actualizar avance de tarjetas por subproceso. | RF47-RF51, RF56-RF58, RF63-RF65 | Revisar información, ordenar información, cargar datos, archivos, responsable. | Marcar avance, comentar, firmar, reportar problema. | Datos inconsistentes, archivo faltante, atraso, etapa bloqueada. |
| M10 | Capacidad y calendario | Administrador | Configurar capacidad y visualizar carga diaria. | RF34-RF42, RF73 | Calendario, capacidad por día, tipo producto, porcentaje usado, parámetros. | Ajustar capacidad, ajustar parámetros, ver fecha estimada. | Sobrecarga >= 90%, día sin cupos, cambio requiere motivo. |
| M11 | Anuncios y notificaciones | Todos / Administrador | Comunicar eventos y anuncios internos. | RF59, RF62, RF66-RF68 | Notificaciones, anuncios, autor, fecha, destinatarios, pedido relacionado. | Publicar anuncio, marcar leído, abrir pedido. | Sin notificaciones, urgente, listo para entrega, permiso de publicación. |
| M12 | Reportes gerenciales | Gerencia | Mostrar indicadores de producción y cumplimiento. | RF69-RF78 | Fechas, entregas, carga, ranking, estados, vendedor, gráficos, tablas. | Filtrar, exportar Excel/CSV, cambiar visualización. | Sin datos, rango inválido, exportación exitosa, error de exportación. |
| M13 | Gestión de usuarios | Administrador | Administrar usuarios, roles, estado y firma electrónica. | RF05, RF12, RF16, RF17 | Usuarios, RUT, correo, rol, estado, firma, historial. | Crear, editar, desvincular, reactivar, actualizar firma. | Correo duplicado, RUT inválido, usuario desvinculado, firma faltante. |

### Plantilla fija de traspaso

Cada mockup debe documentarse y diseñarse usando esta interfaz de traspaso:

| Campo | Uso obligatorio |
| --- | --- |
| ID | Código único del mockup. |
| Nombre | Nombre corto de la pantalla o flujo. |
| Rol principal | Rol que usa principalmente la pantalla. |
| Objetivo | Para qué existe la pantalla en el flujo MVP. |
| Requisitos relacionados | RF o grupo funcional cubierto. |
| Contenido visible | Datos y bloques que deben aparecer. |
| Acciones | Botones, menús, cambios de estado o interacciones principales. |
| Estados alternativos | Casos vacíos, errores, bloqueos, permisos y confirmaciones. |
| Notas UX | Reglas visuales, jerarquía, comportamiento o restricciones importantes. |

### Fichas de traspaso por mockup

#### M01 - Login, recuperación y primer acceso

| Campo | Especificación |
| --- | --- |
| ID | M01 |
| Nombre | Login, recuperación y primer acceso |
| Rol principal | Todos |
| Objetivo | Permitir que usuarios vinculados entren al sistema, recuperen acceso y cambien contraseña en primer inicio. |
| Requisitos relacionados | RF01, RF02, RF06, RF15, RF18 |
| Contenido visible | Logo o nombre ITECSA, correo, contraseña, enlace `Olvidé mi contraseña`, mensaje de error, formulario de nueva contraseña. |
| Acciones | Iniciar sesión, solicitar enlace de recuperación, establecer nueva contraseña, cerrar sesión desde la app. |
| Estados alternativos | Cuenta desactivada, credenciales inválidas, correo no encontrado, enlace vencido, contraseña no cumple política, primer acceso obligatorio. |
| Notas UX | Mantener la pantalla simple. Los errores deben ser visibles cerca del formulario. El flujo de primer acceso debe bloquear cualquier otro módulo hasta completar el cambio. |

#### M02 - Layout base y navegación por rol

| Campo | Especificación |
| --- | --- |
| ID | M02 |
| Nombre | Layout base y navegación por rol |
| Rol principal | Todos |
| Objetivo | Definir la estructura común de navegación y mostrar diferencias por permisos. |
| Requisitos relacionados | RF04, RF07, RF08, RF13, RF14, RF18 |
| Contenido visible | Barra lateral o superior, módulos disponibles, usuario, rol, acceso a perfil, notificaciones, últimos registros del perfil. |
| Acciones | Cambiar módulo, abrir perfil, abrir notificaciones, cerrar sesión, intentar acceso a módulo restringido. |
| Estados alternativos | Acceso denegado, sesión expirada, menú reducido por rol, perfil sin registros recientes. |
| Notas UX | La navegación debe ser persistente. No mostrar botones que el rol no puede usar, salvo cuando se quiera representar explícitamente el bloqueo por permiso. |

#### M03 - Registro de pedido desde Nota de Venta

| Campo | Especificación |
| --- | --- |
| ID | M03 |
| Nombre | Registro de pedido desde Nota de Venta |
| Rol principal | Ventas |
| Objetivo | Permitir que Ventas cree un pedido usando el número de NV y su PDF, revisando datos importados antes de enviarlo al Kanban. |
| Requisitos relacionados | RF19, RF20, RF21, RF22, RF23, RF24, RF25, RF26, RF32, RF36, RF37, RF38, RF39, RF40 |
| Contenido visible | Número NV, carga de PDF, cliente, RUT, descripción, producto, cantidad, datos para fabricación, vendedor, fecha de creación, fecha estimada, capacidad disponible, archivos de diseño. |
| Acciones | Buscar NV, adjuntar PDF, adjuntar archivos de diseño, revisar datos, confirmar creación, cancelar. |
| Estados alternativos | NV duplicada, NV no encontrada, PDF faltante, datos incompletos, capacidad >= 90%, fecha alternativa sugerida, pedido ingresado bajo sobrecarga. |
| Notas UX | La pantalla debe dejar claro que Manager es fuente externa de consulta/importación, pero no debe mockuparse Manager. La alerta de sobrecarga debe ser visible antes de confirmar. |

#### M04 - Kanban productivo

| Campo | Especificación |
| --- | --- |
| ID | M04 |
| Nombre | Kanban productivo |
| Rol principal | Producción / Administrador |
| Objetivo | Mostrar pedidos por estado, facilitar búsqueda y visualizar bloqueos, prioridades y atrasos. |
| Requisitos relacionados | RF43, RF44, RF45, RF46, RF52, RF53, RF54, RF55, RF56, RF57, RF58 |
| Contenido visible | Columnas `Confirmación de pago`, `Listo para producción`, `En producción`, `Listo para entrega`; tarjetas con NV, OP, cliente, producto, cantidad, fecha comprometida, fecha estimada, etiquetas, atraso, responsable y estado de pago. |
| Acciones | Buscar, filtrar, abrir detalle, arrastrar tarjeta, asignar prioridad, asignar/remover etiquetas, seleccionar múltiples pedidos si aplica. |
| Estados alternativos | Sin pedidos, búsqueda sin resultados, tarjeta bloqueada por pago pendiente, intento de arrastre no permitido, atraso leve o crítico. |
| Notas UX | Las tarjetas deben ser compactas y escaneables. El estado de pago debe verse en las tarjetas de la primera columna. El indicador de atraso debe estar en una posición constante. |

#### M05 - Detalle de pedido

| Campo | Especificación |
| --- | --- |
| ID | M05 |
| Nombre | Detalle de pedido |
| Rol principal | Todos según permisos |
| Objetivo | Centralizar toda la información de una NV/OP para evitar depender de planillas, carpetas físicas o consultas verbales. |
| Requisitos relacionados | RF27, RF28, RF29, RF30, RF31, RF44, RF47, RF48, RF49, RF50, RF51, RF60, RF61, RF63, RF64 |
| Contenido visible | Resumen comercial, estado actual, pago, documentos, OP, ficha cliente, subprocesos, comentarios, adjuntos, etiquetas, historial cronológico. |
| Acciones | Cambiar estado según rol, comentar, adjuntar documento, abrir archivo, actualizar subproceso, ver historial. |
| Estados alternativos | Pago pendiente, documentos faltantes, usuario sin permiso de edición, historial vacío, comentario requerido antes de guardar. |
| Notas UX | Puede resolverse como panel lateral desde Kanban o página completa. Debe mantener siempre visible NV, OP, cliente, estado y fecha comprometida. |

#### M06 - Confirmación de pago

| Campo | Especificación |
| --- | --- |
| ID | M06 |
| Nombre | Confirmación de pago |
| Rol principal | Cobranzas |
| Objetivo | Permitir a Cobranzas confirmar, rechazar o dejar pendiente el pago y controlar el desbloqueo productivo. |
| Requisitos relacionados | RF27, RF28, RF29, RF30, RF33 |
| Contenido visible | Identificación del pedido, archivo NV, estado de pago actual, selector de estado, observación, usuario responsable, fecha y hora de confirmación. |
| Acciones | Seleccionar `Pendiente`, `Rechazado` o `Confirmado`; guardar decisión; agregar observación; revisar firma digital aplicada. |
| Estados alternativos | Pago rechazado con motivo, pago pendiente, confirmación exitosa, firma digital aplicada, intento de avanzar sin pago confirmado. |
| Notas UX | El cambio a `Confirmado` debe sentirse como acción crítica. Mostrar confirmación previa si el diseño lo permite. |

#### M07 - Asociación de OP y ficha cliente

| Campo | Especificación |
| --- | --- |
| ID | M07 |
| Nombre | Asociación de OP y ficha cliente |
| Rol principal | Administrador |
| Objetivo | Permitir que Administrador adjunte documentos necesarios para que Producción trabaje el pedido. |
| Requisitos relacionados | RF31, RF51, RF60, RF61 |
| Contenido visible | Pedido, NV, estado de pago, carga de OP, carga de ficha cliente, documentos ya asociados, estado documental. |
| Acciones | Adjuntar OP, adjuntar ficha cliente, reemplazar archivo si corresponde, confirmar asociación, abrir vista previa. |
| Estados alternativos | Pago no confirmado, falta OP, falta ficha cliente, archivo inválido, documento asociado correctamente. |
| Notas UX | Si el pago no está confirmado, la pantalla debe bloquear la asociación y explicar el motivo. |

#### M08 - Producción lanyards

| Campo | Especificación |
| --- | --- |
| ID | M08 |
| Nombre | Producción lanyards |
| Rol principal | Operario / Producción |
| Objetivo | Registrar avance real de lanyards por etapas internas. |
| Requisitos relacionados | RF47, RF48, RF49, RF50, RF51, RF56, RF57, RF58, RF63, RF64, RF65 |
| Contenido visible | Pedido, OP, cliente, cantidad, accesorios o datos relevantes, stepper/checklist de Impresión, Sublimación, Corte y Costura, responsable, tiempos, etiquetas y comentarios. |
| Acciones | Iniciar etapa, marcar etapa completada, agregar comentario, firmar cambio, asignar/remover etiqueta permitida. |
| Estados alternativos | Etapa pendiente, etapa en curso, etapa completada, comentario obligatorio, atraso, usuario sin firma electrónica, pedido bloqueado. |
| Notas UX | Debe mostrar quién tomó o completó cada etapa. La trazabilidad de la carpeta física debe quedar representada digitalmente. |

#### M09 - Producción tarjetas

| Campo | Especificación |
| --- | --- |
| ID | M09 |
| Nombre | Producción tarjetas |
| Rol principal | Operario / Producción |
| Objetivo | Registrar avance de tarjetas por revisión de información, ordenamiento y carga de datos. |
| Requisitos relacionados | RF47, RF48, RF49, RF50, RF51, RF56, RF57, RF58, RF63, RF64, RF65 |
| Contenido visible | Pedido, OP, cliente, cantidad, archivos de datos, archivos de fotos o diseño, stepper/checklist de Revisar información, Ordenar información y Cargar datos. |
| Acciones | Marcar revisión, registrar observación, reportar inconsistencia, completar etapa, firmar cambio. |
| Estados alternativos | Archivo faltante, datos inconsistentes, etapa bloqueada, atraso, comentario obligatorio, usuario sin permiso. |
| Notas UX | El flujo de tarjetas está menos detallado que lanyards; el mockup debe ser flexible y no inventar maquinaria específica. |

#### M10 - Capacidad y calendario

| Campo | Especificación |
| --- | --- |
| ID | M10 |
| Nombre | Capacidad y calendario |
| Rol principal | Administrador |
| Objetivo | Configurar capacidad productiva y visualizar carga diaria para apoyar fechas estimadas. |
| Requisitos relacionados | RF34, RF35, RF36, RF37, RF38, RF39, RF40, RF41, RF42, RF73 |
| Contenido visible | Calendario, porcentaje de carga diaria, capacidad máxima, capacidad usada, capacidad disponible, tipo de producto, parámetros por cantidad, días con sobrecarga. |
| Acciones | Ajustar capacidad, editar parámetros de estimación, seleccionar día, ver pedidos del día, registrar motivo de ajuste. |
| Estados alternativos | Día sin cupo, carga >= 90%, carga completa, cambio guardado, error por parámetro inválido. |
| Notas UX | La vista debe ayudar a explicar por qué se propone una fecha alternativa al registrar una NV. |

#### M11 - Anuncios y notificaciones

| Campo | Especificación |
| --- | --- |
| ID | M11 |
| Nombre | Anuncios y notificaciones |
| Rol principal | Todos / Administrador |
| Objetivo | Mostrar comunicaciones internas y eventos automáticos relevantes del flujo. |
| Requisitos relacionados | RF59, RF62, RF66, RF67, RF68 |
| Contenido visible | Bandeja de notificaciones, panel de anuncios, tipo de evento, pedido relacionado, fecha, autor, destinatarios, estado leído/no leído. |
| Acciones | Abrir notificación, marcar como leída, abrir pedido relacionado, publicar anuncio como Administrador. |
| Estados alternativos | Sin notificaciones, pedido urgente, nuevo pedido creado, pedido listo para entrega, usuario sin permiso para publicar. |
| Notas UX | Separar anuncios generales de eventos automáticos. Las notificaciones críticas deben permitir llegar al pedido en un clic. |

#### M12 - Reportes gerenciales

| Campo | Especificación |
| --- | --- |
| ID | M12 |
| Nombre | Reportes gerenciales |
| Rol principal | Gerencia |
| Objetivo | Entregar visión ejecutiva del cumplimiento, carga y comportamiento productivo. |
| Requisitos relacionados | RF69, RF70, RF71, RF72, RF73, RF74, RF75, RF76, RF77, RF78 |
| Contenido visible | Selector de rango de fechas, pedidos a tiempo/fuera de plazo, tiempo de ciclo promedio, carga por día, ranking de productos, órdenes por estado, cumplimiento por vendedor, gráficos y tablas. |
| Acciones | Filtrar rango, exportar Excel, exportar CSV, cambiar métrica visible, abrir detalle agregado si aplica. |
| Estados alternativos | Sin datos para el rango, rango de fechas inválido, exportación exitosa, error de exportación. |
| Notas UX | Debe ser claro y resumido. Gerencia no necesita editar pedidos desde esta vista. |

#### M13 - Gestión de usuarios

| Campo | Especificación |
| --- | --- |
| ID | M13 |
| Nombre | Gestión de usuarios |
| Rol principal | Administrador |
| Objetivo | Crear, editar y desvincular usuarios conservando historial operativo. |
| Requisitos relacionados | RF05, RF12, RF16, RF17 |
| Contenido visible | Lista de usuarios, nombre, apellido, RUT, correo, rol, estado, firma electrónica, fecha de creación, historial asociado. |
| Acciones | Crear usuario, editar usuario, cambiar rol, vincular/desvincular, actualizar firma, buscar usuario. |
| Estados alternativos | Correo duplicado, RUT inválido, firma faltante, usuario desvinculado, edición guardada, datos históricos conservados. |
| Notas UX | Desvincular no debe verse como eliminar. Debe quedar claro que la información histórica permanece disponible en reportes y trazabilidad. |

## Datos de ejemplo

Usar datos ficticios y consistentes entre pantallas. No usar datos reales de clientes.

| NV | OP | Cliente | Producto | Cantidad | Fecha comprometida | Estado Kanban | Etiquetas | Responsable |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- |
| NV-2026-0148 | OP-2026-0081 | Municipalidad Norte | Lanyard sublimado 20 mm | 450 | 18-05-2026 | En producción | Prioridad | Alonso Pérez |
| NV-2026-0152 | OP-2026-0084 | Colegio Andino | Tarjeta PVC personalizada | 300 | 20-05-2026 | Listo para producción | Urgencia | Fabián Rojas |
| NV-2026-0155 | Pendiente | Clínica Central | Lanyard sublimado 15 mm | 120 | 21-05-2026 | Confirmación de pago | Atraso | Cobranzas |
| NV-2026-0160 | OP-2026-0089 | Banco Austral | Tarjeta credencial | 800 | 24-05-2026 | Listo para entrega | Sin etiqueta | Mati Silva |
| NV-2026-0164 | OP-2026-0091 | Universidad Pacífico | Lanyard sublimado 25 mm | 1000 | 27-05-2026 | En producción | Urgencia, Atraso | Marcela Soto |

Ejemplos de usuarios:

| Nombre | Rol | Correo ficticio | Estado |
| --- | --- | --- | --- |
| Dana Administradora | Administrador | admin@itecsa.example | Vinculado |
| Valentina Ventas | Ventas | ventas@itecsa.example | Vinculado |
| Carlos Cobranzas | Cobranzas | cobranzas@itecsa.example | Vinculado |
| Alonso Producción | Operario | produccion@itecsa.example | Vinculado |
| Jaime Gerencia | Gerencia | gerencia@itecsa.example | Vinculado |

Mensajes y textos de ejemplo:

- `Ya existe una Nota de Venta con el código ingresado. No se permite duplicar.`
- `Pedido en espera de confirmación de pago.`
- `La capacidad disponible para la fecha solicitada está sobre el 90%.`
- `El pedido cambió a Listo para entrega.`
- `No tienes permisos para acceder a este módulo.`

Formatos esperados:

- Fechas: `DD-MM-YYYY`, por ejemplo `18-05-2026`.
- Horas: `HH:MM:SS`, por ejemplo `14:05:09`.
- Identificadores: usar `NV-YYYY-NNNN` y `OP-YYYY-NNNN` en mockups.

## Criterios de aceptación

Los mockups cumplen el traspaso si:

- Una persona externa puede entender el sistema sin leer Documento 0, entrevistas ni arquitectura.
- El set cubre registro de NV, confirmación de pago, asociación de OP/ficha, Kanban, subprocesos, trazabilidad, capacidad, notificaciones, reportes y usuarios.
- Cada mockup tiene rol principal, objetivo, datos visibles, acciones y estados alternativos.
- Los permisos por rol son visibles y consistentes.
- El Kanban muestra las cuatro columnas MVP: `Confirmación de pago`, `Listo para producción`, `En producción`, `Listo para entrega`.
- Los flujos de lanyards y tarjetas se distinguen por sus subprocesos.
- Los bloqueos por pago pendiente o rechazado son evidentes.
- La sobrecarga productiva sobre 90% se representa visualmente.
- La trazabilidad muestra fecha, hora, usuario y acción.
- Los datos de ejemplo son ficticios y consistentes entre pantallas.
- No se incluye servicio técnico como parte del MVP.
- No se diseña una integración completa con CRM, ERP ni Manager.
- No se presenta Manager como pantalla interna del sistema; se trata solo como fuente externa de datos.
- No se plantea automatización total del proceso productivo físico.
- El tono visual corresponde a una herramienta interna: clara, densa, sobria y orientada al trabajo diario.
