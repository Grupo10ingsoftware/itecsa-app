import { ROLES } from "../config/roles.js";

const ROLES_CLAIM = "https://itecsa.local/roles";

export default function requireSalesRole(req, res, next) {
    const roles = req.auth?.payload?.[ROLES_CLAIM];
    if (!Array.isArray(roles) || roles.length !== 1 || roles[0] !== ROLES.VENTAS) {
        return res.status(403).json({ message: "Solo un usuario con rol Ventas puede reevaluar pedidos." });
    }
    return next();
}
