# H08 — Política de errores HTTP

## Inventario previo a los cambios

| Tipo | Ejemplo/patrón encontrado | Puede exponerse | Debe ocultarse |
| --- | --- | --- | --- |
| Validación funcional local | Error con statusCode 400 y texto definido por la aplicación | Mensaje seguro, status, código | Valores del request, excepciones ajenas |
| Recurso ausente / conflicto / permiso | 404, 409, 403 de servicios | Semántica existente | Metadatos de persistencia |
| Excepción inesperada | `error.statusCode ?? 500` + `error.message` | Código genérico y requestId | Mensaje original, stack, query, modelo, rutas |
| Prisma | P2002/P2025 ya mapeados por repositorio de usuarios | Solo traducción funcional existente | meta, target, query, valores |
| Auth0 | Clase propia con code/status/details externos | Códigos explícitamente conocidos y mensaje fijo | details, respuesta externa y códigos arbitrarios |
| PIN y recuperación | Clases propias, status/code/message y spread de details | Códigos funcionales conocidos; retryAfterSeconds acotado | Errores criptográficos internos y cualquier otro details |
| Parser JSON / JWT | Manejador Express por defecto | 400/401/403 con texto fijo | body, token y stack dependiente de NODE_ENV |

Patrones observados:
- orders, payments, clients, messages, history, metrics, productionCapacity,
  productionLoad, productionCalendar y products: propagación de error.message,
  usualmente confiando en cualquier error.statusCode.
- auth: mensajes fijos para varios fallos; PIN propaga message/details de su clase;
  sin requestId. Logs de auth contienen metadatos específicos, fuera del middleware.
- admin users: varios 500 fijos; Auth0 devuelve code del proveedor y algunos campos
  técnicos; 201 recuperables por alta parcial se mantienen como negocio existente.
- demoOrders: validaciones explícitas con mensajes locales; errores no capturados
  dependen de Express. health: 500 fijo, log de error.code/name sin lista permitida.
- server/app: sin middleware propio final; Express 5 instalado admite rechazos async.
- frontend: utiliza payload.message, payload.code y retryAfterSeconds. ApiClient
  conserva payload; no necesita mensajes internos ni un campo error para funcionar.

## Implementación

`errors/AppError.js` es el tipo simple para errores funcionales construidos por la
aplicación. Se sustituyó únicamente su representación en servicios/repositorios
existentes: mismas condiciones, mensajes funcionales y status. No se cambian reglas
de creación, transiciones, permisos o datos. No basta asignar statusCode a un Error
arbitrario para hacerlo público.

`errors/httpErrors.js` contiene una única política compartida por respondError y
el middleware final errorHandler. Los controladores con catches existentes delegan
en respondError, para conservar también su invocación directa en pruebas; ya no
implementan una política distinta por módulo. Los errores no capturados y rechazos
async llegan al middleware final de Express 5, montado después de todas las rutas.
requestContext se monta antes de JSON, CORS y rutas. No se añade dependencia.

Errores funcionales tipados: status 4xx, code y message. Las respuestas 4xx explícitas
preexistentes con mensajes locales de validadores/autorización conservan su contrato
por compatibilidad; no se reinterpretan sus permisos ni condiciones.
Errores inesperados: 500 con exactamente code, message y requestId. Un AppError de
status 500 tampoco expone su mensaje. No hay ramas que devuelvan error.message en
un 500. La única lectura pública de error.message es para AppError funcional 4xx,
cuyo texto debe definirse dentro de la aplicación y nunca copiarse de dependencias.

Códigos de categorías: VALIDATION_ERROR, UNAUTHENTICATED, FORBIDDEN, NOT_FOUND,
ORDER_NOT_FOUND, CONFLICT, PAYMENT_CONFIRMATION_REQUIRED. Se conservan los códigos
funcionales PIN y el retryAfterSeconds cuando es entero entre 0 y 86400; se elimina
el spread de details. Los mensajes PIN se toman de una lista fija, incluso si la
instancia recibida contiene un message no confiable. Los errores criptográficos
internos de PIN pasan a INTERNAL_ERROR sin modificar la implementación del PIN.

Prisma: no hay conversión global de P2002 en conflicto. Se conserva la conversión
semántica existente del repositorio de usuarios (USER_ALREADY_EXISTS/USER_NOT_FOUND).
Un Prisma inesperado siempre produce INTERNAL_ERROR sin meta/target/query/stack.
Auth0: USER_EMAIL_ALREADY_EXISTS conserva conflicto; AUTH0_CONFIGURATION_ERROR y
AUTH0_INSUFFICIENT_SCOPE tienen 503 y mensajes fijos, manteniendo los códigos que
interpreta la UI; no se publican requiredScopes, details ni códigos externos libres.
El resto de errores Auth0 es INTERNAL_ERROR. Los 201 recuperables del alta parcial
se conservan sin alterar el negocio.

La falta/fallo de proveedor H07 mantiene 503 y sus códigos conocidos, con requestId
adicional; no se expone OTP ni correo. JSON mal formado y tamaño excesivo tienen
400/413 fijos. Errores del middleware JWT conservan 400/401/403 con mensajes fijos;
401 lleva un WWW-Authenticate fijo, nunca headers del error externo.

## Correlación y diagnóstico

requestId es un UUID v4 generado con randomUUID en backend. No se acepta el header
X-Request-Id del cliente. Un WeakMap conserva el identificador de la solicitud,
aunque otra capa cambie req.requestId. Se envía en X-Request-Id y en el cuerpo de
respuestas 5xx. Cada evento http_error usa exactamente el mismo requestId.

El evento contiene solamente requestId, tipo clasificado, código público, método
permitido, plantilla de ruta registrada, status y timestamp. Cuando aplica, añade
internalCode solo desde una lista cerrada de códigos Prisma/Auth0/PIN conocidos;
no copia códigos externos arbitrarios. Distingue también TypeError/SyntaxError/RangeError. No se registra la URL
concreta, baseUrl, query, parámetros, error.name arbitrario, message, stack, metadata,
headers, Authorization, body, datos de pedido, destinatario, PIN, OTP o tokens.
La plantilla evita registrar un RUT/correo colocado en la URL. Antes de reconocer
una ruta se usa unmatched. Los errores de un logger no cambian la respuesta segura.
Si la respuesta ya comenzó, se cierra la conexión sin pasar el error al logger por
defecto de Express, que podría imprimir detalles. No depende de NODE_ENV.

Se eliminaron los logs de excepciones crudas de los catches de clientes y estados
y se propagaron esos errores. Esto corrige la ruta de manejo de excepciones revisada;
no constituye una reforma global de logs de negocio/H14.

## Frontend y ejemplos

ApiClient conserva payload; las vistas ya leen payload.message y payload.code. No
se modifica su código de ejecución. Se agregaron seis verificaciones del cliente
HTTP para 400, 403, 404, 409, 423 y 500, incluyendo requestId y retryAfterSeconds.

Antes (prueba sintética):
```json
{"message":"SELECT users FROM secret_table /var/app/internal.js"}
```
Después:
```json
{"code":"INTERNAL_ERROR","message":"Ocurrio un error interno.","requestId":"c2a9360c-f09e-4d3c-9167-325636711b3f"}
```

## Límites y fuera de alcance

FUERA DE ALCANCE DE H08: clients.getClient contiene un mensaje de recurso equivocado
cuando no existe el cliente; orderStatus.getById consulta sin await antes de comprobar
existencia. No se corrigen esas decisiones funcionales. Tampoco se resuelve H05
concurrente ni se integra correo productivo H07 o el TTL pendiente de H06.
No se ejecutan migraciones ni consultas a BD/Auth0. Los cambios de H06/H07 presentes
antes de esta tarea se conservan; no deben atribuirse al diff nuevo de H08.

## Validación final

- 23 pruebas específicas H08 aprobadas: controladores de ocho módulos, auth/admin,
  400/403/404/409, Prisma sintético y constraint conocida, Auth0, PIN/OTP, UUID por
  request, logs correlacionados, async Express, parser JSON sin NODE_ENV, montaje
  real de Server, JWT, respuesta ya iniciada y lista permitida de diagnóstico.
- Backend completo: 649 pruebas/entradas del runner, 648 aprobadas, 0 fallos,
  0 omitidas y 1 TODO preexistente de concurrencia H05.
- Frontend: 100 verificaciones declaradas (incluidas 6 nuevas del contrato de errores)
  y 2 entradas adicionales de node --test aprobadas.
- Build Vite aprobado. git diff --check sin errores.
- Se actualizaron aserciones anteriores que esperaban mensajes 500 por módulo para
  exigir INTERNAL_ERROR/requestId; perfil inesperado pasa de 503 fijo a 500 genérico.
  La primera ejecución detectó siete diferencias de contrato, corregidas en esas
  aserciones sin debilitar las comprobaciones funcionales.
- Revisión estática: no quedan respuestas 500 directas con error.message/error.stack.
  Todas las salidas inesperadas de los controladores revisados usan la política común.
