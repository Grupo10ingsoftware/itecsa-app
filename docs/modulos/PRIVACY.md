# Documentos y canal de solicitudes

Soporte técnico del alcance acordado para P18. No constituye certificación legal ni cierre completo del hallazgo. Itecsa aprueba la documentación y gestiona identidad adicional, plazos, decisiones, actuaciones y respuestas fuera de este canal.

## Navegación e interfaz

- `/documentos`: cuatro tarjetas con enlaces a documentación aprobada. Sin enlace configurado, el documento aparece pendiente y la acción queda deshabilitada.
- `/solicitudes`: formulario autenticado de acceso, rectificación, eliminación, oposición, portabilidad y bloqueo; panel informativo neutro.
- Accesos en el footer del sidebar existente, encima de Cerrar sesión. Mismo tamaño, activo por `NavLink`, iconos con nombre accesible al colapsar y mismo drawer móvil.
- Las dos rutas usan el header/layout existentes. Permanecen accesibles con PIN pendiente; no ejecutan acciones protegidas por PIN ni derechos sobre datos.
- Desktop: documentos en dos columnas y formulario/panel en dos columnas. Tablet: solicitudes en una columna. Mobile: ambas páginas en una columna y acciones de formulario apiladas.

## API

`GET /api/privacy/documents` devuelve enlaces y versiones configurados y disponibilidad técnica del canal. Es público para permitir consultar esos enlaces fuera de la sesión; no expone remitente, destinatario, credenciales ni solicitudes. Las pantallas se integran en la navegación autenticada.

`POST /api/privacy/requests` exige la autenticación vigente del proyecto y usuario activo. No exige un rol empresarial nuevo ni concede capacidades administrativas.

```json
{
  "requestId": "00000000-0000-4000-8000-000000000001",
  "type": "access",
  "subject": "Consulta de prueba",
  "description": "Descripción de la solicitud",
  "email": "correo-de-la-cuenta@example.test"
}
```

El identificador es UUID v4; tipos y límites viven en `shared/privacyRequests.js`: asunto hasta 150 caracteres, descripción hasta 1000 y correo hasta 254. Son límites técnicos de este formulario, no criterios jurídicos. Se validan en frontend y backend. Se rechazan campos adicionales, adjuntos, controles inválidos, asuntos con saltos de línea, contacto ajeno y una identidad local que no corresponda al JWT. El correo efectivo siempre procede del usuario local autenticado; el valor enviado, si existe, debe coincidir. Si el correo del token mostrado en la interfaz y la cuenta local difieren, es necesario conciliar la cuenta; no se remite a otro contacto.

Se reutilizan las cuotas generales autenticadas y una cuota adicional de 5 intentos por usuario cada 15 minutos, mediante el almacén existente. Las credenciales Bearer no utilizan cookies de sesión para este endpoint.

## Configuración y envío

Valores de despliegue, sin direcciones reales incorporadas al código:

| Variable | Uso |
| --- | --- |
| `PRIVACY_REQUEST_PROVIDER` | `disabled` por defecto; `resend` para habilitar. |
| `PRIVACY_REQUEST_RECIPIENT` | Un correo del área autorizada por Itecsa. |
| `PRIVACY_REQUEST_FROM` | Remitente verificado con el proveedor. |
| `RESEND_API_KEY` | Credencial del proveedor ya utilizado en el proyecto. |
| `RATE_LIMIT_SECRET` | Secreto existente utilizado también para HMAC de comparación de solicitudes. |
| `PRIVACY_DOCUMENT_NOTICE_URL`, `PRIVACY_DOCUMENT_TERMS_URL`, `PRIVACY_DOCUMENT_POLICY_URL`, `PRIVACY_DOCUMENT_PROCEDURE_URL` | Documentos aprobados: URL HTTPS o ruta pública del despliegue. |
| Las correspondientes variables terminadas en `_VERSION` | Versión editorial definida por Itecsa, si se configura. |

No se encontró documentación jurídica aprobada y publicable en el repositorio. No se publica automáticamente una auditoría interna ni un borrador de Descargas. La empresa debe proporcionar y aprobar los archivos, alojarlos y configurar enlaces accesibles según su procedimiento. El endpoint devuelve enlaces; no aloja ni inventa documentos. No se permiten URLs `javascript:`, HTTP externo, credenciales incrustadas ni rutas relativas con traversal.

El servicio sigue el patrón de HTTP/Resend existente para PIN, con configuración y mensaje independientes: correo de texto al área configurada, `reply_to` tomado de la cuenta, identificador, fecha original, ID interno, tipo, asunto y descripción. No se modifica el proveedor de PIN. Se usa la [API oficial de envío](https://resend.com/docs/api-reference/emails/send-email) y una [clave de idempotencia](https://resend.com/docs/dashboard/emails/idempotency-keys).

El éxito significa que el proveedor aceptó la remisión y que se guardó evidencia; no prueba entrega en la bandeja del destinatario, revisión del caso ni decisión jurídica. La respuesta posterior corresponde a Itecsa. No hay notificaciones al titular ni webhooks de entrega añadidos.

## Evidencia e idempotencia

Una tabla `PrivacySubmission`: UUID, ID interno de usuario, tipo, recepción, estado técnico, HMAC del contenido para comparación, remitente/destinatario técnicos, canal, referencia del proveedor, fecha de aceptación y código de error fijo. No se guardan asunto, descripción, documentos adjuntos, expediente ni respuestas jurídicas en la base. Los contenidos sí son tratados por el proveedor y correo corporativo; Itecsa debe aprobar ese uso y su conservación.

Antes de enviar se reserva el UUID en persistencia. Un envío confirmado repetido devuelve su recibo sin reenviar. Un rechazo explícito permite reintentar el mismo contenido, destinatario e identificador dentro de 23 horas (por debajo de las 24 horas del proveedor). Dos peticiones concurrentes no envían dos correos.

Errores de red, timeout, respuesta no interpretable, caída del proceso o fallo al guardar tras aceptación pueden dejar `sending`/`unconfirmed`. No se afirma éxito ni se reenvía automáticamente; la referencia permite al responsable técnico comprobar el proveedor. Una edición del contenido tras una incertidumbre queda bloqueada en la interfaz. El frontend conserva el identificador durante el reintento; no persiste la descripción en localStorage. Este canal no es una cola de correo ni una plataforma de expedientes.

Itecsa define el acceso y conservación del registro técnico y de los correos. No se añadió una purga automática ni un plazo legal inventado.

## Adjuntos

El proyecto no tiene una infraestructura activa de recepción segura de adjuntos para este flujo. La estructura visual está preparada, el control queda deshabilitado y la API rechaza campos de archivos. No hay almacenamiento, límites de 10 MB simulados ni uploads inseguros.

## Sustitución de la demo anterior

Retirados portal/bandeja de expedientes, asignaciones, workflow, búsqueda transversal, cifrado de expedientes, suspensión global por dominios, script de vencimientos, permisos `read:privacy-cases` y `manage:privacy-cases`, flag/configuración antiguos y footer global de privacidad. Se retiran las excepciones de suspensión en autenticación y las comprobaciones de exportación asociadas a ese guard. Se conserva la sanitización HTML/CSV de exportaciones para evitar regresiones de seguridad.

La migración preparada `202610010001_privacy_rights` se sustituye en este checkout por `202610020001_privacy_submission`, que solo crea la tabla de evidencia. No se aplicó esta migración, no se consultó una base externa ni se eliminaron tablas/datos. Si otro entorno ya aplicó la migración anterior, conservar su historial y reconciliarlo antes de desplegar; no usar este checkout para reiniciar ni borrar esa base.

## Verificación

- Backend: `npm test` incluye `test/privacyChannel.test.js` (identidad, campos inválidos, cuotas, metadatos, configuración, remisión, duplicados y errores).
- Frontend: `npm test`, `npm run lint`, `npm run build`.
- Navegador: `npm run test:privacy:browser`; admite `ITECSA_BROWSER_BIN`. Usa sesión/API/correos sintéticos, ejecuta el layout y las páginas reales a 320, 390, 768 y 1440 px, y comprueba estados, errores, duplicados, documentos, drawer/colapso y logout. No envía correos reales.
- Prisma: `npm run prisma:validate`. La prueba de despliegue debe verificar la nueva persistencia y un envío controlado autorizado con proveedor real.

No existe script de typecheck en este proyecto JavaScript.

Resultados de esta entrega (2026-10-02): backend, 805 pruebas aprobadas y 2 pruebas MySQL omitidas; frontend, 115 comprobaciones del runner y 17 pruebas Node aprobadas; prueba funcional de navegador aprobada en los cuatro tamaños; lint, build, validación/generación del cliente Prisma, comprobación de artefactos y `git diff --check` aprobados. No se probó una base MySQL real ni el envío con credenciales reales. El navegador también comprueba la generación de UUID cuando `crypto.randomUUID` no está disponible, utilizando `crypto.getRandomValues`.

## Integración y reutilización

El backend conserva Route → Controller → Service → Repository, middleware JWT, cuotas y respuestas seguras existentes, y Prisma como persistencia. El frontend sigue el módulo existente con páginas, componentes, hooks y API, React Router, contexto de sesión y `createApiClient`. Reutiliza `AppLayout`, `Sidebar`, `NavigationMenu`, el header de la aplicación, `LogoutButton` y su modal, `ProtectedRoute`, `TextInput`, `SelectInput`, Bootstrap (alertas/spinner), Bootstrap Icons y tokens/estilos compartidos. No se añaden dependencias.

Los componentes propios del módulo son `PrivacyPageHeader`, `LegalDocumentCard`, `DataRequestForm` y `RequestTypesPanel`; su lógica de consulta/envío está separada en hooks. Los formularios compartidos solo incorporan atributos de validación y accesibilidad compatibles con sus usos anteriores.

De P18 anterior se conserva la ubicación conceptual del módulo y el prefijo API `/api/privacy`; se sustituyen sus endpoints y contratos de expedientes por `/documents` y `/requests`. Se conserva la sanitización HTML/CSV que la entrega anterior había incorporado en Métricas. La configuración, tablas, páginas y servicios de expedientes se reemplazan por el canal descrito; no se reutilizan sus estados jurídicos ni permisos. Los cambios en autenticación y exportaciones solo retiran dependencias del guard anterior y permiten acceder a estas dos páginas con PIN pendiente, sin alterar las acciones que necesitan PIN.

## Pendientes empresariales

Documentos aprobados y publicados; destinatario y remitente; proveedor y credenciales; aplicación autorizada de la migración; responsables y suplentes; procedimiento externo, plazos y respuesta; canal para personas sin cuenta; verificación adicional de identidad; conservación del registro y correos; comprobación de entrega/operación real. Estos puntos no se sustituyen con las pantallas.

## Archivos de esta entrega


### Modificados

- `capaServidor/env.example`
- `capaServidor/package.json`
- `capaServidor/prisma/schema.prisma`
- `capaServidor/src/app/app.js`
- `capaServidor/src/middlewares/checkJwt.js`
- `capaServidor/src/modules/auth/controller/auth.controller.js`
- `capaServidor/src/server.js`
- `capaVista/package.json`
- `capaVista/src/app/router.jsx`
- `capaVista/src/config/routes.js`
- `capaVista/src/modules/metrics/pages/MetricsPage.jsx`
- `capaVista/src/shared/components/forms/SelectInput.jsx`
- `capaVista/src/shared/components/forms/TextInput.jsx`
- `capaVista/src/shared/components/layout/Layout.module.css`
- `capaVista/src/shared/components/layout/Sidebar.jsx`
- `capaVista/src/shared/components/navigation/ProtectedRoute.jsx`
- `docs/README.md`
- `docs/desarrollo/API.md`
- `docs/security/PLAN-P08-P11-P18-P19-P28.md`
- `docs/security/RETENCION_Y_DERECHOS.md`

### Creados

- `capaServidor/prisma/migrations/202610020001_privacy_submission/migration.sql`
- `capaServidor/src/config/privacyChannel.js`
- `capaServidor/src/modules/privacy/controller/privacy.controller.js`
- `capaServidor/src/modules/privacy/repo/privacySubmission.repo.js`
- `capaServidor/src/modules/privacy/routes/privacy.routes.js`
- `capaServidor/src/modules/privacy/service/privacyDelivery.service.js`
- `capaServidor/src/modules/privacy/service/privacyRequest.service.js`
- `capaServidor/src/modules/privacy/validators/privacyRequest.validator.js`
- `capaServidor/test/privacyChannel.test.js`
- `capaVista/src/modules/metrics/utils/reportFormatting.js`
- `capaVista/src/modules/privacy/api/privacyApi.js`
- `capaVista/src/modules/privacy/components/DataRequestForm.jsx`
- `capaVista/src/modules/privacy/components/LegalDocumentCard.jsx`
- `capaVista/src/modules/privacy/components/PrivacyPageHeader.jsx`
- `capaVista/src/modules/privacy/components/RequestTypesPanel.jsx`
- `capaVista/src/modules/privacy/hooks/useDataRequestForm.js`
- `capaVista/src/modules/privacy/hooks/usePrivacyApi.js`
- `capaVista/src/modules/privacy/hooks/usePrivacyDocuments.js`
- `capaVista/src/modules/privacy/pages/DataRequestsPage.jsx`
- `capaVista/src/modules/privacy/pages/DocumentsPage.jsx`
- `capaVista/src/modules/privacy/pages/PrivacyPages.module.css`
- `capaVista/test/privacy.browser.html`
- `capaVista/test/privacy.browser.jsx`
- `capaVista/test/privacy.browser.mjs`
- `docs/modulos/PRIVACY.md`
- `shared/privacyRequests.js`

### Retirados

- `capaServidor/prisma/migrations/202610010001_privacy_rights/migration.sql`
- `capaServidor/scripts/privacyDeadlines.mjs`
- `capaServidor/src/modules/privacy/privacyConfig.js`
- `capaServidor/src/modules/privacy/privacyCrypto.js`
- `capaServidor/src/modules/privacy/privacyDeadlines.js`
- `capaServidor/src/modules/privacy/privacyDiscovery.js`
- `capaServidor/src/modules/privacy/privacyGuard.js`
- `capaServidor/src/modules/privacy/privacyRepository.js`
- `capaServidor/src/modules/privacy/privacyRoutes.js`
- `capaServidor/src/modules/privacy/privacyService.js`
- `capaVista/src/modules/metrics/utils/authorizedExport.js`
- `capaVista/src/modules/privacy/PrivacyCaseForm.jsx`
- `capaVista/src/modules/privacy/PrivacyNoticePage.jsx`
- `capaVista/src/modules/privacy/PrivacyRequestsPage.jsx`
- `capaVista/src/modules/privacy/privacyApi.js`
- `shared/privacy.js`
