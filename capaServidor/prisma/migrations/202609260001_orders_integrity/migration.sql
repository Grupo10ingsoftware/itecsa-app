-- PRECONDICION: seguir docs/ORDERS_MIGRACION.md, canonicalizar y resolver
-- colisiones existentes con autorizacion. No ejecutar automaticamente.
-- Esta migracion es aditiva; no reconstruye datos comerciales historicos.
ALTER TABLE `Detalle_pedido`
  ADD COLUMN `linea_origen` VARCHAR(100) NULL,
  ADD COLUMN `codigo_origen` VARCHAR(50) NULL,
  ADD COLUMN `producto_origen` VARCHAR(255) NULL,
  ADD COLUMN `familia_origen` VARCHAR(100) NULL,
  ADD COLUMN `subfamilia_origen` VARCHAR(100) NULL;

CREATE UNIQUE INDEX `Pedidos_numero_nota_venta_UNIQUE`
  ON `Pedidos` (`numero_nota_venta`);
