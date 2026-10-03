# P13: configuración HTTP y evidencia de despliegue

## Controles comprobados en el repositorio

- Express establece `X-Content-Type-Options: nosniff` y `Referrer-Policy: no-referrer` antes de CORS, parsers, estáticos y rutas; `X-Powered-By` está desactivado. El proxy debe conservar esos headers sin emitir valores contradictorios.
- CORS anuncia únicamente `FRONTEND_ORIGIN`. Esto controla lectura desde navegadores, no acceso directo ni abuso. La API HTTP no sirve el HTML de la SPA según el código versionado.
- `express.json()` limita JSON a `100kb` por defecto. No hay una ruta multipart activa identificada. El payload de alta de pedido admite una observación de origen de hasta 16.000 caracteres; medir pedidos reales antes de reducir el límite. El límite de bytes, conexiones y tiempos para otros tipos de cuerpo corresponde al perímetro hasta que se defina una ruta que los necesite.
- Tras JWT e identidad local activa se aplican cuotas por usuario: 120 lecturas o 30 escrituras por minuto. Reset de contraseña y recuperación PIN tienen cuotas propias por IP/cuenta. Producción utiliza `SecurityThrottle` compartido en MySQL; desarrollo y pruebas usan memoria. La disponibilidad de la tabla en la BD de destino debe verificarse antes del despliegue.
- `/api/health/live` es público y no consulta BD; `/api/health/db` devuelve 404. `/internal/ready` está deshabilitado por defecto, requiere `X-Health-Token` cuando se habilita y consulta BD. Mantenerlo en red interna.
- Los errores del parser y las excepciones pasan por el handler global. Las respuestas 413 y 5xx no incluyen cuerpos de solicitud, stack ni detalles de dependencias; los eventos internos se correlacionan con `X-Request-Id`.

## Decisiones pendientes del entorno

No hay configuración versionada que identifique el servidor de la SPA, el reverse proxy, la terminación TLS, sus headers, los consumidores de health ni el número de instancias. El ejemplo configura `TRUST_PROXY=0`. Antes de cambiarlo, confirmar la cadena de proxies y que el último proxy elimine `X-Forwarded-*` del cliente. Si no se confirma, mantener `0` y no tratar `req.ip` como IP final del usuario.

| Control | Decisión necesaria antes de activarlo | Criterio de verificación |
| --- | --- | --- |
| CSP de la SPA | Identificar servidor del HTML, dominios de SPA/API/Auth0 y origen de `profile.picture`; revisar recursos efectivos del login/callback. Iniciar con `Content-Security-Policy-Report-Only` allí, no en respuestas JSON de la API. | Probar login, callback, API e imágenes; revisar reportes antes de bloquear. |
| HSTS | Confirmar HTTPS permanente y punto de terminación TLS. El proxy que entrega HTTPS debe ser propietario del header. | Inspeccionar respuesta HTTPS pública y redirección HTTP; decidir `includeSubDomains` y `preload` sólo tras inventario. |
| Cuota anónima | Inventariar protección del borde para tokens inválidos, rutas desconocidas y health. Si falta, definir cuota por IP confiable antes de autenticación usando un almacén compartido; evitar duplicar la cuota del borde o cargar MySQL por cada sonda. | Probar 429 y `Retry-After`, recuperación de ventana, IP falsificada y varias instancias. |
| Health | Identificar intervalos y consumidores de ambas sondas. | Verificar desde la red del orquestador y negar acceso externo a readiness. |
| Límite de cuerpo | Medir pedidos legítimos y límites del proxy para tipos no JSON. | Probar el mayor payload válido y el rechazo 413 en el borde y Express. |

Sin esa evidencia no se declara P13 cerrado. Este documento registra decisiones técnicas pendientes; no acredita configuración productiva ni cambia el alcance de P10, P12, P23 o P25.

## Evidencia local de esta rama

- `npm test` en `capaServidor`: 859 pruebas aprobadas, 2 omitidas, 0 fallidas. `test/p13.http.test.js` verifica respuestas HTTP reales: headers en 200/401/404/413/500, CORS y preflight, liveness, readiness sin token, JSON de 90 KB aceptado por el parser, JSON de 110 KB rechazado con 413, 429 con `Retry-After` y recuperación de ventana, IP con y sin proxy confiable, y 500 sin detalle interno.
- `npm test`, `npm run lint` y `npm run build` en `capaVista`: aprobados. Estas pruebas no sustituyen un login/callback real contra el tenant Auth0 ni una inspección del proxy público.
- Ejemplos del contrato local: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`; el 413 devuelve `PAYLOAD_TOO_LARGE` y mensaje fijo, y el 429 devuelve `RATE_LIMITED` con `Retry-After`. `X-Request-Id` correlaciona el 500 con el evento de servidor sin incluir el mensaje original.
