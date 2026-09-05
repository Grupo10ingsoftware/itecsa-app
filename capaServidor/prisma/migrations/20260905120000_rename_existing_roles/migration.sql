-- Rename existing roles without changing permissions or assignments.
UPDATE `Usuario`
SET `rol_usuario` = CASE BINARY `rol_usuario`
    WHEN 'Administrador' THEN 'Administrador Producción'
    WHEN 'Producción' THEN 'Operario Producción'
    WHEN 'Ventas' THEN 'Operario Ventas'
    WHEN 'Cobranzas' THEN 'Operario Cobranzas'
    ELSE `rol_usuario`
END
WHERE BINARY `rol_usuario` IN ('Administrador', 'Producción', 'Ventas', 'Cobranzas');
