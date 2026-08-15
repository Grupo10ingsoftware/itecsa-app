import { ADMINISTRATIVE_ROLES } from "../config/roles.js";

const ROLES_CLAIM = "https://itecsa.local/roles";

export default function requireAdministrativeRole(req, res, next) {
    const roles = req.auth?.payload?.[ROLES_CLAIM];
    const hasAdministrativeRole =
        Array.isArray(roles) &&
        roles.length === 1 &&
        ADMINISTRATIVE_ROLES.has(roles[0]);

    if (!hasAdministrativeRole) {
        return res.status(403).json({
            message: "El usuario autenticado no tiene autorizacion administrativa.",
        });
    }

    return next();
}
