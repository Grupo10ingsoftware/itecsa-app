-- CreateTable
CREATE TABLE `Anuncio` (
    `id_anuncio` INTEGER NOT NULL,
    `contenido_anuncio` TEXT NULL,
    `fecha_publicacion_anuncio` DATETIME(0) NULL,
    `fecha_expiracion_anuncio` DATETIME(0) NULL,
    `estado_anuncio` VARCHAR(45) NULL,
    `id_usuario` INTEGER NULL,

    INDEX `id_usuario_idx`(`id_usuario`),
    PRIMARY KEY (`id_anuncio`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cliente` (
    `id_cliente` INTEGER NOT NULL AUTO_INCREMENT,
    `rut_cliente` VARCHAR(12) NULL,
    `nombre_cliente` VARCHAR(100) NULL,
    `razon_social` VARCHAR(150) NULL,
    `estado_cliente` VARCHAR(30) NULL,

    UNIQUE INDEX `rut_cliente_UNIQUE`(`rut_cliente`),
    PRIMARY KEY (`id_cliente`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Comentario_Produccion` (
    `id_comentario_produccion` INTEGER NOT NULL,
    `comentario` TEXT NULL,
    `fecha_comentario` DATETIME(0) NULL,
    `id_usuario` INTEGER NULL,
    `id_detalle_pedido` INTEGER NULL,

    INDEX `id_detalle_pedido_idx`(`id_detalle_pedido`),
    INDEX `id_usuario_idx`(`id_usuario`),
    PRIMARY KEY (`id_comentario_produccion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Detalle_pedido` (
    `id_detalle_pedido` INTEGER NOT NULL AUTO_INCREMENT,
    `cantidad` INTEGER NULL,
    `fecha_estimada_termino` DATETIME(0) NULL,
    `fecha_real_termino` DATETIME(0) NULL,
    `id_pedido` INTEGER NULL,
    `id_tipo_producto` INTEGER NULL,

    INDEX `id_pedido_idx`(`id_pedido`),
    INDEX `id_tipo_producto_idx`(`id_tipo_producto`),
    PRIMARY KEY (`id_detalle_pedido`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Diseño` (
    `id_diseño` INTEGER NOT NULL,
    `especificaciones` TEXT NULL,
    `id_detalle_pedido` INTEGER NULL,

    INDEX `id_detalle_pedido_idx`(`id_detalle_pedido`),
    PRIMARY KEY (`id_diseño`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Diseño_Lanyard` (
    `id_diseño` INTEGER NOT NULL,
    `color` VARCHAR(50) NULL,
    `leyenda` VARCHAR(255) NULL,
    `largo_lanyard` DECIMAL(10, 2) NULL,
    `ancho_lanyard` DECIMAL(10, 2) NULL,

    PRIMARY KEY (`id_diseño`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Diseño_Tarjeta` (
    `id_diseño` INTEGER NOT NULL,
    `tipo_tarjeta` ENUM('banda', 'chip') NULL,

    PRIMARY KEY (`id_diseño`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Documento` (
    `id_documento` INTEGER NOT NULL,
    `ruta_pdf` VARCHAR(255) NULL,
    `fecha_registro` DATETIME(0) NULL,
    `id_pedido` INTEGER NULL,

    INDEX `id_pedido_idx`(`id_pedido`),
    PRIMARY KEY (`id_documento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Estado_Pago` (
    `id_estado_Pago` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_estado_pago` VARCHAR(45) NULL,
    `descripcion_estado_pago` VARCHAR(105) NULL,

    PRIMARY KEY (`id_estado_Pago`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Estado_Pedido` (
    `id_estado_pedido` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_etapa` VARCHAR(100) NULL,
    `orden_kanban` INTEGER NULL,
    `descripcion_estado` VARCHAR(45) NULL,

    PRIMARY KEY (`id_estado_pedido`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Estado_Subprocesos` (
    `id_estado_subproceso` INTEGER NOT NULL,
    `nombre_estado` VARCHAR(100) NULL,
    `descripcion_estado` TEXT NULL,

    PRIMARY KEY (`id_estado_subproceso`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ficha_Cliente` (
    `id_documento` INTEGER NOT NULL,
    `firmado` TINYINT NULL,

    PRIMARY KEY (`id_documento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Firma_Documento` (
    `id_firma_documento` INTEGER NOT NULL,
    `hash_firma` VARCHAR(255) NULL,
    `fecha_firma` DATETIME(0) NULL,
    `id_usuario` INTEGER NULL,
    `id_documento` INTEGER NULL,

    INDEX `id_documento_idx`(`id_documento`),
    INDEX `id_usuario_idx`(`id_usuario`),
    PRIMARY KEY (`id_firma_documento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Firma_Pago` (
    `id_firma_documento` INTEGER NOT NULL,

    PRIMARY KEY (`id_firma_documento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Firma_Subproceso` (
    `id_firma_documento` INTEGER NOT NULL,

    PRIMARY KEY (`id_firma_documento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Historial_Usuario` (
    `id_historial_usuario` INTEGER NOT NULL,
    `fecha_accion` DATETIME(0) NULL,
    `accion_realizada` TEXT NULL,
    `id_usuario` INTEGER NULL,

    INDEX `id_usuario_idx`(`id_usuario`),
    PRIMARY KEY (`id_historial_usuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Nota_Venta` (
    `id_documento` INTEGER NOT NULL,
    `firmado` TINYINT NULL,
    `numero_nota_venta` VARCHAR(50) NULL,

    PRIMARY KEY (`id_documento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Orden_Produccion` (
    `id_documento` INTEGER NOT NULL,
    `numero_op` VARCHAR(45) NULL,

    PRIMARY KEY (`id_documento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pedidos` (
    `id_pedido` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha_creacion` DATE NULL,
    `fecha_estimada_termino` DATE NULL,
    `id_usuario` INTEGER NULL,
    `id_estado_pedido` INTEGER NULL,
    `id_estado_pago` INTEGER NULL,
    `id_cliente` INTEGER NULL,
    `id_etiqueta` INTEGER NULL,

    INDEX `id_cliente_idx`(`id_cliente`),
    INDEX `id_estado_pago_idx`(`id_estado_pago`),
    INDEX `id_estado_pedido_idx`(`id_estado_pedido`),
    INDEX `id_etiqueta_idx`(`id_etiqueta`),
    INDEX `id_usuario_idx`(`id_usuario`),
    PRIMARY KEY (`id_pedido`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Producto_Subproceso` (
    `id_tipo_producto` INTEGER NOT NULL,
    `id_estado_subproceso` INTEGER NOT NULL,
    `orden_flujo` INTEGER NULL,

    INDEX `id_estado_subproceso_idx`(`id_estado_subproceso`),
    PRIMARY KEY (`id_tipo_producto`, `id_estado_subproceso`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Registro_Etapas` (
    `id_registro_etapa` INTEGER NOT NULL,
    `fecha_hora_entrada` DATETIME(0) NULL,
    `fecha_hora_salida` DATETIME(0) NULL,
    `id_pedido` INTEGER NULL,
    `id_usuario` INTEGER NULL,
    `id_estado_pedido` INTEGER NULL,

    INDEX `id_estado_pedido_idx`(`id_estado_pedido`),
    INDEX `id_pedido_idx`(`id_pedido`),
    INDEX `id_usuario_idx`(`id_usuario`),
    PRIMARY KEY (`id_registro_etapa`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Registro_Pago` (
    `id_registro_pago` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha_registro` DATETIME(0) NULL,
    `observacion` LONGTEXT NULL,
    `id_pedido` INTEGER NULL,
    `id_usuario` INTEGER NULL,
    `id_estado_pago` INTEGER NULL,

    INDEX `id_estado_pago_idx`(`id_estado_pago`),
    INDEX `id_pedido_idx`(`id_pedido`),
    INDEX `id_usuario_idx`(`id_usuario`),
    PRIMARY KEY (`id_registro_pago`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tipo_Producto` (
    `id_tipo_producto` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_producto` VARCHAR(255) NULL,
    `descripcion_producto` TEXT NULL,

    PRIMARY KEY (`id_tipo_producto`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Usuario` (
    `id_usuario` INTEGER NOT NULL AUTO_INCREMENT,
    `id_auth0` VARCHAR(128) NOT NULL,
    `correo_usuario` VARCHAR(255) NOT NULL,
    `rut_usuario` VARCHAR(12) NULL,
    `nombre_usuario` VARCHAR(100) NULL,
    `apellido_usuario` VARCHAR(100) NULL,
    `rol_usuario` VARCHAR(50) NULL,
    `estado_usuario` VARCHAR(30) NULL,
    `ruta_firma` VARCHAR(255) NULL,

    UNIQUE INDEX `Usuario_id_auth0_key`(`id_auth0`),
    UNIQUE INDEX `Usuario_correo_usuario_key`(`correo_usuario`),
    PRIMARY KEY (`id_usuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `etiqueta` (
    `id_etiqueta` INTEGER NOT NULL,
    `nombre_etiqueta` VARCHAR(100) NULL,
    `descripcion` TEXT NULL,
    `esta_activa` TINYINT NULL,

    PRIMARY KEY (`id_etiqueta`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `registro_subprocesos` (
    `id_registro_subproceso` INTEGER NOT NULL,
    `fecha_hora_entrada` DATETIME(0) NULL,
    `fecha_hora_salida` DATETIME(0) NULL,
    `id_detalle_pedido` INTEGER NULL,
    `id_estado_subproceso` INTEGER NULL,
    `id_usuario` INTEGER NULL,

    INDEX `id_detalle_pedido_idx`(`id_detalle_pedido`),
    INDEX `id_estado_subproceso_idx`(`id_estado_subproceso`),
    INDEX `id_usuario_idx`(`id_usuario`),
    PRIMARY KEY (`id_registro_subproceso`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Anuncio` ADD CONSTRAINT `fk_anuncio_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Comentario_Produccion` ADD CONSTRAINT `fk_cp_detalle_pedido` FOREIGN KEY (`id_detalle_pedido`) REFERENCES `Detalle_pedido`(`id_detalle_pedido`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Comentario_Produccion` ADD CONSTRAINT `fk_cp_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Detalle_pedido` ADD CONSTRAINT `id_pedido` FOREIGN KEY (`id_pedido`) REFERENCES `Pedidos`(`id_pedido`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Detalle_pedido` ADD CONSTRAINT `id_tipo_producto` FOREIGN KEY (`id_tipo_producto`) REFERENCES `Tipo_Producto`(`id_tipo_producto`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Diseño` ADD CONSTRAINT `id_detalle_pedido` FOREIGN KEY (`id_detalle_pedido`) REFERENCES `Detalle_pedido`(`id_detalle_pedido`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Diseño_Lanyard` ADD CONSTRAINT `id_diseño` FOREIGN KEY (`id_diseño`) REFERENCES `Diseño`(`id_diseño`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Diseño_Tarjeta` ADD CONSTRAINT `fk_diseño_tarjeta_diseño` FOREIGN KEY (`id_diseño`) REFERENCES `Diseño`(`id_diseño`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Documento` ADD CONSTRAINT `fk_documento_pedido` FOREIGN KEY (`id_pedido`) REFERENCES `Pedidos`(`id_pedido`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Ficha_Cliente` ADD CONSTRAINT `fk_fc_documento` FOREIGN KEY (`id_documento`) REFERENCES `Documento`(`id_documento`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Firma_Documento` ADD CONSTRAINT `fk_firma_documento` FOREIGN KEY (`id_documento`) REFERENCES `Documento`(`id_documento`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Firma_Documento` ADD CONSTRAINT `fk_firma_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Firma_Pago` ADD CONSTRAINT `fk_firmapago_documento` FOREIGN KEY (`id_firma_documento`) REFERENCES `Firma_Documento`(`id_firma_documento`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Firma_Subproceso` ADD CONSTRAINT `id_firma_documento` FOREIGN KEY (`id_firma_documento`) REFERENCES `Firma_Documento`(`id_firma_documento`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Historial_Usuario` ADD CONSTRAINT `fk_historial_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Nota_Venta` ADD CONSTRAINT `id_documento` FOREIGN KEY (`id_documento`) REFERENCES `Documento`(`id_documento`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Orden_Produccion` ADD CONSTRAINT `fk_op_documento` FOREIGN KEY (`id_documento`) REFERENCES `Documento`(`id_documento`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Pedidos` ADD CONSTRAINT `id_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `Cliente`(`id_cliente`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Pedidos` ADD CONSTRAINT `Pedidos_Estado_Pedido_FK` FOREIGN KEY (`id_estado_pedido`) REFERENCES `Estado_Pedido`(`id_estado_pedido`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Pedidos` ADD CONSTRAINT `id_etiqueta` FOREIGN KEY (`id_etiqueta`) REFERENCES `etiqueta`(`id_etiqueta`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Pedidos` ADD CONSTRAINT `id_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Producto_Subproceso` ADD CONSTRAINT `fk_Producto_Subproceso_tipo_producto` FOREIGN KEY (`id_tipo_producto`) REFERENCES `Tipo_Producto`(`id_tipo_producto`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Producto_Subproceso` ADD CONSTRAINT `fk_Producto_Subproceso_estado_subproceso` FOREIGN KEY (`id_estado_subproceso`) REFERENCES `Estado_Subprocesos`(`id_estado_subproceso`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Registro_Etapas` ADD CONSTRAINT `Registro_Etapas_Estado_Pedido_FK` FOREIGN KEY (`id_estado_pedido`) REFERENCES `Estado_Pedido`(`id_estado_pedido`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Registro_Etapas` ADD CONSTRAINT `Registro_Etapas_Pedidos_FK` FOREIGN KEY (`id_pedido`) REFERENCES `Pedidos`(`id_pedido`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Registro_Etapas` ADD CONSTRAINT `fk_registro_etapa_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Registro_Pago` ADD CONSTRAINT `fk_registro_pago_pedido` FOREIGN KEY (`id_pedido`) REFERENCES `Pedidos`(`id_pedido`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Registro_Pago` ADD CONSTRAINT `fk_registro_pago_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `registro_subprocesos` ADD CONSTRAINT `fk_registro_subprocesos_estado_subprocesos` FOREIGN KEY (`id_estado_subproceso`) REFERENCES `Estado_Subprocesos`(`id_estado_subproceso`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `registro_subprocesos` ADD CONSTRAINT `fk_registro_subprocesos_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `registro_subprocesos` ADD CONSTRAINT `fk_registro_subprocesos_detalle_pedido` FOREIGN KEY (`id_detalle_pedido`) REFERENCES `Detalle_pedido`(`id_detalle_pedido`) ON DELETE NO ACTION ON UPDATE NO ACTION;
