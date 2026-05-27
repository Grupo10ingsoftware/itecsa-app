import { Router } from "express";
import checkJwt from "../middlewares/checkJwt.js";

const EMAIL_CLAIM = "https://itecsa.local/email";
const ROLES_CLAIM = "https://itecsa.local/roles";
const OFFICIAL_ROLES = new Set([
    "Administrador",
    "Gerencia",
    "Operario",
    "Ventas",
    "Cobranzas",
]);

const router = Router();

router.get("/verify", checkJwt, (req, res) => {
    const payload = req.auth?.payload;
    const email = payload?.[EMAIL_CLAIM];
    const roles = payload?.[ROLES_CLAIM];

    const hasValidIdentity =
        typeof payload?.sub === "string" &&
        typeof email === "string" &&
        email.trim().length > 0;
    const hasSingleOfficialRole =
        Array.isArray(roles) &&
        roles.length === 1 &&
        OFFICIAL_ROLES.has(roles[0]);

    if (!hasValidIdentity || !hasSingleOfficialRole) {
        return res.status(403).json({
            message: "La sesion autenticada no tiene un rol valido para ITECSA.",
        });
    }

    const rolUsuario = roles[0];

    return res.status(200).json({
        sub: payload.sub,
        email,
        rolUsuario,
        isAdministrador: rolUsuario === "Administrador",
    });
});

export default router;
