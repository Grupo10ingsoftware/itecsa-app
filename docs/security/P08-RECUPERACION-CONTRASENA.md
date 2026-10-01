# P08 — Recuperación sin exposición del estado de cuentas

Primera iteración de la auditoría del 30-09-2026. Revisión: 01-10-2026. El informe auditó `2514160458ff86a92933daa83148e99ccaefb673`; esta revisión parte de `c12c7b2`, que ya incorporaba respuesta genérica, espera mínima y cuotas revisadas.

## Contrato público

Una solicitud con cuerpo y correo válidos devuelve HTTP `202` y exactamente:

```json
{
  "status": "accepted",
  "message": "Si la cuenta está activa, enviaremos las instrucciones de recuperación al correo indicado."
}
```

Se aplica a cuenta activa, inexistente, desvinculada, pendiente, error de consulta y error de entrega. Solo la cuenta activa provoca una solicitud a Auth0. `accepted` no confirma que se envió un correo. El frontend utiliza un aviso informativo; los errores de solicitud utilizan el estilo de advertencia, sin variantes visuales por estado de cuenta.

La validación conserva `400` y las cuotas conservan `429`; estos resultados dependen del cuerpo y de intentos, no de la existencia de una cuenta. Las cuotas actuales son 10 solicitudes/IP y 3/correo normalizado cada 15 minutos. La implementación usa persistencia compartida en producción y memoria acotada en desarrollo/test. Su operación pertenece a P10 y debe verificarse en el ambiente correspondiente.

## Diagnóstico y tiempos

Los resultados `not_registered`, `disabled`, `sent`, `lookup_error` y `delivery_error` se utilizan únicamente en telemetría del servidor. No se guarda el correo ni el texto de excepciones. La correlación usa HMAC con `SECURITY_LOG_HMAC_KEY` o `RATE_LIMIT_SECRET`; sin clave se registra `unavailable`. Acceso y conservación del sink deben configurarse operativamente. Un fallo sincrónico del sink conserva la respuesta y espera públicas.

Se conserva el piso temporal existente: 600 ms más jitter de 0–199 ms. El cálculo usa reloj monotónico para evitar cambios de hora durante una solicitud. Las pruebas verifican la misma espera total con dependencias que terminan dentro del piso. No demuestran indistinguibilidad temporal cuando la consulta o Auth0 lo exceden: entonces la respuesta espera esa operación. No se incrementó arbitrariamente el piso ni se agregó una cola no durable de correo.

## Evidencia local

```sh
cd capaServidor
node --import ./test/setup.mjs --test test/passwordResetPrivacy.test.js test/auth.routes.test.js
```

32 pruebas aprobadas. La nueva suite cubre igualdad HTTP de status, cuerpo, tipo y longitud para seis resultados privados; espera con reloj controlado; operación lenta; diagnóstico mínimo; fallo del sink. La suite previa cubre validación, normalización, ruta pública y cuotas. Los datos son sintéticos; Auth0 y persistencia se sustituyen por dobles.

Validación de regresión en esta iteración: `npm test` backend con 794 aprobadas, cero fallos y dos pruebas de integración MySQL omitidas; `npm test`, `npm run build` y `npm run lint` frontend aprobados; `git diff --check` aprobado. Las comprobaciones no validan un envío real ni aplican migraciones a una base externa.

## Verificación de despliegue pendiente

- Comparar distribuciones de latencia para cuentas de prueba activas e inexistentes con proveedor, red y proxy reales. Si los tiempos distinguen cuentas, evaluar desacoplar el envío mediante un mecanismo durable que responda igual antes del procesamiento.
- Confirmar que proxy y API no agregan respuestas, cabeceras o redirects basados en existencia de cuenta.
- Verificar que telemetría y cuotas tienen clave administrada, acceso restringido y conservación definida.

Estado: mitigación de enumeración por respuesta verificada localmente; la comprobación temporal y operativa del despliegue sigue pendiente. No declara conformidad normativa ni entrega real de correos.
