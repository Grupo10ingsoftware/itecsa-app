# P14 Seguridad de la búsqueda de Notas de Venta

## Estado y alcance

Decisión aprobada para implementación. Este documento define los controles que se aplicarán a `GET /api/orders/sales-notes/:numeroNota` sin cambiar la finalidad de la pantalla Registro de Orden.

Implementación técnica completada el 2 de octubre de 2026 en modo observación. Las tablas físicas existentes `SecurityThrottle` y `SecurityAuditEvent`, incluida la relación entre `SecurityAuditEvent.actor_user_id` y `Usuario.id_usuario`, están representadas en `schema.prisma`. La ruta protegida registra resultados y mantiene contadores temporales, pero no bloquea, no responde 429 y no agrega pasos a la interfaz. No se ejecutó DDL ni una migración contra la base existente.

Ventas debe poder consultar durante toda su jornada tantas Notas de Venta como necesite, revisar la información necesaria para registrar un pedido y recibir una advertencia diferenciada cuando la nota ya fue registrada. La protección se orientará a detectar abuso o automatización, no a limitar el trabajo legítimo.

## Riesgo tratado

La ruta requiere autenticación y la capacidad `read:sales-notes`, pero entrega resultados diferentes para notas inexistentes, disponibles y ya registradas. Una nota disponible incluye información comercial y datos personales necesarios para la vista previa.

Una cuenta autorizada comprometida o utilizada indebidamente podría consultar números en serie y recopilar información fuera de su tarea. La interfaz no constituye por sí sola una barrera, porque el endpoint puede invocarse directamente.

## Decisiones

1. No existirá un máximo diario de consultas.
2. La primera etapa operará en modo observación y no bloqueará al usuario por volumen de trabajo.
3. Cada intento autorizado de búsqueda se audita con el resultado `AVAILABLE`, `ALREADY_REGISTERED`, `NOT_FOUND` o `ERROR`. `RATE_LIMITED` queda reservado para una eventual etapa de aplicación y no se genera en el modo actual.
4. La actividad se contabilizará por usuario autenticado y por ventana temporal para construir una línea base de uso.
5. Se detectarán patrones como alta velocidad, exceso de resultados inexistentes, gran cantidad de números diferentes y secuencias compatibles con un barrido.
6. Durante el modo observación, un patrón sospechoso generará un evento de seguridad, pero no una respuesta HTTP 429.
7. El bloqueo automático quedará preparado y desactivado. Sólo podrá habilitarse después de analizar métricas reales, documentar los umbrales y comprobar que no afecta el trabajo de Ventas.
8. Si posteriormente se habilita una restricción, será una espera breve contra ráfagas automatizadas, no un bloqueo de horas ni un cupo diario.
9. Se mantendrán la vista previa y los mensajes diferenciados de nota inexistente y nota ya registrada, porque forman parte del diagnóstico necesario para Ventas.
10. La respuesta y la auditoría se limitarán a la información necesaria para sus respectivas finalidades.

El sistema actual opera para una sola organización, por lo que no existe un identificador de tenant adicional. Si la arquitectura pasa a ser multiempresa, el tenant deberá incorporarse al alcance de los contadores antes de compartir infraestructura.

## Datos de auditoría

Cada evento registrará únicamente:

- Identificador interno del usuario.
- Fecha y hora.
- Huella HMAC-SHA-256 del número normalizado de Nota de Venta cuando existe `SECURITY_LOG_HMAC_KEY` (con fallback local no productivo). El número legible no se copia al evento.
- Acción realizada.
- Resultado de la consulta.
- Identificador de correlación de la solicitud.
- Código de motivo cuando corresponda.

El registro de seguridad no almacenará:

- RUT del cliente.
- Nombre del cliente.
- Observaciones de la Nota de Venta.
- Productos o cantidades.
- Cuerpo completo de la solicitud o respuesta.
- Token de autenticación.

La política de retención, acceso y eliminación de estos eventos debe definirse antes del despliegue en la empresa. Los registros deberán estar disponibles sólo para las funciones autorizadas de seguridad y cumplimiento.

## Minimización de la vista previa

Se conservan los campos que la pantalla utiliza para validar el pedido: número de Nota de Venta, cliente, RUT, fecha de entrega, productos, cantidades y observaciones.

`origen.usuarioManager` se comprobó como no renderizado ni utilizado para registrar el pedido y se retiró de la respuesta pública. El backend conserva el dato en su contrato interno de fuente y puede seguir consultando la fuente completa durante `POST /api/orders`, porque la creación vuelve a recuperar y validar la Nota de Venta en el servidor.

## Justificación legal y normativa

Esta medida no se basa en una obligación literal de imponer un número máximo de consultas. La Ley 21.719 y las normas ISO exigen gestionar el riesgo, limitar el tratamiento a su finalidad, proteger el acceso y mantener controles que permitan detectar y acreditar actividades relevantes. La auditoría y el monitoreo son los controles seleccionados para ese objetivo.

La Ley 21.719, que modifica la Ley 19.628 y entra en vigor el 1 de diciembre de 2026, sustenta esta decisión mediante:

- El principio de responsabilidad, por el cual el responsable debe cumplir y poder acreditar las obligaciones aplicables al tratamiento.
- El principio de seguridad, que exige proteger los datos contra tratamiento o acceso no autorizado o ilícito.
- El artículo 14 bis, relativo al deber de secreto y confidencialidad.
- El artículo 14 quáter, relativo a protección desde el diseño y por defecto. Este exige aplicar medidas técnicas y organizativas adecuadas y tratar por defecto sólo los datos personales específicos y estrictamente necesarios, considerando cantidad, extensión, conservación y accesibilidad.
- El artículo 14 quinquies, relativo al deber de adoptar medidas de seguridad apropiadas al riesgo y evaluar regularmente su eficacia.

La relación principal con ISO/IEC 27001:2022 y NCh-ISO/IEC 27002:2022 es:

- Anexo A 8.15 de ISO/IEC 27001 y control 8.15 de NCh-ISO/IEC 27002, Registro: producir, almacenar, proteger y analizar registros de actividades, excepciones, fallos y otros eventos relevantes. Incluye considerar intentos exitosos y rechazados de acceso a datos y recursos.
- Anexo A 8.16 y control 8.16, Actividades de monitoreo: supervisar sistemas y aplicaciones para detectar comportamientos anómalos y evaluar posibles incidentes.
- Controles 5.15 y 5.18, Control y derechos de acceso, junto con 8.3, Restricción de acceso a la información: limitar la consulta a identidades y funciones autorizadas.
- Control 5.34, Privacidad y protección de información personal identificable: identificar y aplicar controles acordes con las obligaciones legales y de privacidad.
- Control 5.33, Protección de registros: conservar y proteger los registros de acuerdo con necesidades legales, reglamentarias, contractuales y empresariales.

La guía de implantación de ISO 27001 refuerza el enfoque basado en riesgo y la evaluación del desempeño del sistema de gestión. La definición concreta de umbrales debe responder al contexto y al uso real de la organización, no a un valor arbitrario definido durante el desarrollo.

Por lo tanto, la primera etapa utilizará trazabilidad, minimización y detección en modo observación. La organización evaluará el riesgo residual con métricas reales antes de activar restricciones automáticas.

## Implementación prevista

1. Modelar en Prisma las tablas físicas existentes `SecurityThrottle` y `SecurityAuditEvent`, sin aplicar DDL sobre la base actual. Completado el 2 de octubre de 2026.
2. Crear repositorios y servicios de seguridad con operaciones atómicas e indexadas. Completado el 2 de octubre de 2026.
3. Integrar el control después de autenticación y autorización en la búsqueda de Notas de Venta. Completado el 2 de octubre de 2026.
4. Registrar todos los resultados sin copiar datos personales o comerciales de la respuesta. Completado el 2 de octubre de 2026; la Nota de Venta se persiste como huella SHA-256.
5. Implementar detección configurable en modo observación. Completado el 2 de octubre de 2026 para volumen total y volumen de resultados inexistentes.
6. Agregar pruebas de autorización, auditoría, concurrencia, privacidad y ausencia de bloqueos. Completado el 2 de octubre de 2026.
7. Medir latencia y carga antes y después de la integración. La respuesta HTTP se emite antes de esperar al monitor y esta propiedad está probada; la medición de carga con concurrencia real queda como verificación previa al despliegue empresarial.
8. Documentar retención, responsables de revisión y procedimiento de respuesta antes del despliegue empresarial.

## Configuración de observación

- `SECURITY_MONITOR_WINDOW_SECONDS`: duración de la ventana; valor por defecto 300 segundos.
- `SECURITY_MONITOR_LOOKUP_SIGNAL_THRESHOLD`: señal exploratoria de volumen total; valor por defecto 30 consultas por ventana.
- `SECURITY_MONITOR_NOT_FOUND_SIGNAL_THRESHOLD`: señal exploratoria de resultados inexistentes; valor por defecto 10 por ventana.

Estos valores producen eventos `SALES_NOTE_LOOKUP_ALERT` con resultado `OBSERVED`. No son límites operativos, no suspenden cuentas y no modifican la respuesta HTTP. Deben ajustarse con las métricas reales de la empresa.

## Criterios para una restricción futura

Una restricción automática sólo podrá activarse cuando existan:

- Métricas representativas del uso cotidiano de Ventas.
- Umbrales superiores al uso legítimo observado.
- Revisión y aprobación del responsable del proceso.
- Pruebas de falsos positivos y concurrencia.
- Un tiempo de espera breve y una vía operativa de recuperación.
- Monitoreo posterior a la activación.

La habilitación deberá registrarse como una nueva decisión, con fecha, responsables, evidencia y valores configurados.

## Fuentes de referencia

- Ley 21.719, texto publicado por la Biblioteca del Congreso Nacional de Chile: `https://www.bcn.cl/leychile/Navegar?idNorma=1209272`.
- `Ley21719.docx`, copia de trabajo proporcionada para el proyecto.
- `NQA-ISO-27001-Guia-de-implantacion.pdf`, guía de implementación proporcionada para el proyecto.
- `TRUSTTECH_NCh_27002_2022.pdf`, NCh-ISO/IEC 27002:2022 proporcionada para el proyecto.
