# Canal técnico de reporte de posibles incidentes (P19)

Alcance acordado el 02-10-2026: recibir una sospecha, identificar al reportante, validar, conservar evidencia técnica mínima y remitir al responsable de Itecsa. No confirma un incidente ni sustituye investigación, clasificación, contención, notificaciones legales, recuperación o cierre. No representa certificación ni cierre completo de P19.

## Interfaz e integración

Ruta autenticada `/reportar-incidente`, dentro del `AppLayout` y header existentes. Acceso de ancho completo debajo de Documentos/Solicitudes y encima de Cerrar sesión; reutiliza `NavLink`, estilo activo, drawer y colapso con nombre accesible. P18 mantiene páginas, rutas y botones.

Cabecera negra SEGURIDAD / REPORTAR INCIDENTE. Formulario y panel neutro de cuatro categorías a la derecha en desktop; una columna en tablet/mobile. Acción principal negra, escudo y texto blancos; cancelar vuelve a Kanban siguiendo P18. Estados de validación, carga, envío, éxito, error técnico, red y configuración pendiente. El formulario y el panel se muestran desde el primer render del módulo; la consulta autenticada de disponibilidad/contacto se realiza en segundo plano. Se permite redactar durante la consulta, pero no enviar (tampoco mediante Enter) hasta recibir una configuración válida. Un error permite reintentar sin desmontar el formulario ni perder el borrador. Respuestas tardías de una pantalla anterior se descartan; no se almacena en caché el correo/configuración entre visitas. La ruta permanece accesible con PIN pendiente, sin ampliar acciones protegidas por PIN ni roles. Solo usuarios activos con sesión válida pueden usar el canal.

Se reutilizan `PrivacyPageHeader` y estilos de formularios/tarjetas de P18, `TextInput`, `SelectInput`, cliente API, contexto autenticado, Bootstrap/Icons, tokens y breakpoints actuales. Se utiliza `datetime-local` nativo: al pulsar cualquier zona del campo se solicita abrir el selector mediante `showPicker`, conservando la edición nativa si el navegador no lo admite. Fecha y módulo tienen etiquetas en bloque y controles de igual altura. El escudo de la nota final conserva un círculo visible sobre el fondo gris. Los únicos cambios internos a P18 extraen el transporte Resend y la generación de UUID hacia utilidades compartidas; se mantienen contratos y pruebas anteriores.

La comparación con P18, la precarga selectiva de código y sus mediciones están en [Carga de formularios](../desarrollo/CARGA_FORMULARIOS_P18_P19.md). El menú y la cabecera permanecen visibles durante la descarga del módulo.

## API y contrato

- `GET /api/security/incident-reports/config`: sesión exigida; devuelve `reportsEnabled` y `contactEmail` de la cuenta local autenticada. No expone destinatario, remitente ni secretos.
- `POST /api/security/incident-reports`: sesión exigida; backend vuelve a resolver identidad/contacto. No hay listado, consulta de otros reportes ni bandeja administrativa.
- Ambas respuestas usan `Cache-Control: no-store`; se reutiliza JWT, usuario activo y cuotas generales. POST agrega 5 intentos por usuario en 15 minutos mediante el almacén de cuotas existente.

```json
{
  "reportId": "00000000-0000-4000-8000-000000000001",
  "description": "Descripción ficticia de lo observado.",
  "observedAt": "2026-10-01T15:00:00.000Z",
  "module": "kanban",
  "technicalReference": "Referencia de prueba"
}
```

No se admiten `userId`, `email`, `role`, destinatario, adjuntos, severidad ni otros campos. La identidad debe corresponder al JWT y al usuario local activo; el correo del mensaje procede exclusivamente de esa cuenta. El frontend lo obtiene del endpoint autenticado, sin depender de un claim de correo posiblemente desactualizado.

## Validación y fechas

Contrato compartido en `shared/incidentReports.js`:

- Descripción: 10 caracteres como mínimo tras trim, máximo 1000; sin controles inválidos. Se eligió el máximo del formulario existente de P18 y un mínimo técnico para evitar reportes vacíos. No son requisitos jurídicos.
- Referencia: opcional, hasta 300 caracteres en una línea, siguiendo el límite técnico de observaciones existente. No se visita ni interpreta una URL o código enviado.
- Módulos reales: Kanban, perfil, mensajes, pagos, usuarios, órdenes, historial, calendario, métricas, documentos, solicitudes, autenticación y otro módulo/servicio. La lista compartida no concede acceso a esos módulos ni clasifica gravedad.
- Fecha obligatoria: el control utiliza hora local del dispositivo; convierte a UTC explícito antes de enviar. Se rechazan fechas inexistentes, formato sin zona/normalizaciones de calendario y observaciones futuras, con tolerancia técnica de 5 minutos por desfase de reloj. Rango técnico desde 1970; no es un plazo de reporte ni SLA legal.
- Se distingue `observed_at` (aportado por la persona) de `received_at` (reloj backend). Este canal no define la fecha empresarial de conocimiento de una vulneración.
- UUID v4 estable por envío/reintento, con respaldo criptográfico cuando `randomUUID` no existe.

## Configuración y correo

| Variable | Uso |
| --- | --- |
| `SECURITY_INCIDENT_PROVIDER` | `disabled` por defecto; `resend` habilita el transporte. |
| `SECURITY_INCIDENT_RECIPIENT` | Contacto autorizado y atendido que Itecsa debe designar. |
| `SECURITY_INCIDENT_FROM` | Remitente verificado con el proveedor. |
| `RESEND_API_KEY` | Credencial existente del proveedor. |
| `RATE_LIMIT_SECRET` | Secreto existente, usado también como clave HMAC de comparación. |

Se remite texto al destinatario configurado con identificador, fechas UTC, ID interno, contacto verificado, módulo, referencia y descripción. El `reply_to` es el contacto de la cuenta. No se comunica automáticamente a autoridades ni afectados. El destino de P19 es independiente del de P18 y de PIN.

Transporte HTTPS existente de Resend extraído a `src/shared/resendTextDelivery.js`, timeout de 10 segundos, redirects rechazados, clave propia `incident-report/{UUID}` y errores públicos fijos. La [API oficial](https://resend.com/docs/api-reference/emails/send-email) y las [claves de idempotencia](https://resend.com/docs/dashboard/emails/idempotency-keys) sustentan el contrato de remisión.

Éxito significa aceptación por el proveedor y registro de evidencia, no entrega a una bandeja, lectura o atención por una persona. No se añadieron webhooks de entrega, acuse por correo, cola automática ni calendario de atención. Itecsa debe vigilar el canal y comprobar recepción efectiva según su procedimiento.

## Persistencia mínima y duplicados

Se reutiliza la tabla existente `SecurityAuditEvent` a través de `SecurityAuditRepository`. Cada intento añade un evento `incident_report.attempt` y su resultado añade un evento `incident_report.delivery`; no se sobrescriben eventos anteriores. Las columnas existentes registran identidad, UUID, resultado y código técnico. Dos columnas opcionales complementan la evidencia: `event_key`, con índice único para serializar intentos/resultados concurrentes, y `metadata`, limitada por una lista de campos técnicos permitidos (módulo, fechas, HMAC, destinatario/remitente configurados, canal, número de intento y referencia/aceptación del proveedor). El estado se reconstruye desde estos eventos; no se crea una tabla P19. No persiste descripción, referencia técnica, correo personal, adjuntos ni investigación. El correo corporativo/proveedor sí trata el contenido; deben aprobarse su uso, acceso y conservación.

La reserva persistente ocurre antes del correo. Una repetición confirmada del mismo UUID/contenido/usuario devuelve el recibo sin reenviar, incluso tras reinicio del proceso. Una petición simultánea en curso no dispara otro envío. Se rechaza el mismo UUID para otro contenido/persona. Un rechazo explícito permite reintento del mismo envío, reservado mediante un nuevo evento con clave única por número de intento, durante 23 horas, con el mismo remitente y destinatario, por debajo de las 24 horas de idempotencia del proveedor.

Red/timeout/respuesta incierta, caída del proceso o fallo de persistencia posterior pueden dejar `sending`/`unconfirmed`. No se confirma ni reenvía automáticamente. El formulario conserva y congela el contenido/UUID para reintentar sin cambio o consultar al responsable con la referencia. Debe comprobarse el proveedor si persiste incertidumbre; no se crean casos ni herramientas administrativas para ello. Un UUID nuevo no deduplica por similitud de contenido. Navegar/recargar pierde el formulario: ante incertidumbre, conservar la referencia y consultar antes de crear otro reporte. No hay contenido persistido en localStorage.

Los logs propios solo contienen ID de reporte, resultado y código fijo mediante `safeLogger`; no contenido, correo personal, credenciales ni respuesta del proveedor. Se mantienen controles JWT/CORS/errores del proyecto; el endpoint utiliza Bearer y no cookies de sesión. No concede lectura de evidencia a los administradores.

## Migración y límites de operación

Nueva migración aditiva `202610020002_incident_report_audit`: añade únicamente las dos columnas opcionales y el índice único a `SecurityAuditEvent`. Sustituye la propuesta no aplicada de una tabla independiente. No se borran datos ni se alteran migraciones previamente existentes. Validar/generar Prisma no aplica migraciones. No se aplicó esta migración, no se conectó a una base externa ni se remitieron correos reales como parte del desarrollo.

La guía y los registros previos de `SecurityAuditEvent` se conservan; las escrituras de auditoría de Soporte y de negocio mantienen su contrato y no utilizan los nuevos campos. No se encontró workflow, bandeja, tabla de casos o investigación anteriores que debieran eliminarse o simplificarse. Los eventos de seguridad existentes no se convierten en incidentes automáticamente.

## Procedimiento y canal alternativo de Itecsa

La aplicación no puede ser el único canal empresarial. Itecsa debe publicar/distribuir un contacto alternativo operativo para caída, fallo de autenticación, cuenta bloqueada o reportantes sin acceso; este desarrollo no construye ese canal ni inventa contactos. Ver [runbook existente](../security/INCIDENTES_Y_RESTAURACION.md).

Pendientes empresariales: responsable y suplente, destinatario atendido, proveedor y condiciones aprobadas, conservación de auditoría/correos, registro externo al que se incorporan avisos, evaluación y escalamiento, evidencias, comunicaciones, recuperación, cierre y ejercicios. No se inventan gravedad, plazos jurídicos ni políticas. Antes de habilitar: reconciliar configuración, aplicar migración en el entorno autorizado, realizar un envío controlado y comprobar recepción y actuación del responsable. P11 sigue pendiente: Soporte no adquiere nuevas capacidades para consultar todos los reportes.

## Pruebas y evidencias

Comprobaciones disponibles: `npm run lint --prefix capaVista`, `npm run build --prefix capaVista` y `npm run prisma:validate --prefix capaServidor`. No hay script de typecheck: proyecto JavaScript. Las suites y ejecutores se retiraron el 03-10-2026; ver [validación de entrega](../desarrollo/PRUEBAS.md).

Las pruebas históricas comprobaron identidad, campos y fechas, módulos, reserva, duplicados, concurrencia con dobles, cuotas y sanitización. El navegador verificó formulario visible durante una espera API de dos segundos, envío habilitado tras confirmar configuración, conservación del borrador, reintentos, descarte de respuestas tardías, alineación de controles, círculo del escudo y apertura del selector desde el marco, además de navegación y PIN pendiente, en seis anchos de 320 a 1440 px. Usaron sesión/API/correos sintéticos.

Esa evidencia no acredita una ejecución actual, base productiva, proveedor real, recepción humana, procedimiento empresarial ni cierre completo. Verificar el flujo en el entorno autorizado antes de habilitarlo.

## Inventario de esta entrega

### Archivos modificados

- `capaServidor/env.example`
- `capaServidor/prisma/schema.prisma`
- `capaServidor/src/modules/privacy/service/privacyDelivery.service.js`
- `capaServidor/src/server.js`
- `capaServidor/src/modules/security/repo/securityAudit.repo.js`
- `capaVista/package.json`
- `capaVista/src/app/router.jsx`
- `capaVista/src/shared/components/layout/AppLayout.jsx`
- `capaVista/src/config/routes.js`
- `capaVista/src/modules/privacy/hooks/useDataRequestForm.js`
- `capaVista/src/shared/components/layout/Layout.module.css`
- `capaVista/src/shared/components/layout/Sidebar.jsx`
- `capaVista/src/shared/components/navigation/ProtectedRoute.jsx`
- `capaVista/src/shared/components/forms/TextInput.jsx`
- `docs/README.md`
- `docs/desarrollo/API.md`
- `docs/security/INCIDENTES_Y_RESTAURACION.md`
- `docs/security/PLAN-P08-P11-P18-P19-P28.md`

### Archivos creados

- `capaServidor/prisma/migrations/202610020002_incident_report_audit/migration.sql`
- `capaServidor/src/config/incidentChannel.js`
- `capaServidor/src/modules/security/controller/incidentReport.controller.js`
- `capaServidor/src/modules/security/repo/incidentReport.repo.js`
- `capaServidor/src/modules/security/routes/incidentReport.routes.js`
- `capaServidor/src/modules/security/service/incidentDelivery.service.js`
- `capaServidor/src/modules/security/service/incidentReport.service.js`
- `capaServidor/src/modules/security/validators/incidentReport.validator.js`
- `capaServidor/src/shared/resendTextDelivery.js`
- `capaVista/src/app/informationPageLoaders.js`
- `capaVista/src/shared/components/navigation/ModuleLoadingState.jsx`
- `capaVista/src/modules/security/api/incidentReportsApi.js`
- `capaVista/src/modules/security/components/IncidentReportForm.jsx`
- `capaVista/src/modules/security/components/IncidentTypesPanel.jsx`
- `capaVista/src/modules/security/hooks/useIncidentConfiguration.js`
- `capaVista/src/modules/security/hooks/useIncidentReportForm.js`
- `capaVista/src/modules/security/hooks/useIncidentReportsApi.js`
- `capaVista/src/modules/security/pages/IncidentReportPage.jsx`
- `capaVista/src/modules/security/pages/IncidentReportPage.module.css`
- `capaVista/src/shared/utils/createRequestId.js`
- `docs/desarrollo/CARGA_FORMULARIOS_P18_P19.md`
- `docs/desarrollo/evidencias/carga-formularios-2026-10-02.json`
- `docs/modulos/INCIDENT_REPORTS.md`
- `shared/incidentReports.js`

No se eliminaron archivos, módulos ni migraciones anteriores.

Resultados al 02-10-2026: backend 843 pruebas, 841 aprobadas y 2 MySQL omitidas; 36 pruebas específicas P19 y 19 de P18 aprobadas. Frontend: 115 comprobaciones y 17 pruebas Node aprobadas; lint y build aprobados. Navegador P19 aprobado en seis tamaños, P18 en cuatro. Prisma validate/generate y comprobación de artefactos aprobados. No se ejecutó typecheck (no existe script), migración ni envío real.
