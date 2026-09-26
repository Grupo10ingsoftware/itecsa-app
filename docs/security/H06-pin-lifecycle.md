# H06 — Implementación parcial sin cambios en Usuario

## Estado acordado

Se difiere el vencimiento del PIN pendiente a petición del usuario para evitar
cambios estructurales en Usuario mientras otros trabajos están en curso.
**H06 no está cerrado**: la copia pendiente sigue sin TTL y se elimina al aceptar,
invalidar o reemplazar el PIN, como antes de esta tarea.

Se retiraron la columna propuesta `pin_pending_expires_at` del esquema Prisma,
la migración no aplicada, la configuración de TTL, el barrido automático y la UI
de entrega vencida. El cliente Prisma se regenera con el esquema original.
No se alteraron tablas ni datos de la BD. La consulta diagnóstica previa fue solo
lectura de metadatos y confirmó que la columna propuesta no existía; esa diferencia
provocaba el error `pin_pending_cleanup_failed`.

## Cambio conservado: scrypt versionado

| Formato | N | r | p | Sal | Salida |
| --- | --- | --- | --- | --- | --- |
| v1 legado, base64 sin prefijo | 16384 | 8 | 1 | 16 bytes | 32 bytes |
| v2, `scrypt$v2$N=32768,r=8,p=3$<base64>` | 32768 | 8 | 3 | 16 bytes | 32 bytes |

El prefijo cabe en pin_hash existente (varchar 255); no necesita migración.
Los hashes legados siguen verificándose con sus parámetros originales; los nuevos
PIN usan v2. También se conservan válidos los v2 generados durante esta tarea.
Versiones desconocidas fallan cerradas. Se mantiene timingSafeEqual y scrypt
asíncrono de Node, sin dependencias adicionales ni rehash al validar.
La actualización a v2 ocurre al generar/restablecer el PIN; las cuentas que no
restablecen conservan v1. Los códigos de recuperación mantienen su hashing actual.
RF07 genera un PIN distinto al anterior. El PIN aceptado no puede volver a revelarse.
Se mantiene la longitud de seis dígitos y las capacidades actuales de Soporte.

La configuración v2 es una opción de
[OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
Memoria aproximada: 16 MiB antes, 32 MiB ahora, con maxmem de 64 MiB.
Medición local orientativa (tres derivaciones, suites simultáneas): 230 ms v1,
776 ms v2. No es un benchmark productivo. Auth0 no calcula este hash durante su
login; la provisión y las acciones con PIN sí asumen su coste adicional.

## PIN_SECRET y unicidad

PIN_SECRET sigue siendo una raíz de 32 bytes base64. HKDF-SHA256 separa claves con
contextos versionados: `itecsa-pin-encryption-v1` para AES-256-GCM y
`itecsa-pin-fingerprint-v1` para HMAC-SHA256. La versión de llaves v1 es independiente
del formato de hash v2. No se mostró la clave ni se cambió su valor.

Scrypt no depende de PIN_SECRET. Cambiar esta raíz conserva la verificación del
hash, pero impide descifrar pendientes y cambia fingerprints, afectando unicidad.
La rotación requiere un procedimiento coordinado: keyring versionado con comparación
bajo versiones activas y migración al presentar un PIN válido; o invalidación y
recuperación coordinada de credenciales bajo mantenimiento. No se implementa esa
rotación ni un secret manager en esta tarea.

RF11 exige PIN personal y único. Se conserva el fingerprint HMAC con restricción
UNIQUE y los reintentos por colisión. No hay decisión pendiente por falta de respaldo
funcional; modificar unicidad requeriría revisar RF11.

## Alcance y validación

H04/H05 están siendo trabajados por otro compañero. No se alteran los contadores ni
el consumo concurrente de códigos de recuperación. Su regresión concurrente queda
pendiente de integrar el trabajo de H05. No se declara resuelta esa brecha.

Se conservan pruebas para v1/v2, PIN incorrecto, bloqueo existente, RF06/RF07,
aceptación con borrado, errores de escritura, versiones desconocidas y respuestas
sin material criptográfico. Se retiran los tests de TTL porque esa funcionalidad
se ha diferido, no porque se considere cubierta.

Validación después de retirar TTL:
- Backend: 597/597 tests aprobados, 0 fallos, 0 omitidos.
- Frontend: runner de 94 verificaciones y 2 entradas adicionales aprobados.
- Prisma Client regenerado (7.9.1); su metadata ya no contiene la columna retirada.
- Comprobación local: todos los campos de una credencial v2 pertenecen al modelo
  Usuario original, sin conexión a BD ni escritura de datos.
- git diff --check sin errores. Reiniciar el backend para que cargue el cliente y
  código regenerados si había un proceso abierto.
