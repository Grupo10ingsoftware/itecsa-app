-- Match the Auth0 role value; the frontend displays the accented label.
UPDATE `Usuario`
SET `rol_usuario` = 'Operario Produccion'
WHERE BINARY `rol_usuario` IN ('Producción', 'Operario Producción');
