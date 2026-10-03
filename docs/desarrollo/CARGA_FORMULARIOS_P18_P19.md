# Carga de Solicitudes e Incidentes: comparación y práctica aplicada

Revisión del 02-10-2026. Ambos formularios comparten layout, estilos, cliente API y obtención del access token. Parecerse visualmente no implica realizar las mismas operaciones antes de quedar disponibles.

## Diferencias comprobadas en el código

| Etapa | Solicitudes (P18) | Incidentes (P19) |
| --- | --- | --- |
| Código de la página | `React.lazy` y un módulo independiente. Puede estar ya descargado por una visita anterior. | `React.lazy` y otro módulo independiente. Visitar P18 no descarga automáticamente este módulo. |
| Token frontend | `getAccessTokenSilently`, a través del cliente API compartido. | La misma obtención de token y el mismo cliente API. |
| Consulta inicial | `GET /api/privacy/documents`. Devuelve documentos públicos y disponibilidad del canal desde configuración del servidor. | `GET /api/security/incident-reports/config`. Devuelve disponibilidad y correo de la cuenta local autenticada. |
| Trabajo backend inicial | No pasa por `checkJwt`; no consulta al usuario en MySQL. | JWT → usuario activo en MySQL → control de cuota → configuración. Si el rol local difiere del token, puede verificarlo también con Auth0. Las cuotas usan memoria en desarrollo y una transacción MySQL en producción. |
| Correo mostrado | `user.email` del contexto de sesión, procedente del claim de correo verificado al iniciar la sesión. | `contactEmail` de la cuenta local resuelta por el backend; puede diferir del claim. |
| Espera para mostrar el formulario | Todavía espera su consulta inicial, que suele ser rápida al no consultar identidad en la base. | Se muestra desde el primer render; la consulta personal se resuelve en segundo plano. Enviar sigue bloqueado hasta confirmarla. |
| Al abrir la página | No envía correo ni crea una solicitud. | No envía correo ni consulta/crea evidencia de reporte. `SecurityAuditEvent` se usa al enviar; la auditoría general de Soporte puede escribir después de terminar la respuesta HTTP, sin ser una espera explícita de la respuesta. |

Fuentes: [router](../../capaVista/src/app/router.jsx), [página de solicitudes](../../capaVista/src/modules/privacy/pages/DataRequestsPage.jsx), [página de incidentes](../../capaVista/src/modules/security/pages/IncidentReportPage.jsx), [rutas P18](../../capaServidor/src/modules/privacy/routes/privacy.routes.js), [rutas P19](../../capaServidor/src/modules/security/routes/incidentReport.routes.js), [identidad activa](../../capaServidor/src/middlewares/requireActiveIdentity.js) y [cuotas](../../capaServidor/src/modules/security/service/securityThrottle.service.js).

La consulta pública del servidor local respondió HTTP 200 en aproximadamente 2 ms en una comprobación. Una consulta sin sesión a P19 respondió HTTP 401 en aproximadamente 11 ms: ese rechazo no mide la consulta autenticada ni el acceso a MySQL. No había una sesión de navegador accesible para medir de extremo a extremo la demora de dos segundos descrita por el usuario. Las diferencias anteriores son comprobables; atribuir exactamente esos dos segundos a MySQL, Auth0 o la descarga del módulo requeriría medir esa sesión.

## Práctica aplicada

1. **Preparar el código antes de navegar.** Los tres módulos pequeños de Documentos, Solicitudes e Incidentes se importan en un momento libre del navegador después de montar el menú. También se inicia la preparación al acercar el puntero, enfocar el enlace con teclado o tocarlo. Se conserva la carga por módulos: no se importan de forma estática todos los módulos operativos al arrancar.
2. **Compartir los mismos imports.** `informationPageLoaders.js` define las funciones usadas tanto por `React.lazy` como por la precarga. El sistema de módulos del navegador reutiliza el código descargado. No se mantiene una segunda lista de URLs con nombres de archivos de build.
3. **Limitar el indicador de carga al contenido.** Antes, el `Suspense` exterior podía sustituir todo el árbol de rutas por un indicador mientras llegaba una página. `AppLayout` ahora tiene un límite alrededor del `Outlet`: menú y cabecera siguen visibles aunque el código de una página aún no llegue.
4. **Separar renderizado y confirmación del canal.** P19 permite redactar inmediatamente; obtención del correo y disponibilidad permanecen autenticadas. No se autoriza el envío hasta confirmar esa respuesta, tampoco mediante Enter. Errores, reintentos o respuestas tardías conservan/protegen el borrador según las pruebas existentes.

La precarga descarga y evalúa código, sin montar los componentes de las páginas. No obtiene configuración privada, no manda reportes ni almacena correos en caché entre usuarios. Un fallo de precarga no interrumpe la página actual. Solo se preparan estas tres páginas pequeñas; hay un costo de descarga anticipada que se mueve a un momento libre, no una eliminación de trabajo o una promesa de cero latencia con cualquier red.

Implementación: [loaders compartidos](../../capaVista/src/app/informationPageLoaders.js), [menú](../../capaVista/src/shared/components/layout/Sidebar.jsx) y [layout](../../capaVista/src/shared/components/layout/AppLayout.jsx).

La documentación de [React.lazy](https://react.dev/reference/react/lazy) explica la descarga al primer render y la reutilización posterior. La [documentación de precarga de módulos](https://react.dev/reference/react-dom/preloadModule) describe el beneficio de empezar antes de una transición; aquí se usan los imports dinámicos que resuelve Vite, conservando sus nombres y dependencias de build. El [límite de Suspense](https://react.dev/reference/react/Suspense) determina qué parte de la interfaz muestra el indicador.

## Comparación reproducible

Se mide el router, layout y formularios reales en Chromium headless, a 1440 px, con sesión y API sintéticas. Se ejecuta la implementación actual dos veces: con precarga de código desactivada mediante un alias exclusivo del servidor de pruebas, y activada. Ambos casos mantienen el renderizado progresivo de P19 y el límite de carga del layout. No es una comparación contra toda la implementación original.

- Caso A: la transferencia inicial del módulo de cada formulario tarda artificialmente 1500 ms; la API responde inmediatamente. Se deja un intervalo de 2500 ms en la página de Documentos para que la precarga tenga oportunidad de preparar el código. Se mide desde el clic hasta el formulario pintado.
- Caso B: después de visitar ambos módulos, la API tarda artificialmente 2000 ms en ambas páginas. Esto aísla la espera de datos y permite distinguir formulario visible de envío habilitado.
- Se comprueba que la precarga prepare ambos módulos sin consultar `/incident-reports/config`, y que cada visita real haga una sola consulta de configuración.

Los retardos existen únicamente en el servidor y la API de pruebas; no se introdujeron esperas artificiales en la aplicación. Las cachés Vite y los perfiles de navegador de cada corrida son temporales e independientes, para no interferir con el servidor de desarrollo abierto.

Resultados de una corrida controlada:

| Condición | Solicitudes | Incidentes |
| --- | --- | --- |
| Primera transferencia del módulo de 1500 ms, sin precarga | Formulario visible en 1600 ms | Formulario visible en 1617 ms |
| Misma transferencia, código preparado antes del clic | Formulario visible en 34 ms | Formulario visible en 35 ms |
| Módulo preparado, API retrasada 2000 ms | Formulario visible en 2050 ms | Formulario visible en 35 ms; enviar habilitado en 2018 ms |

La mejora de la segunda fila procede de comenzar la descarga antes del clic; no reduce la transferencia de 1500 ms. La tercera fila muestra que P19 ya no liga la aparición del formulario a la respuesta del backend. Estas muestras no acreditan que la consulta autenticada real tarde 2000 ms.

Evidencia numérica de la corrida: [JSON](evidencias/carga-formularios-2026-10-02.json). Las cifras son muestras de laboratorio, no mediciones de producción ni un SLA. El tiempo incluye navegación, renderizado y dos frames para observar el formulario pintado.

```bash
npm run test:forms:performance:baseline --prefix capaVista
npm run test:forms:performance --prefix capaVista
```

Cada comando imprime las medidas y guarda `forms-performance.json` en el directorio temporal de capturas anunciado al terminar. La referencia sin precarga está en `test/informationPageLoaders.baseline.js` y se selecciona solo en el benchmark; no forma parte del código servido por el build normal.

## Cómo localizar la demora de la sesión real

1. Abrir DevTools → Network, mantener el registro y pulsar Solicitudes e Incidentes. Separar el primer ingreso de las visitas siguientes. Registrar también una corrida con caché normal: desactivar toda la caché no representa la navegación habitual con precarga.
2. Distinguir las peticiones del módulo JavaScript de `incident-reports/config`. Una demora del módulo puede aparecer antes de iniciar la consulta API. La compilación de Vite en desarrollo no representa el costo del build de producción.
3. Revisar el tiempo de espera de la respuesta de configuración. La obtención del token ocurre antes de `fetch`, por lo que no todo el tiempo desde el clic aparecerá dentro de esa petición; usar Performance para ver el intervalo completo.
4. Si la API autenticada mantiene una espera relevante, medir en el backend las etapas JWT, usuario activo, eventual reconciliación de rol y cuota. Conservar esos controles y optimizar la etapa lenta a partir de la medición. No convertir en público un endpoint que devuelve correo personal para igualar tiempos.

## Validación

Comparación controlada con precarga desactivada/activada; regresión P19 en seis tamaños y P18 en cuatro; pruebas frontend, lint y build. Las pruebas usan identidades ficticias y no envían correos reales. Ver [pruebas generales](PRUEBAS.md) y [módulo P19](../modulos/INCIDENT_REPORTS.md).
