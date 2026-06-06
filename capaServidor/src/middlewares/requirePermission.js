export default function requirePermission(permission) {
    if (typeof permission !== "string" || permission.trim().length === 0) {
        throw new TypeError("requirePermission requiere un permiso valido.");
    }

    const requiredPermission = permission.trim();

    return function permissionMiddleware(req, res, next) {
        const permissions = req.auth?.payload?.permissions;

        if (
            !Array.isArray(permissions) ||
            !permissions.includes(requiredPermission)
        ) {
            return res.status(403).json({
                message: "El usuario autenticado no tiene el permiso requerido.",
            });
        }

        return next();
    };
}
