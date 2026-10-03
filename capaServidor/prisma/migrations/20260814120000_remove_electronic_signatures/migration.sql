-- DropForeignKey
ALTER TABLE `Firma_Pago` DROP FOREIGN KEY `fk_firmapago_documento`;

-- DropForeignKey
ALTER TABLE `Firma_Subproceso` DROP FOREIGN KEY `id_firma_documento`;

-- DropForeignKey
ALTER TABLE `Firma_Documento` DROP FOREIGN KEY `fk_firma_documento`;

-- DropForeignKey
ALTER TABLE `Firma_Documento` DROP FOREIGN KEY `fk_firma_usuario`;

-- DropTable
DROP TABLE `Firma_Pago`;

-- DropTable
DROP TABLE `Firma_Subproceso`;

-- DropTable
DROP TABLE `Firma_Documento`;

-- AlterTable
ALTER TABLE `Usuario` DROP COLUMN `ruta_firma`;

-- AlterTable
ALTER TABLE `Nota_Venta` DROP COLUMN `firmado`;

-- AlterTable
ALTER TABLE `Ficha_Cliente` DROP COLUMN `firmado`;
