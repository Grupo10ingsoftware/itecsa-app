# H07 — Entrega segura del código de recuperación

## Resultado y alcance

Se elimina el proveedor de consola y su selección implícita cuando NODE_ENV no era
production. Se conserva RF07 (challenge, verificación y nuevo PIN), con entrega
inyectable y configuración explícita. **PROVEEDOR DE CORREO PENDIENTE**: RF07 no está
disponible para usuarios reales hasta implementar/configurar un adaptador real.
Seleccionar `email` por sí solo no habilita envíos.

No hay migraciones ni cambios en Usuario, Prisma, dependencias, roles o permisos.
Los cambios previos de hashing H06 permanecen; no se modifica algoritmo ni TTL.
H05 sigue siendo trabajo de otro compañero. No se modifica confirmRecovery ni se
atribuye a H07 una garantía de uso único concurrente inexistente en esta revisión.

## Proveedor anterior y evaluación de correo

`developmentPinRecoveryDelivery.sendCode` imprimía destinatario, código completo y
fecha de expiración en console.info. Se seleccionaba si NODE_ENV no era exactamente
production, incluida su ausencia, y además la selección ocurría al importar el
singleton antes de cargar dotenv. Se elimina por completo ese proveedor.

No se encontró SMTP ni infraestructura transaccional reutilizable en los módulos
actuales. `auth0Management.service.js:requestPasswordSetupEmail` utiliza
`/dbconnections/change_password` para enlaces de establecimiento de contraseña;
ese mecanismo existente no entrega el OTP generado por PinRecoveryChallenge.
No se reutilizó para un propósito distinto ni se añadió una dependencia de correo.
No se contactó a Auth0 ni a ningún destinatario durante la implementación.

## Configuración y comportamiento

La validación central de este flujo está en `src/config/pinDelivery.js`. Se ejecuta
antes de abrir el servidor y también al resolver el proveedor para una solicitud.
La resolución ocurre después de dotenv, sin fallback basado en modo no productivo.

| NODE_ENV | PIN_DELIVERY_PROVIDER | Resultado |
| --- | --- | --- |
| Ausente/vacío | Ausente, vacío o disabled | Backend puede iniciar; RF07 devuelve 503 |
| Ausente/vacío | email o test | Inicio rechazado |
| development | Ausente o disabled | RF07 devuelve 503; no salida a consola |
| development | email | Requiere adaptador real; sin él, 503 |
| development | test o console | Inicio rechazado |
| production | Ausente o disabled | RF07 devuelve 503; resto del backend disponible |
| production | email | Requiere adaptador real; sin él, 503 |
| production | test o console | Inicio rechazado |
| test | test | Requiere fake inyectado en el proceso; sin fake, inicio/configuración rechazado |
| Valor desconocido | Cualquiera | Inicio rechazado |

Los proveedores desconocidos se rechazan; `console` no existe. Los errores de
configuración contienen texto fijo, sin interpolar el valor de la variable.
`env.example` declara NODE_ENV=development y PIN_DELIVERY_PROVIDER=disabled.
No se modifica `.env` local, no se exige cambiar el esquema ni se conecta a la BD.

## Interfaces y mecanismo de prueba

Contrato del adaptador: `sendCode({ to, code, expiresAt }): Promise<void>`.
Se pasan exclusivamente destinatario, código y expiración del challenge existente
(15 minutos, sin cambiar su TTL). El adaptador futuro deberá enviar un mensaje
mínimo de recuperación con ese código y vigencia; nunca PIN anterior, hash, llave,
tokens ni datos adicionales. No debe registrar mensajes ni respuestas del proveedor.

`createPinRecoveryDelivery` admite `emailDelivery` como punto de integración futuro;
la instancia normal aún no tiene adaptador. No se consideran configuradas capacidades
que todavía no existen. El wrapper descarta cualquier respuesta del adaptador y
reemplaza sus excepciones por un error fijo, sin conservar message, cause o metadata.

El fake vive solo en `test/helpers/pinDeliveryFake.js`, fuera de las importaciones de
aplicación. `takeDelivery()` retira el último envío de una closure en memoria para
que el test pueda confirmar el código. No persiste, imprime ni publica nada.
El uso de testDelivery requiere NODE_ENV=test y PIN_DELIVERY_PROVIDER=test.
La inyección antigua `new PinService({ delivery: fake })` requiere ahora también
`deliveryEnvironment: { NODE_ENV: 'test', PIN_DELIVERY_PROVIDER: 'test' }`.

## Logging, respuestas y fallos

Solo se registran eventos estáticos de fallo:
- `pin_recovery_delivery_failure`
- `pin_recovery_delivery_status_failed` si falla el marcado del challenge

No incluyen OTP ni fragmentos, destinatario, PIN, vencimiento, hash, token, cuerpo,
respuesta del proveedor ni excepción. No se añade logging de éxito innecesario.
La solicitud exitosa responde 202 con `{ status: 'sent' }`; no devuelve el OTP.
La confirmación responde el estado de entrega del nuevo PIN, nunca el OTP.
El nuevo PIN se revela en su modal mediante RF06, comportamiento funcional existente.

Sin proveedor: 503 `PIN_RECOVERY_DELIVERY_UNAVAILABLE`.
Ante fallo del adaptador: 503 `PIN_RECOVERY_DELIVERY_FAILED`, mensaje fijo.
Se intenta marcar el challenge failed/used como antes. Si falla esa escritura,
se registra únicamente el evento fijo y se conserva la respuesta sanitizada.
La confirmación continúa seleccionando únicamente challenges delivered y no usados.
No se amplía el trabajo a la normalización general H08.

## Pruebas y límites

`pinDelivery.test.js` cubre la matriz de configuración, fake explícito, interfaz de
correo, expiración heredada, challenge sin código claro persistido, código válido,
inválido y vencido, PIN generado, rechazo de reutilización secuencial, respuestas HTTP
sin OTP y errores de proveedor/persistencia sin secretos. Un subproceso captura
stdout y stderr reales; ambos se comparan con salidas permitidas exactas.
Se prueba también el arranque real de app.js con production+test/console: termina
con error antes de abrir el servidor. Las pruebas usan datos sintéticos y adaptadores
inyectados, sin envíos reales ni modificaciones de datos externos.

Se conserva `pinDebug.test.js` para regresión de Soporte y `pinLifecycle.test.js`
para compatibilidad H06/RF06/RF07; este último solo adapta la inyección explícita.
Hay un TODO explícito para la regresión concurrente H05: no se declara verificada
hasta integrar la implementación del compañero. La reutilización secuencial sí se prueba.

Las comprobaciones de subprocesos necesitan ejecutarse fuera del sandbox de esta
sesión: dentro no se capturó su salida; fuera pasaron. La suite HTTP también requiere
abrir sockets locales. Esto no implica conexión con infraestructura del cliente.

Resultados finales:
- H07 específico: 26 pruebas aprobadas, 0 fallos y 1 TODO de H05.
- Backend completo: 626 entradas contadas por el runner; 625 aprobadas, 0 fallos,
  0 omitidas y 1 TODO (incluye las entradas de carga de los dos helpers de prueba).
- Frontend: 94 verificaciones declaradas por el runner y 2 entradas adicionales
  de node --test aprobadas.
- Build Vite aprobado; solo aviso informativo de tiempo de plugins CSS.
- git diff --check sin errores.

RF07 real sigue pendiente del proveedor externo. La ausencia del proveedor no
expone el código y no impide iniciar el resto del backend con configuración segura.
