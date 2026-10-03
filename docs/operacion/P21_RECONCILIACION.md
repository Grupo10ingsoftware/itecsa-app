# P21: reconciliación de esquema y migraciones

Estado al 3 de octubre de 2026: **código y ensayos locales preparados; `mydb` sin cambios**.
La rama `audit/p21-schema-drift` incorporó `dev` en el commit `3078466` (base
`8947f66`). No ejecutar automáticamente `migrate deploy` sobre `mydb`: su
historial y su esquema requieren el procedimiento supervisado por ambiente que
se ensayó sólo en una copia local.

## Respaldo y estado actual de `mydb`

- Respaldo actualizado, ignorado por Git y con permisos `600`:
  `data/backups/p21-mydb-2026-10-03T19-52-24-454Z.sql.zst`. SHA-256:
  `d0ae3891e905a73c9fbb7c898e16401c2cb59a977f8f05a0ddbb6a728dff92a4`.
  Se creó con `mysqldump` por TLS y una instantánea transaccional; pasó
  `zstd -t` y se restauró en MySQL local 8.0.46. Contiene datos personales:
  custodiarlo localmente, sin adjuntarlo a Git ni tickets. El respaldo anterior
  de las 03:40 UTC se conserva, pero ya no representa el estado actual.
- La restauración produjo 27 tablas, seis migraciones registradas, 41 pedidos,
  62 detalles, 424 registros y 1359 eventos de auditoría. La copia se mantuvo
  aislada de `mydb`. La base local vacía se creó aparte.
- El schema actual tiene 27 modelos. En `mydb` existen 26 tablas de aplicación:
  `PrivacySubmission` aún no existe. La migración
  `202610020002_incident_report_audit` sí está registrada como aplicada; su
  checksum coincide con Git y sus columnas `event_key` y `metadata` existen.
- Siguen faltando los cinco snapshots de `Detalle_pedido` y el índice único de
  `Pedidos.numero_nota_venta`. Las 37 FKs coinciden estructuralmente; siete
  nombres de relación en Prisma se alinearon con los nombres físicos, sin
  renombrar restricciones en `mydb`.
- Las migraciones pendientes en `mydb` son el puente, observación, capacidad,
  tres normalizaciones de roles, Orders y PrivacySubmission. Observación y
  capacidad ya tienen efecto físico; no hay valores antiguos de rol cubiertos
  por esas tres migraciones. Se comprobó de nuevo que observación **no** está
  registrada como aplicada antes de corregir su SQL en Git.
- `Comentario_Produccion`, `Diseño`, `Diseño_Lanyard` y `Diseño_Tarjeta` siguen
  conservados. Sus cero filas observadas en este ambiente no prueban ausencia
  de uso o datos en otros lugares. El `ON UPDATE CURRENT_TIMESTAMP` de
  `Avance_Lanyard.fecha_actualizacion` se conserva.

## Excepción histórica: `security_hardening`

`mydb` registra para `202609260002_security_hardening` el checksum
`ef0f70738a8b1b63e8e89b52edda060c5d70c856d52a042bad3e35a5b67fedac`;
el archivo actual de Git tiene
`9b0e1ef7067f5634c234c4c677b8f9f7b5afb9bc0e1914d1f06d6813a1a8bd22`.
El archivo exacto que se ejecutó se perdió durante la historia de la BD y no se
puede recuperar. No sabemos si la diferencia era funcional o sólo textual.
No se modificó el archivo actual ni la fila de `_prisma_migrations`. La
comparación estructural final de la copia con una BD nueva no encontró otras
diferencias; esto acredita el **estado actual**, no reconstruye el SQL perdido.
La discrepancia de checksum queda como excepción documentada para aceptar o
rechazar explícitamente al cerrar P21.

## Reconstrucción desde cero

1. `20260901000000_reconcile_pre_september_schema` queda entre las migraciones
   PIN y la primera migración de septiembre. Su guarda exige que todas las
   tablas históricas estén vacías antes de transformar las tablas heredadas,
   crear las seis tablas operativas ausentes y retirar seis tablas documentales
   vacías. No se ejecuta sobre una BD existente con datos.
2. `20260904160000_add_registry_observation` usaba `ADD COLUMN IF NOT EXISTS`,
   sintaxis rechazada por MySQL 8.0. Como la única BD activa conocida es
   `mydb` y allí esta migración no está aplicada, se corrigió el archivo a
   `ADD COLUMN observacion TEXT NULL`. En una BD nueva el puente crea
   `Registros` sin esa columna; en la copia existente la columna ya existe y
   la migración se marca aplicada tras verificar su efecto, sin repetir el DDL.
3. `prisma migrate deploy` aplicó correctamente las **14 migraciones** en una
   BD local vacía, incluidas Orders, hardening, PrivacySubmission y auditoría
   de incidentes. Los 14 checksums registrados allí coinciden con Git.

## Ensayo de actualización en copia aislada

1. Se verificaron las estructuras previas, las columnas de observación y
   capacidad, y que no quedaban valores de rol antiguos. El preflight de NV
   encontró 41 pedidos, cero NV nulas o vacías, cero duplicados exactos y cero
   colisiones después de la normalización comprobada.
2. Sólo en la copia, `prisma migrate resolve --applied` registró el puente y las
   cinco migraciones de observación, capacidad y roles, cuyos efectos ya estaban
   presentes. `migrate status` dejó pendientes únicamente Orders y privacidad.
3. `prisma migrate deploy` aplicó **sólo** Orders y PrivacySubmission en la
   copia. Persisten los 41 pedidos, 62 detalles, 424 registros y 1359 eventos;
   los snapshots históricos permanecen NULL y la nueva tabla de privacidad
   está vacía. El índice único de NV quedó presente.
4. La copia y la reconstrucción vacía terminaron con metadatos idénticos:
   **27 tablas de aplicación, 174 columnas, 37 FKs y 79 entradas de índice**,
   comparando nombres, tipos, nulabilidad, colaciones y orden de índices. Se
   excluyó `_prisma_migrations` de esta comparación estructural.
5. Prisma Client leyó pedidos y auditoría; las lecturas reales de Kanban,
   historial y fuente de preview de pago funcionaron. Una escritura de snapshot
   y una de PrivacySubmission se leyeron dentro de una transacción de prueba
   que se revirtió. En la copia quedaron 14 migraciones aplicadas; la única
   discrepancia de checksum es hardening, descrita arriba.

## Validación y siguiente paso

- `prisma validate` y generación de Prisma Client 7.10.0: correctos.
- Backend: 845 tests, 843 aprobados, ninguno fallido y dos omitidos con la suite
  de integración MySQL desactivada. Las pruebas de socket se ejecutaron fuera
  del sandbox; los ensayos MySQL locales anteriores cubren la migración real.
- Frontend: ocho tests aprobados, build y lint correctos.
- Antes de cualquier cambio en `mydb`, obtener un respaldo **de ese momento**,
  repetir inventario y preflight, revisar el procedimiento con el responsable
  del ambiente y determinar el tratamiento de la excepción histórica. No usar
  `db push`, `migrate reset`, ni modificar checksums o filas históricas a mano.
- La estrategia de despliegue futuro documentada en P25 prevé una BD nueva sin
  trasladar filas de Aiven. Aun así, la cadena debe reconstruir completamente
  el esquema y los catálogos mínimos necesarios para operar; P21 prueba aquí
  la estructura, no la carga funcional de esos catálogos.
