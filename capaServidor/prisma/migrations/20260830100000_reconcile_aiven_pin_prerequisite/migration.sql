-- La BD compartida ya contiene esta columna legada como CHAR(4).
-- Esta migracion se marca como aplicada en Aiven y solo materializa la
-- precondicion al reconstruir una BD desde la cadena historica.
ALTER TABLE `Usuario` ADD COLUMN `pin_hash` CHAR(4) NULL;
