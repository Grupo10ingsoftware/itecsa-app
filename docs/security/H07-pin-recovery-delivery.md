# H07 / RF07 — Entrega de recuperación de PIN con Resend

**Contexto histórico:** los resultados de pruebas documentan la revisión original. Las suites se retiraron el 03-10-2026; los comandos de esa revisión ya no están disponibles. Ver [validación de entrega](../desarrollo/PRUEBAS.md).

## Excepción temporal solicitada para desarrollo

Se conserva íntegramente Resend. Mientras se obtiene el dominio de la empresa, se permite seleccionar explícitamente:

```env
NODE_ENV=development
PIN_DELIVERY_PROVIDER=console
```

El `.env` local quedó configurado así, conservando API key y remitente para volver a Resend. Reiniciar el backend después del cambio. La consola del servidor muestra el código y su vencimiento con la etiqueta SOLO DESARROLLO, sin correo ni PIN. El usuario ingresa ese código en el modal existente. No se envía correo en este modo; el mensaje funcional de envío significa entrega por el proveedor seleccionado.

`console` se rechaza en producción, test o sin entorno; jamás se activa automáticamente ni cuando falla Resend. Resend/fake continúan sin registrar códigos. Quien pueda leer la consola de desarrollo puede usar el OTP durante su vigencia: usar cuentas de prueba y no centralizar ni compartir estos logs. **H07 permanece pendiente de cierre operativo mientras se use esta excepción**. Antes de producción, verificar el dominio y volver a `PIN_DELIVERY_PROVIDER=resend`.

Se añadieron `developmentConsolePinDelivery.js` y su suite: recuperación con OTP capturado, consumo secuencial único, salida mínima, rechazo fuera de desarrollo y ausencia de fallback. Backend completo tras el cambio: 683 pruebas declaradas, 682 pasan, 0 fallos y 1 TODO previo de H05.

## Implementación de Resend conservada

Actualización: 27-09-2026. Implementación local y tests completados; habilitación operacional pendiente. No se enviaron correos reales.

## Arquitectura

Antes existía una factory de entrega con `disabled`, `test` y `email`, sin adaptador de correo real. La salida insegura por consola ya había sido retirada en una corrección anterior.

Ahora: `PinService` → `createPinRecoveryDelivery` → `ResendPinDeliveryProvider` o `FakePinDeliveryProvider`. Se conserva la interfaz `sendCode({ to, code, expiresAt }): Promise<void>`, equivalente a `sendRecoveryCode({ email, code, expiresAt })`. El servicio de PIN no conoce API keys ni detalles HTTP.

Se usa la API HTTPS oficial con fetch nativo, como las integraciones Auth0 existentes del backend. **No se agregó el paquete resend ni otras dependencias**; no hay versión de SDK instalada. Referencia: [Resend: Send Email](https://resend.com/docs/api-reference/emails/send-email).

El adaptador realiza POST a `https://api.resend.com/emails`, Bearer backend, timeout de 10 segundos y rechazo de redirecciones. No reintenta automáticamente. Exige respuesta exitosa con ID de mensaje. Nunca devuelve el payload del proveedor ni propaga su error/cause. API key en campo privado, sin registro de headers o bodies.

El correo es texto plano: solicitud de recuperación, código, vencimiento absoluto UTC y aviso para ignorarlo si no se solicitó. No incluye PIN anterior/nuevo, contraseñas, RUT, pedidos ni datos Auth0.

## Configuración

```env
NODE_ENV=production
PIN_DELIVERY_PROVIDER=resend
RESEND_API_KEY=
PIN_EMAIL_FROM=
```

- `PIN_DELIVERY_PROVIDER=resend`: requiere API key y remitente no vacíos. Una configuración inválida rechaza el arranque antes de abrir el servidor.
- `RESEND_API_KEY`: secreto sólo backend, proporcionado por runtime; nunca frontend, Git o logs.
- `PIN_EMAIL_FROM`: dirección autorizada/verificada en Resend, opcionalmente con nombre visible. No hay dominio productivo predeterminado. El proveedor comprueba su autorización efectiva.
- Testing: `NODE_ENV=test`, `PIN_DELIVERY_PROVIDER=fake`. **Nunca utilizar el fake provider en producción.** Su constructor y la factory rechazan ambientes reales. Los tests pueden inyectarlo y consultar `messages`, sólo en RAM, sin escribir archivos ni imprimir mensajes.
- Proveedor omitido o `disabled`: recuperación indisponible (503), sin fallback. Se conserva esta opción explícita para deshabilitar RF07.
- `test`, `email` y valores desconocidos no son proveedores válidos. `console` es la excepción explícita de desarrollo descrita arriba. Migrar configuraciones anteriores a `fake` o `resend` según ambiente.

## Challenges y fallos

Se conserva generación aleatoria, hash/salt, vencimiento, verificación, nuevo PIN y revelación posterior. El código sólo existe en claro durante generación/envío y en memoria del fake en tests.

El challenge nace `pending`. Tras aceptación por la API pasa a `delivered`. En fallo de API, red, timeout, respuesta inválida o escritura del estado de éxito se intenta marcar `failed` y `used_at`. La confirmación sólo selecciona `delivered` sin uso. Si también falla guardar el estado de error, el challenge pendiente no es elegible. Se registran únicamente eventos constantes, sin datos personales ni errores crudos.

`delivered` significa aceptación por API, **no comprobación de recepción en bandeja**. Un timeout puede ocurrir después de que Resend acepte el mensaje: el código se invalida por seguridad y el usuario deberá solicitar otro. No hay webhooks ni confirmación de recepción implementados en esta tarea.

No se alteró H05. La revisión actual conserva un TODO de consumo concurrente; no se acredita atomicidad ni política de único challenge activo todavía. Los tests comprueban consumo secuencial único, código incorrecto y vencimiento. No se tocaron hash, AES, fingerprint, longitud ni TTL del PIN (H06).

## Pruebas y archivos

Nuevos: `src/modules/auth/service/resendPinDelivery.js`, `fakePinDelivery.js` y `test/resendPinDelivery.test.js` (rutas relativas a capaServidor).

Modificados: factory `pinDelivery.service.js`, configuración `config/pinDelivery.js`, `pin.service.js` (retirada de inyección específica email), `env.example`, tests de entrega/ciclo de vida y helpers de recuperación/fake. No hay cambios de esquema, dependencias, frontend ni permisos.

Tests cubren configuración ausente/inválida, fake prohibido en producción y arranque rechazado, fake sólo memoria, envío HTTPS único con campos mínimos, respuesta sin datos del proveedor, HTTP fallido, error de red, timeout simulado, JSON inválido, respuesta sin ID, invalidación del challenge y ausencia de OTP/API key/correo en respuestas y logs. RF07 cubre código generado contra hash, confirmación, PIN nuevo, código incorrecto, expiración y reutilización secuencial. La captura de stdout/stderr comprueba que no se imprimen OTP ni destinatarios con fake/Resend (la excepción console es deliberada y se prueba por separado).

Backend completo: **678 pruebas declaradas; 677 pasan, 0 fallos, 0 omitidas, 0 canceladas y 1 TODO preexistente de H05**. Frontend completo: 103 verificaciones y 2 entradas node:test exitosas, sin fallos. `git diff --check` sin errores. Todas las llamadas HTTP de Resend se simulan; npm test no envía correos ni consume cuota. Las pruebas de persistencia usan dobles locales, no BD real.

## Habilitación operacional y prueba manual opcional

**PENDIENTE OPERACIONAL: verificar dominio/remitente en Resend antes del despliegue productivo.**

1. Verificar el dominio y registros DNS indicados por Resend; seleccionar remitente autorizado.
2. Crear credencial de envío y almacenarla como secreto backend de runtime. Configurar las tres variables, sin pegarlas en tickets ni documentación.
3. Reiniciar y comprobar que el arranque valida la configuración. Mantener el acceso operativo al proveedor restringido, ya que procesa correos y códigos.
4. Con cuenta y destinatario de prueba controlados, solicitar recuperación desde el modal, revisar recepción y expiración, ingresar el código y comprobar que se muestra el PIN nuevo en el flujo existente.
5. Verificar que el código usado se rechaza y que API/logs no contienen OTP ni API key. Revisar disponibilidad, rechazo/bounce y límites desde el proveedor con acceso autorizado.

No se ejecutó esta prueba manual ni se configuraron secretos reales. No se considera acreditada la entrega productiva hasta completarla.
