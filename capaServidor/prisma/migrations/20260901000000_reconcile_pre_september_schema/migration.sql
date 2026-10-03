-- Bridge the historical 0_init/PIN state to the schema used before the
-- September migrations. This file is intentionally ordered before the first
-- migration that alters Registros. It is for an empty reconstruction only.
-- Existing databases must be inventoried and reconciled separately; never
-- run this bridge against one that already contains operational tables.

-- Fail before any persistent DDL if the bridge has already been performed,
-- or if any historical table contains data. This bridge is only for an
-- entirely empty reconstruction, including the tables it keeps.
CREATE TEMPORARY TABLE `_p21_empty_guard` (`id` INT PRIMARY KEY);
INSERT INTO `_p21_empty_guard` VALUES (1);
INSERT INTO `_p21_empty_guard` SELECT 1 FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN
    ('Registros', 'Mensaje', 'MENSAJE_USUARIO', 'Avance_Lanyard',
     'Pedido_Etiqueta', 'Pedido_Item_Sin_Seguimiento') LIMIT 1;
INSERT INTO `_p21_empty_guard` SELECT 1 FROM `Anuncio` LIMIT 1;
INSERT INTO `_p21_empty_guard` SELECT 1 FROM `Documento` LIMIT 1;
INSERT INTO `_p21_empty_guard` SELECT 1 FROM `Ficha_Cliente` LIMIT 1;
INSERT INTO `_p21_empty_guard` SELECT 1 FROM `Historial_Usuario` LIMIT 1;
INSERT INTO `_p21_empty_guard` SELECT 1 FROM `Nota_Venta` LIMIT 1;
INSERT INTO `_p21_empty_guard` SELECT 1 FROM `Orden_Produccion` LIMIT 1;
INSERT INTO `_p21_empty_guard` SELECT 1 FROM `Registro_Etapas` LIMIT 1;
INSERT INTO `_p21_empty_guard` SELECT 1 FROM `Registro_Pago` LIMIT 1;
INSERT INTO `_p21_empty_guard` SELECT 1 FROM `registro_subprocesos` LIMIT 1;
INSERT INTO `_p21_empty_guard` SELECT 1 FROM `Cliente` LIMIT 1;
INSERT INTO `_p21_empty_guard` SELECT 1 FROM `Comentario_Produccion` LIMIT 1;
INSERT INTO `_p21_empty_guard` SELECT 1 FROM `Detalle_pedido` LIMIT 1;
INSERT INTO `_p21_empty_guard` SELECT 1 FROM `Diseño` LIMIT 1;
INSERT INTO `_p21_empty_guard` SELECT 1 FROM `Diseño_Lanyard` LIMIT 1;
INSERT INTO `_p21_empty_guard` SELECT 1 FROM `Diseño_Tarjeta` LIMIT 1;
INSERT INTO `_p21_empty_guard` SELECT 1 FROM `Estado_Pago` LIMIT 1;
INSERT INTO `_p21_empty_guard` SELECT 1 FROM `Estado_Pedido` LIMIT 1;
INSERT INTO `_p21_empty_guard` SELECT 1 FROM `Estado_Subprocesos` LIMIT 1;
INSERT INTO `_p21_empty_guard` SELECT 1 FROM `Pedidos` LIMIT 1;
INSERT INTO `_p21_empty_guard` SELECT 1 FROM `Producto_Subproceso` LIMIT 1;
INSERT INTO `_p21_empty_guard` SELECT 1 FROM `Tipo_Producto` LIMIT 1;
INSERT INTO `_p21_empty_guard` SELECT 1 FROM `Usuario` LIMIT 1;
INSERT INTO `_p21_empty_guard` SELECT 1 FROM `etiqueta` LIMIT 1;

-- These six old document/announcement tables are empty after 0_init on a new
-- database. The signature tables were removed by the preceding migration.
DROP TABLE `Ficha_Cliente`;
DROP TABLE `Nota_Venta`;
DROP TABLE `Orden_Produccion`;
DROP TABLE `Documento`;
DROP TABLE `Anuncio`;
DROP TABLE `Historial_Usuario`;

-- The shared database was created with utf8mb3_general_ci for these legacy
-- tables. Keep its comparison semantics, especially for the later NV index.
ALTER TABLE `Cliente` CONVERT TO CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;
ALTER TABLE `Comentario_Produccion` CONVERT TO CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;
ALTER TABLE `Detalle_pedido` CONVERT TO CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;
ALTER TABLE `Diseño` CONVERT TO CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;
ALTER TABLE `Diseño_Lanyard` CONVERT TO CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;
ALTER TABLE `Diseño_Tarjeta` CONVERT TO CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;
ALTER TABLE `Estado_Pago` CONVERT TO CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;
ALTER TABLE `Estado_Pedido` CONVERT TO CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;
ALTER TABLE `Estado_Subprocesos` CONVERT TO CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;
ALTER TABLE `Pedidos` CONVERT TO CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;
ALTER TABLE `Producto_Subproceso` CONVERT TO CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;
ALTER TABLE `Tipo_Producto` CONVERT TO CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;
ALTER TABLE `Usuario` CONVERT TO CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;
ALTER TABLE `etiqueta` CONVERT TO CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;

ALTER TABLE `Estado_Pago`
  CHANGE COLUMN `id_estado_Pago` `id_estado_pago` INT NOT NULL AUTO_INCREMENT;

ALTER TABLE `Pedidos`
  ADD COLUMN `observacion` TEXT NULL,
  ADD COLUMN `numero_nota_venta` VARCHAR(50) NULL,
  ADD COLUMN `usuario_manager_origen` VARCHAR(100) NULL,
  ADD COLUMN `observacion_origen` TEXT NULL,
  ADD COLUMN `observacion_interna` TEXT NULL,
  DROP FOREIGN KEY `id_cliente`,
  ADD CONSTRAINT `Pedidos_Cliente_FK` FOREIGN KEY (`id_cliente`)
    REFERENCES `Cliente` (`id_cliente`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `Pedidos_Estado_Pago_FK` FOREIGN KEY (`id_estado_pago`)
    REFERENCES `Estado_Pago` (`id_estado_pago`) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `Detalle_pedido`
  ADD COLUMN `id_estado_subproceso` INT NULL,
  ADD INDEX `Detalle_pedido_Estado_Subprocesos_FK` (`id_estado_subproceso`),
  DROP FOREIGN KEY `id_pedido`,
  DROP FOREIGN KEY `id_tipo_producto`,
  ADD CONSTRAINT `Detalle_pedido_Pedidos_FK` FOREIGN KEY (`id_pedido`)
    REFERENCES `Pedidos` (`id_pedido`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `Detalle_pedido_Tipo_Producto_FK` FOREIGN KEY (`id_tipo_producto`)
    REFERENCES `Tipo_Producto` (`id_tipo_producto`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `Detalle_pedido_Estado_Subprocesos_FK` FOREIGN KEY (`id_estado_subproceso`)
    REFERENCES `Estado_Subprocesos` (`id_estado_subproceso`) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `Comentario_Produccion`
  DROP FOREIGN KEY `fk_cp_detalle_pedido`,
  ADD CONSTRAINT `Comentario_Produccion_Detalle_pedido_FK`
    FOREIGN KEY (`id_detalle_pedido`) REFERENCES `Detalle_pedido` (`id_detalle_pedido`)
    ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `Diseño`
  DROP FOREIGN KEY `id_detalle_pedido`,
  ADD CONSTRAINT `Diseño_Detalle_pedido_FK`
    FOREIGN KEY (`id_detalle_pedido`) REFERENCES `Detalle_pedido` (`id_detalle_pedido`)
    ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `Producto_Subproceso`
  DROP FOREIGN KEY `fk_Producto_Subproceso_tipo_producto`,
  ADD CONSTRAINT `Producto_Subproceso_Tipo_Producto_FK`
    FOREIGN KEY (`id_tipo_producto`) REFERENCES `Tipo_Producto` (`id_tipo_producto`)
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- 0_init used independent register IDs. These tables are proven empty above;
-- the operational schema instead uses Registros as their shared parent.
DROP TABLE `Registro_Etapas`;
DROP TABLE `Registro_Pago`;
DROP TABLE `registro_subprocesos`;

CREATE TABLE `Registros` (
  `ID_REGISTRO` INT NOT NULL AUTO_INCREMENT,
  `FECHA_HORA` TIMESTAMP NOT NULL COMMENT 'Fecha y hora en la que se realizó el registro',
  `id_pedido` INT NULL,
  `id_usuario` INT NULL,
  PRIMARY KEY (`ID_REGISTRO`),
  INDEX `Registros_Pedidos_FK` (`id_pedido`),
  INDEX `Registros_Usuario_FK` (`id_usuario`),
  CONSTRAINT `Registros_Pedidos_FK` FOREIGN KEY (`id_pedido`)
    REFERENCES `Pedidos` (`id_pedido`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `Registros_Usuario_FK` FOREIGN KEY (`id_usuario`)
    REFERENCES `Usuario` (`id_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION
) DEFAULT CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;

CREATE TABLE `Registro_Etapas` (
  `id_registro` INT NOT NULL,
  `fecha_hora_entrada` DATETIME NULL,
  `fecha_hora_salida` DATETIME NULL,
  `id_estado_pedido` INT NULL,
  PRIMARY KEY (`id_registro`),
  INDEX `id_estado_pedido_idx` (`id_estado_pedido`),
  CONSTRAINT `Registro_Etapas_Estado_Pedido_FK` FOREIGN KEY (`id_estado_pedido`)
    REFERENCES `Estado_Pedido` (`id_estado_pedido`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `Registro_Etapas_Registros_FK` FOREIGN KEY (`id_registro`)
    REFERENCES `Registros` (`ID_REGISTRO`) ON DELETE NO ACTION ON UPDATE NO ACTION
) DEFAULT CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;

CREATE TABLE `Registro_Pago` (
  `id_registro` INT NOT NULL,
  `fecha_registro` DATETIME NULL,
  `observacion` LONGTEXT NULL,
  `id_estado_pago_anterior` INT NULL,
  `id_estado_pago_nuevo` INT NULL,
  PRIMARY KEY (`id_registro`),
  INDEX `id_estado_pago_idx` (`id_estado_pago_anterior`),
  INDEX `Registro_Pago_Estado_Pago_FK` (`id_estado_pago_nuevo`),
  CONSTRAINT `Registro_Pago_Estado_Pago_FK` FOREIGN KEY (`id_estado_pago_nuevo`)
    REFERENCES `Estado_Pago` (`id_estado_pago`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `Registro_Pago_Estado_Pago_FK_1` FOREIGN KEY (`id_estado_pago_anterior`)
    REFERENCES `Estado_Pago` (`id_estado_pago`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `Registro_Pago_Registros_FK` FOREIGN KEY (`id_registro`)
    REFERENCES `Registros` (`ID_REGISTRO`) ON DELETE NO ACTION ON UPDATE NO ACTION
) DEFAULT CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;

CREATE TABLE `registro_subprocesos` (
  `id_registro` INT NOT NULL,
  `fecha_hora_entrada` DATETIME NULL,
  `fecha_hora_salida` DATETIME NULL,
  `id_detalle_pedido` INT NULL,
  `id_estado_subproceso` INT NULL,
  PRIMARY KEY (`id_registro`),
  INDEX `id_estado_subproceso_idx` (`id_estado_subproceso`),
  INDEX `id_detalle_pedido_idx` (`id_detalle_pedido`),
  CONSTRAINT `fk_registro_subprocesos_estado_subprocesos` FOREIGN KEY (`id_estado_subproceso`)
    REFERENCES `Estado_Subprocesos` (`id_estado_subproceso`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `registro_subprocesos_Detalle_pedido_FK` FOREIGN KEY (`id_detalle_pedido`)
    REFERENCES `Detalle_pedido` (`id_detalle_pedido`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `registro_subprocesos_Registros_FK` FOREIGN KEY (`id_registro`)
    REFERENCES `Registros` (`ID_REGISTRO`) ON DELETE NO ACTION ON UPDATE NO ACTION
) DEFAULT CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;

CREATE TABLE `Avance_Lanyard` (
  `id_avance_lanyard` INT NOT NULL AUTO_INCREMENT,
  `id_detalle_pedido` INT NOT NULL,
  `fecha_produccion` DATE NOT NULL,
  `cantidad_dia` INT NOT NULL DEFAULT 0,
  `cantidad_acumulada` INT NOT NULL DEFAULT 0,
  `porcentaje_acumulado` DECIMAL(5,2) NOT NULL DEFAULT 0,
  `capacidad_diaria_referencia` INT NOT NULL DEFAULT 1200,
  `id_usuario_registra` INT NOT NULL,
  `id_registro_subproceso` INT NULL,
  `observacion` TEXT NULL,
  `fecha_registro` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_avance_lanyard`),
  UNIQUE INDEX `uq_avance_lanyard_detalle_fecha` (`id_detalle_pedido`, `fecha_produccion`),
  INDEX `idx_avance_lanyard_fecha` (`fecha_produccion`),
  INDEX `idx_avance_lanyard_usuario` (`id_usuario_registra`),
  INDEX `idx_avance_lanyard_registro_subproceso` (`id_registro_subproceso`),
  CONSTRAINT `fk_avance_lanyard_detalle` FOREIGN KEY (`id_detalle_pedido`)
    REFERENCES `Detalle_pedido` (`id_detalle_pedido`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_avance_lanyard_usuario` FOREIGN KEY (`id_usuario_registra`)
    REFERENCES `Usuario` (`id_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_avance_lanyard_registro_subproceso` FOREIGN KEY (`id_registro_subproceso`)
    REFERENCES `registro_subprocesos` (`id_registro`) ON DELETE SET NULL ON UPDATE NO ACTION
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Mensaje` (
  `id_mensaje` INT NOT NULL AUTO_INCREMENT,
  `contenido` TEXT NOT NULL,
  `fecha_publicacion` TIMESTAMP NULL,
  `Asunto` TEXT NOT NULL,
  `id_pedido` INT NULL,
  PRIMARY KEY (`id_mensaje`),
  INDEX `Mensaje_Pedidos_FK` (`id_pedido`),
  CONSTRAINT `Mensaje_Pedidos_FK` FOREIGN KEY (`id_pedido`)
    REFERENCES `Pedidos` (`id_pedido`) ON DELETE NO ACTION ON UPDATE NO ACTION
) DEFAULT CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;

CREATE TABLE `MENSAJE_USUARIO` (
  `leido?` TINYINT(1) NOT NULL DEFAULT 0,
  `oculto?` TINYINT(1) NOT NULL DEFAULT 0,
  `id_usuario` INT NOT NULL,
  `id_mensaje` INT NOT NULL,
  PRIMARY KEY (`id_usuario`, `id_mensaje`),
  INDEX `MENSAJE_USUARIO_Mensaje_FK` (`id_mensaje`),
  CONSTRAINT `MENSAJE_USUARIO_Mensaje_FK` FOREIGN KEY (`id_mensaje`)
    REFERENCES `Mensaje` (`id_mensaje`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `MENSAJE_USUARIO_Usuario_FK` FOREIGN KEY (`id_usuario`)
    REFERENCES `Usuario` (`id_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION
) DEFAULT CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;

CREATE TABLE `Pedido_Etiqueta` (
  `id_pedido` INT NOT NULL,
  `id_etiqueta` INT NOT NULL,
  `fecha_asignacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `id_usuario_asigna` INT NULL,
  PRIMARY KEY (`id_pedido`, `id_etiqueta`),
  INDEX `Pedido_Etiqueta_Etiqueta_FK` (`id_etiqueta`),
  INDEX `Pedido_Etiqueta_Usuario_FK` (`id_usuario_asigna`),
  CONSTRAINT `Pedido_Etiqueta_Etiqueta_FK` FOREIGN KEY (`id_etiqueta`)
    REFERENCES `etiqueta` (`id_etiqueta`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Pedido_Etiqueta_Pedidos_FK` FOREIGN KEY (`id_pedido`)
    REFERENCES `Pedidos` (`id_pedido`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Pedido_Etiqueta_Usuario_FK` FOREIGN KEY (`id_usuario_asigna`)
    REFERENCES `Usuario` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;

CREATE TABLE `Pedido_Item_Sin_Seguimiento` (
  `id_item_sin_seguimiento` INT NOT NULL AUTO_INCREMENT,
  `id_pedido` INT NOT NULL,
  `codigo` VARCHAR(50) NULL,
  `producto` VARCHAR(255) NOT NULL,
  `cantidad` INT NULL,
  `subfamilia` VARCHAR(100) NULL,
  `fecha_registro` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_item_sin_seguimiento`),
  INDEX `Pedido_Item_Sin_Seguimiento_id_pedido_idx` (`id_pedido`),
  CONSTRAINT `Pedido_Item_Sin_Seguimiento_Pedidos_FK` FOREIGN KEY (`id_pedido`)
    REFERENCES `Pedidos` (`id_pedido`) ON DELETE CASCADE ON UPDATE NO ACTION
) DEFAULT CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;

DROP TEMPORARY TABLE `_p21_empty_guard`;
