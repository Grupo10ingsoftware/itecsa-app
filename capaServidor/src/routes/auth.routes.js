import { Router } from "express";
import checkJwt from "../middlewares/checkJwt.js";

const EMAIL_CLAIM = "https://itecsa.local/email";
const ROLES_CLAIM = "https://itecsa.local/roles";
const PERMISSIONS_CLAIM = "permissions";
const OFFICIAL_ROLES = new Set([
    "Administrador",
    "Gerencia",
    "Operario",
    "Ventas",
    "Cobranzas",
]);

const router = Router();

export function verifyAuthSessionHandler(req, res) {
    const payload = req.auth?.payload;
    const email = payload?.[EMAIL_CLAIM];
    const roles = payload?.[ROLES_CLAIM];
    const permissionsClaim = payload?.[PERMISSIONS_CLAIM];

    const hasValidIdentity =
        typeof payload?.sub === "string" &&
        typeof email === "string" &&
        email.trim().length > 0;
    // Un rol singular evita escoger arbitrariamente entre asignaciones RBAC incompatibles.
    const hasSingleOfficialRole =
        Array.isArray(roles) &&
        roles.length === 1 &&
        OFFICIAL_ROLES.has(roles[0]);
    const hasValidPermissions =
        permissionsClaim === undefined || Array.isArray(permissionsClaim);

    if (!hasValidIdentity || !hasSingleOfficialRole || !hasValidPermissions) {
        return res.status(403).json({
            message: "La sesion autenticada no tiene un rol valido para ITECSA.",
        });
    }

    // El contrato publico expone rolUsuario como proyeccion del claim RBAC namespaced.
    const rolUsuario = roles[0];
    const permissions = (permissionsClaim ?? []).filter(
        (permission) => typeof permission === "string" && permission.trim().length > 0,
    );

    return res.status(200).json({
        sub: payload.sub,
        email,
        rolUsuario,
        isAdministrador: rolUsuario === "Administrador",
        permissions,
    });
}

router.get("/verify", checkJwt, verifyAuthSessionHandler);

export default router;
