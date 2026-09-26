# Orders: procedimiento de migracion pendiente

Estado al 26-09-2026: se inspecciono en solo lectura la base configurada `mydb`.
No se ha ejecutado ninguna migracion ni SQL de escritura desde el trabajo de
diagnostico. El responsable identifico la conexion como compartida o productiva;
el DDL sigue pendiente.
La persona responsable del producto confirmo que la NV es unica globalmente.

El codigo ahora detecta si faltan las cinco columnas de snapshot y omite esos
campos en lecturas y escrituras mientras no se aplique el DDL. Esto restablece
Kanban, el alta y las lecturas relacionadas, pero los nuevos detalles creados
en el esquema antiguo no conservan codigo y descripcion de origen. No sustituye
la migracion ni su indice unico. La nota 24886, inicialmente disponible, aparecio
registrada como pedido 73 con un detalle y una etapa de auditoria durante la
verificacion de la correccion. Reiniciar el backend despues de aplicar el DDL
para que vuelva a detectar el esquema completo.

## Incidente reproducido en `mydb`

- La misma lectura que alimenta Kanban (`OrderRepository.getAllOrders`) falla con
  Prisma `P2022`. Faltan fisicamente las cinco columnas de snapshot que selecciona.
- El alta nueva tambien intenta escribir esas columnas; su transaccion no puede
  completarse en el esquema actual. No se ejecuto POST real para evitar alterar datos.
- Hay 40 pedidos y 61 detalles. Los 40 pedidos tienen NV; no se detectaron NV
  vacias, alias `NV-AAAA-` ni grupos duplicados tras canonicalizar. La columna NV
  usa `utf8mb3_general_ci` y no tiene indice. No hay triggers en las cuatro tablas
  de alta inspeccionadas. Estados iniciales 1, tipos productivos y etiquetas de
  prioridad existen.
- El motor de la conexion inspeccionada informa MySQL 8.4.8.
- 34 de los 40 pedidos estan en etapas que el filtro actual del Kanban muestra;
  los otros 6 estan Cancelado. Por tanto, una vez reparada la consulta, la lista
  no deberia quedar vacia por falta de datos.
- El fixture tiene 60 notas: 40 ya registradas y 20 disponibles. Una NV real
  fuera del fixture seguira sin poder cargarse incluso despues del DDL. Falta la
  integracion Manager; `Nota_Venta` tampoco existe como tabla fisica alternativa.
- `_prisma_migrations` registra `0_init` y tres migraciones de agosto. Las
  migraciones de septiembre presentes en el repositorio no figuran aplicadas,
  aunque `Registros.observacion` y `Tipo_Producto.capacidad_diaria` ya existen
  fisicamente. La consulta agregada tampoco encontro filas con los nombres de
  rol antiguos cubiertos por las migraciones de septiembre. Por eso **no ejecutar
  `prisma migrate deploy` a ciegas**: la
  migracion de capacidad contiene `ADD COLUMN` sin `IF NOT EXISTS` y podria
  fallar antes de alcanzar la migracion Orders. Primero hay que reconciliar
  historial y esquema en una copia, con el responsable de la base.
- `prisma migrate status` confirmó la divergencia: seis migraciones locales
  pendientes (cinco de septiembre y la de Orders) y tres migraciones aplicadas
  en la base cuyos archivos no están en el repositorio. El último ancestro común
  es `0_init`. Hay que recuperar esos tres archivos históricos o establecer un
  baseline reconciliado antes de usar el flujo normal de Prisma Migrate.

Desde `capaServidor`, `npm run orders:preflight` reproduce lecturas y metadatos
sin escribir datos ni mostrar clientes. Marca el esquema como no listo y sale
con codigo no cero cuando faltan estructuras; tras un despliegue controlado
debe salir con codigo 0.

## Antes de aplicar

1. Identificar entorno, version MySQL, schema fisico, indices, triggers y respaldo
   recuperable. No usar `db push`, reset ni reproducir la migracion historica 0_init.
2. Inventariar Pedidos.numero_nota_venta: nulos, vacios, espacios, prefijos NV-AAAA-,
   duplicados y colisiones luego de aplicar el normalizador de la aplicacion.
   La revision debe agrupar por la clave canonica, no solo por el texto almacenado.
   Estas consultas son de solo lectura y ejemplos para un motor que admita
   expresiones regulares en `SELECT`; revisar version y collation antes de usar:

   ```sql
   SELECT COUNT(*) AS pedidos,
     SUM(numero_nota_venta IS NULL) AS sin_nv,
     SUM(numero_nota_venta IS NOT NULL AND TRIM(numero_nota_venta) = '') AS nv_vacia
   FROM Pedidos;

   WITH claves AS (
     SELECT id_pedido,
       CASE
         WHEN TRIM(numero_nota_venta) REGEXP '^[Nn][Vv]-[0-9]{4}-'
         THEN SUBSTRING(TRIM(numero_nota_venta), 9)
         ELSE TRIM(numero_nota_venta)
       END AS nv_canonica
     FROM Pedidos WHERE numero_nota_venta IS NOT NULL
   )
   SELECT nv_canonica, COUNT(*) AS pedidos
   FROM claves
   GROUP BY nv_canonica
   HAVING COUNT(*) > 1 OR nv_canonica = '';
   ```

   Revisar tambien colisiones segun la collation fisica del indice y comprobar
   cada ID implicado. Si el motor no admite esta sintaxis, construir una
   consulta de inspeccion equivalente; no usar la consulta como backfill.
3. Resolver colisiones con el responsable de datos. No borrar, fusionar ni renumerar
   pedidos automaticamente. Si hay cualquier colision, detener esta migracion.
4. Preparar y revisar un backfill especifico a los datos existentes para trim y
   alias NV-AAAA-. Ejecutarlo solo con autorizacion del entorno y respaldo.
   Los pedidos historicos sin NV permanecen NULL. No inventar una NV.
5. Revisar si triggers ya registran la creacion, para evitar duplicar el nuevo
   evento de aplicacion. Confirmar catalogos: estado de pedido 1 y pago 1.
6. En una BD desechable representativa, aplicar la migracion preparada, generar
   Prisma y probar concurrencia, rollback, lecturas antiguas y nuevas.

## Despliegue

Detener temporalmente las altas durante el backfill y la creacion del indice.
Verificar otra vez que no hay colisiones; aplicar exclusivamente la migracion
aditiva revisada. Generar el cliente Prisma y desplegar backend/frontend juntos.
El codigo nuevo requiere las columnas de snapshot: no desplegarlo antes del DDL.
La restriccion unica es la garantia de concurrencia; la consulta previa no basta.

## Datos y compatibilidad

Las columnas de snapshot de Detalle_pedido son nullable para historicos.
Cada nueva linea conserva codigo, descripcion, familia, subfamilia y una clave
compuesta por hash del snapshot normalizado y posicion dentro de ese snapshot.
La posicion no se usa como identidad a traves de versiones de la fuente.
No hay backfill automatico de lineas: requiere una fuente historica verificable.
Cobranzas usa snapshot cuando existe y mantiene su fallback para historicos.
La reevaluacion refresca el snapshot de los items que actualiza o agrega para no
presentar metadata obsoleta. Su correspondencia productiva por posicion y manejo
de lineas sobrantes siguen pendientes de auditoria transversal.

## Rollback

Revertir primero la aplicacion a una version compatible; conservar las columnas
aditivas y los snapshots ya escritos. No eliminar registros iniciales legitimos.
No quitar automaticamente el indice unico: protege una regla confirmada.
Cualquier reversion de DDL/backfill requiere otro procedimiento aprobado para
el entorno. Si la migracion falla, no desplegar el codigo que depende de ella.

## Verificaciones de aceptacion pendientes de entorno

- Dos POST concurrentes sobre una NV canonica: un pedido y un conflicto 409.
- Alias y reintento de la misma NV: ningun segundo pedido.
- Fallo en detalle, auditoria o notificaciones: rollback de todo el alta.
- Dos SKU del mismo tipo/cantidad: identidad persistida al releer.
- Datos historicos NULL: lectura compatible, sin snapshots inventados.
- Error P2002 de otra restriccion (por ejemplo RUT): no se presenta como NV duplicada.
