import { ROLES } from "../config/roles.js";

const ROLES_CLAIM = "https://itecsa.local/roles";

export default function requireAdministratorRole(req, res, next) {
    const roles = req.auth?.payload?.[ROLES_CLAIM];
    const isAdministrator =
        Array.isArray(roles) &&
        roles.length === 1 &&
        roles[0] === ROLES.ADMINISTRADOR;

    if (!isAdministrator) {
        return res.status(403).json({
            message: "Solo un usuario con rol Administrador puede cancelar la produccion.",
        });
    }

    return next();
}
