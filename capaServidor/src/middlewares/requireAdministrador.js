const ROLES_CLAIM = "https://itecsa.local/roles";
const ADMINISTRADOR_ROLE = "Administrador";

export default function requireAdministrador(req, res, next) {
    const roles = req.auth?.payload?.[ROLES_CLAIM];
    const isAdministrador =
        Array.isArray(roles) &&
        roles.length === 1 &&
        roles[0] === ADMINISTRADOR_ROLE;

    if (!isAdministrador) {
        return res.status(403).json({
            message: "El usuario autenticado no tiene autorizacion administrativa.",
        });
    }

    return next();
}
