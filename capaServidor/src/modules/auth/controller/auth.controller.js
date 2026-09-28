import { respondError } from "../../../errors/httpErrors.js";
import {
    requestPasswordSetupEmail,
} from "../../users/service/auth0Management.service.js";
import userRepository from "../../users/repo/users.repo.js";
import { OFFICIAL_ROLES, ROLES } from "../../../config/roles.js";
import pinService from "../service/pin.service.js";

const EMAIL_CLAIM = "https://itecsa.local/email";
const ROLES_CLAIM = "https://itecsa.local/roles";
const PERMISSIONS_CLAIM = "permissions";
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACTIVE_USER_STATUSES = new Set(["Activo", "Vinculado"]);
const PASSWORD_RESET_ACCEPTED_MESSAGE =
    "Si existe una cuenta habilitada asociada a este correo, recibirás instrucciones para restablecer tu contraseña.";
const PASSWORD_RESET_ERROR_MESSAGE =
    "No fue posible solicitar el correo de recuperación de contraseña.";

function invalidPasswordResetRequest(message) {
    return { valid: false, message };
}

function validatePasswordResetRequest(body) {
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
        return invalidPasswordResetRequest("Los datos de la solicitud no son validos.");
    }

    if (Object.keys(body).some((field) => field !== "email")) {
        return invalidPasswordResetRequest("La solicitud contiene campos no permitidos.");
    }

    if (typeof body.email !== "string" || body.email.trim().length === 0) {
        return invalidPasswordResetRequest("El campo email es obligatorio.");
    }

    const email = body.email.trim().toLowerCase();

    if (!EMAIL_FORMAT.test(email)) {
        return invalidPasswordResetRequest("El email no tiene un formato valido.");
    }

    return { valid: true, email };
}

function logPasswordResetAttempt(logger, outcome) {
    logger.info?.("password_reset_request", { outcome });
}

function acceptedPasswordResetResponse(res) {
    return res.status(200).json({
        status: "accepted",
        message: PASSWORD_RESET_ACCEPTED_MESSAGE,
    });
}

export function createVerifyAuthSessionHandler({
    pins = { async ensureProvisioned() { return "active"; } },
    logger = console,
} = {}) {
    return async function verifyAuthSessionHandler(req, res) {
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
            (permission) =>
                typeof permission === "string" && permission.trim().length > 0,
        );

        try {
            const pinStatus = await pins.ensureProvisioned(payload.sub);

            return res.status(200).json({
                sub: payload.sub,
                ...(req.currentUser ? {
                    primerNombre: req.currentUser.nombreUsuario,
                    apellidoPaterno: req.currentUser.apellidoUsuario,
                } : {}),
                email,
                rolUsuario,
                isAdministrador: rolUsuario === ROLES.ADMINISTRADOR,
                permissions,
                pinStatus,
            });
        } catch (error) {
            return respondError(error, req, res, { logger });
        }
    };
}

export const verifyAuthSessionHandler = createVerifyAuthSessionHandler();

export function createRevealPinHandler({ pins = pinService } = {}) {
    return async function revealPinHandler(req, res) {
        res.set("Cache-Control", "no-store");
        try {
            return res.status(200).json({
                pin: await pins.reveal(req.auth?.payload?.sub),
            });
        } catch (error) {
            return respondError(error, req, res);
        }
    };
}

export function createDebugResetPinHandler({ pins = pinService } = {}) {
    return async function debugResetPinHandler(req, res) {
        res.set("Cache-Control", "no-store");
        try {
            return res.status(200).json({ pinStatus: await pins.debugReset(req.auth?.payload) });
        } catch (error) {
            return respondError(error, req, res);
        }
    };
}

export function createAcknowledgePinHandler({ pins = pinService } = {}) {
    return async function acknowledgePinHandler(req, res) {
        try {
            await pins.acknowledge(req.auth?.payload?.sub);
            return res.status(204).end();
        } catch (error) {
            return respondError(error, req, res);
        }
    };
}

export function createRequestPinRecoveryHandler({ pins = pinService } = {}) {
    return async function requestPinRecoveryHandler(req, res) {
        try {
            await pins.requestRecovery(req.auth?.payload?.sub);
            return res.status(202).json({ status: "sent" });
        } catch (error) {
            return respondError(error, req, res);
        }
    };
}

export function createConfirmPinRecoveryHandler({ pins = pinService } = {}) {
    return async function confirmPinRecoveryHandler(req, res) {
        try {
            const pinStatus = await pins.confirmRecovery(
                req.auth?.payload?.sub,
                req.body?.code,
            );
            return res.status(200).json({ pinStatus });
        } catch (error) {
            return respondError(error, req, res);
        }
    };
}

export function createPasswordResetRequestHandler({
    users = userRepository,
    requestPasswordEmail = requestPasswordSetupEmail,
    logger = console,
} = {}) {
    return async function passwordResetRequestHandler(req, res) {
        const validatedRequest = validatePasswordResetRequest(req.body);

        if (!validatedRequest.valid) {
            return res.status(400).json({ message: validatedRequest.message });
        }

        const { email } = validatedRequest;

        let user;
        try {
            user = await users.findByEmail(email);
        } catch (error) {
            logger.error?.("password_reset_lookup_error", {
                code: error?.code,
            });
            return res.status(500).json({ message: PASSWORD_RESET_ERROR_MESSAGE });
        }

        if (!user || !ACTIVE_USER_STATUSES.has(user.estadoUsuario)) {
            logPasswordResetAttempt(logger, "not_eligible");
            return acceptedPasswordResetResponse(res);
        }

        try {
            await requestPasswordEmail({ email });
            logPasswordResetAttempt(logger, "requested");
        } catch (error) {
            logger.error?.("password_reset_delivery_error", {
                code: error?.code,
            });
        }

        return acceptedPasswordResetResponse(res);
    };
}

export function createGetProfileHandler({ users = userRepository } = {}) {
    return async function getProfileHandler(req, res) {
        const user = req.currentUser;
        if (!user || user.idAuth0 !== req.auth?.payload?.sub) {
            return res.status(401).json({ message: "Sesión no válida." });
        }
        try {
            const records = await users.listRecentRecords(user.idUsuario);
            return res.status(200).json({
                primerNombre: user.nombreUsuario,
                apellidoPaterno: user.apellidoUsuario,
                email: user.correoUsuario,
                rolUsuario: user.rolUsuario,
                rutUsuario: user.rutUsuario,
                estadoUsuario: user.estadoUsuario,
                records,
            });
        } catch (error) {
            return respondError(error, req, res);
        }
    };
}
