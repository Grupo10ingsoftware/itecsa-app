-- Keep the Auth0 role value unaccented; the UI supplies the accented label.
UPDATE `Usuario`
SET `rol_usuario` = 'Administrador Produccion'
WHERE BINARY `rol_usuario` IN ('Administrador', 'Administrador Producción');
