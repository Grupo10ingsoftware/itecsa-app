# P21: reconciliación de esquema y migraciones

Estado al 3 de octubre de 2026: **reconciliación preparada, despliegue bloqueado**.
No ejecutar `prisma migrate deploy`, `migrate resolve`, `db push` ni SQL de este
procedimiento sobre `mydb`. Las comprobaciones de ejecución descritas aquí se
hicieron sólo en bases locales descartables, sin acceso de red.

## Evidencia y respaldo

- Rama: `audit/p21-schema-drift`, basada en `dev` `b600561`.
- Ambiente leído: `mydb` en el MySQL de desarrollo Aiven 8.4.8. Se consultaron
  metadatos y agregados, sin leer contenido de filas ni modificar datos.
- Respaldo lógico local: `data/backups/p21-mydb-2026-10-03T03-40-51-422Z.sql.zst`.
  La carpeta y el archivo tienen permisos `700` y `600`, respectivamente, y
  están ignorados por Git. SHA-256:
  `19ceeb8fa2f962755ccd127571a7424ba54a3bf2f6ed6ab4612325f757ac1b3e`.
  `mysqldump` terminó correctamente con una instantánea transaccional; el
  archivo pasó `zstd -t` y se restauró en un MySQL local 8.0.46 sin red.
  La restauración produjo 27 tablas, cinco filas de `_prisma_migrations`,
  41 pedidos, 418 registros, 1307 eventos de seguridad y 27 desafíos PIN,
  iguales a los conteos observados al exportar. El archivo contiene datos
  personales: no adjuntarlo a Git, tickets ni mensajes.

## Estado físico e historial

- Los 26 modelos de `schema.prisma` tienen tabla física. Se verificaron 37
  relaciones foráneas estructuralmente equivalentes. Siete nombres de FK
  diferían en Prisma; se alinearon los `map` del schema a los nombres físicos,
  sin DDL en `mydb`.
- Faltan físicamente cinco columnas de snapshot en `Detalle_pedido` y el índice
  único `Pedidos_numero_nota_venta_UNIQUE`. La migración versionada
  `202609260001_orders_integrity` los define, pero no está aplicada. Los 41
  pedidos tenían NV no vacía; no se detectaron grupos duplicados exactos ni
  tras la normalización comprobada. Repetir preflight antes de cualquier DDL.
- `Comentario_Produccion`, `Diseño`, `Diseño_Lanyard` y `Diseño_Tarjeta` tienen
  cero filas en este ambiente. Esto no demuestra ausencia de datos o uso en
  otros ambientes. No se retiran sus modelos ni tablas.
- Las migraciones registradas como terminadas son `0_init`, retiro de firmas,
  las dos de PIN y `202609260002_security_hardening`. Los primeros cuatro
  checksums coinciden con Git. El checksum registrado para hardening es
  `ef0f70738a8b1b63e8e89b52edda060c5d70c856d52a042bad3e35a5b67fedac`;
  el archivo versionado tiene
  `9b0e1ef7067f5634c234c4c677b8f9f7b5afb9bc0e1914d1f06d6813a1a8bd22`.
  El SQL exacto aplicado no se encontró en Git ni en los archivos locales
  revisados. Recuperarlo del artefacto de despliegue; no alterar la fila de
  Prisma ni inventar un archivo que coincida con el checksum.
- Siguen sin registrar seis migraciones versionadas: observación de
  `Registros`, capacidad diaria, tres normalizaciones de roles y Orders.
  `Registros.observacion` y `Tipo_Producto.capacidad_diaria` ya existen
  físicamente, y no hay filas con los valores antiguos de rol comprobados.
- El campo `Avance_Lanyard.fecha_actualizacion` tiene `ON UPDATE
  CURRENT_TIMESTAMP` en MySQL; Prisma no representa ese comportamiento en el
  campo. Se conserva tal como está hasta comprobar su efecto en escrituras.

## Secuencia propuesta: instalación nueva

1. Partir de una BD local vacía y descartable. Aplicar, en orden, `0_init`,
   retiro de firmas y las dos migraciones PIN. Comprobar que no hay filas.
2. Aplicar `20260901000000_reconcile_pre_september_schema`. Su guarda exige
   que el esquema histórico esté vacío. Comparar inmediatamente las seis
   tablas operativas nuevas, las tablas heredadas transformadas y las FKs con
   el estado esperado antes de septiembre.
3. Resolver **antes de continuar** la sintaxis inválida de
   `20260904160000_add_registry_observation`. Primero inventariar todos los
   ambientes: si alguna BD ya la aplicó, no editar su archivo. Si no se puede
   demostrar una solución que conserve checksums y reconstruya desde cero,
   detener la instalación nueva y acordar un historial de migraciones nuevo.
4. Con esa resolución comprobada, aplicar observación, capacidad diaria y las
   tres normalizaciones de roles en el orden versionado; luego Orders y
   hardening. Recuperar previamente el SQL original de hardening y verificar
   su checksum. No sustituirlo por el SQL actual sin conocer su efecto.
5. Ejecutar `migrate deploy` desde cero como prueba final, sin intervención
   manual. Comparar tablas, 160 columnas, 37 FKs, índices y checksums con el
   schema final; generar Prisma Client y probar lecturas y escrituras. El
   ensayo manual local del puente no reemplaza esta prueba.

## Secuencia propuesta: copia del ambiente existente

1. Crear una copia aislada y confirmar que el respaldo se restaura. Inventariar
   allí versión de MySQL, datos, tablas, columnas, FKs, índices y cada fila de
   `_prisma_migrations`; repetir el inventario para cada ambiente adicional.
2. Resolver la discrepancia de hardening mediante el SQL exacto aplicado y su
   checksum. Comparar su efecto con el archivo versionado. Si no se recupera,
   detener la conciliación del historial; no alterar SQL aplicado ni la fila
   de Prisma para hacer coincidir un hash.
3. Comprobar el efecto físico de cada migración pendiente. En la copia de
   `mydb`, el puente y las cinco migraciones de observación, capacidad y roles
   ya tienen efecto equivalente. Sólo después de verificarlo por separado,
   registrarlas como aplicadas mediante el procedimiento documentado de
   Prisma. No ejecutar sus DDL de nuevo. Este paso aún **no se ha realizado**.
4. Repetir inmediatamente el preflight de NV y resolver cualquier colisión con
   su responsable. Con preflight limpio, aplicar sólo Orders en la copia.
   Comprobar los cinco snapshots nullable, el índice único y que las líneas
   históricas permanezcan sin valores inventados.
5. Probar Kanban, historial, preview de pago y nuevas escrituras de snapshots;
   comparar esquema y checksums finales. Sólo después diseñar el procedimiento
   supervisado para cada BD existente. No ejecutar `migrate deploy` sobre
   `mydb` como consecuencia automática de este ensayo.

## Migración puente y ensayo local

`20260901000000_reconcile_pre_september_schema` es una nueva migración que
se ordena después de PIN y antes de la primera migración que altera
`Registros`. En una base nueva crea las seis tablas operativas ausentes de la
cadena, transforma las tres tablas de registros antiguas y retira las seis
tablas documentales heredadas sólo después de comprobar que están vacías.
Incluye una guarda inicial que falla si las tablas operativas ya existen o si
cualquier tabla histórica tiene filas. **No se debe ejecutar en una BD
existente:** requiere inventario y conciliación supervisada por ambiente.

Ensayo en MySQL local 8.0.46:

1. `0_init`, retiro de firmas y las dos migraciones PIN se aplicaron desde cero.
2. El puente se aplicó. Al intentar aplicarlo a la copia restaurada, falló en
   la guarda antes de ejecutar DDL persistente.
3. La migración versionada `20260904160000_add_registry_observation` falló con
   error de sintaxis `1064`: MySQL 8.0 rechaza `ADD COLUMN IF NOT EXISTS`.
   **Bloqueo adicional de la cadena limpia.** No se editó ese SQL histórico;
   se desconoce si está aplicado en otros ambientes.
4. Sólo para continuar el diagnóstico local, se agregó manualmente
   `Registros.observacion` en la BD descartable. Las migraciones posteriores
   se aplicaron allí. Su esquema final coincide con la copia restaurada en
   tablas, columnas, FKs e índices, excepto exactamente los cinco snapshots y
   el índice único que Orders añade. Esto prueba el contenido del puente,
   **no** una reconstrucción automática completa de Prisma Migrate.
5. Se repitió la cadena inicial y el puente en otra BD local vacía tras reforzar
   la guarda; se creó el esquema esperado. En la copia restaurada se repitió
   el preflight de NV: 41 pedidos, cero nulos/vacíos y cero colisiones exactas o
   canónicas. Allí se aplicó sólo `202609260001_orders_integrity`: aparecieron
   los cinco snapshots y el índice único, y los históricos quedaron NULL.
   Prisma Client leyó 41 pedidos y 62 detalles; una escritura de snapshot se
   leyó correctamente dentro de una transacción que se revirtió.
6. Tras Orders, la reconstrucción local y la copia restaurada tienen metadatos
   idénticos: 26 tablas de aplicación, 160 columnas, 37 FKs y 76 entradas de
   índice, incluidos nombres, tipos, nulabilidad, colaciones y orden de índice.
   Se excluyó `_prisma_migrations` de esta comparación estructural porque los
   ensayos SQL locales no registraron filas de Prisma Migrate.

## Validación de código

- `prisma validate` y generación de Prisma Client: correctos.
- Backend: 861 tests, 859 aprobados, cero fallos y dos omitidos con la suite de
  integración MySQL desactivada. Las pruebas que abren sockets requieren correr
  fuera del sandbox de ejecución, pues éste impide el bind local.
- Frontend: tests, build y lint correctos. `git diff --check` sin errores.

## Puertas antes de desplegar

1. Recuperar el archivo exacto de hardening cuyo checksum ya está aplicado.
   Si no aparece, detener el cierre de P21 y acordar con los responsables un
   procedimiento de historial nuevo sin falsificar migraciones.
2. Inventariar `_prisma_migrations`, columnas, índices, FKs y datos por cada
   ambiente; comprobar especialmente si la migración de observación se aplicó
   en alguno. Su sintaxis debe tener una resolución explícita antes de afirmar
   que una base vacía se reconstruye con `migrate deploy`.
3. Ensayar toda decisión sobre migraciones históricas en una base nueva y en
   una copia aislada del ambiente. Ninguna marca `--applied` se decide sólo por
   nombre o por presencia de una columna: verificar efecto físico y checksum.
4. Repetir preflight de NV, probar el respaldo y ensayar Orders en la copia.
   Confirmar snapshots e índice único; conservar históricos sin backfill
   inferido. Desplegar una aplicación compatible antes de cualquier DDL que
   requiera transición.
5. Conservar resultados de `prisma validate`, generación de Client, pruebas de
   pedidos, PIN, historial y pagos, build/lint, reconstrucción limpia y
   migración de copia. Un `schema.prisma` válido no cierra P21 por sí solo.
