# Orders: procedimiento de migracion pendiente

Estado: preparacion local. No se ha conectado ni migrado una base de datos.
La persona responsable del producto confirmo que la NV es unica globalmente.

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
