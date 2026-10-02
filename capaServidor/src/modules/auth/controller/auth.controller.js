import { respondError } from "../../../errors/httpErrors.js";
import { createHmac } from "node:crypto";
import {
    Auth0ServiceError,
    requestPasswordSetupEmail,
} from "../../users/service/auth0Management.service.js";
import userRepository from "../../users/repo/users.repo.js";
import { OFFICIAL_ROLES, ROLES } from "../../../config/roles.js";
import pinService from "../service/pin.service.js";
import { safeLogger } from "../../../shared/safeLogger.js";
import { isActiveUserStatus } from "../../../config/userLifecycle.js";

const EMAIL_CLAIM = "https://itecsa.local/email";
const ROLES_CLAIM = "https://itecsa.local/roles";
const PERMISSIONS_CLAIM = "permissions";
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RESET_ACCEPTED_MESSAGE =
    "Si la cuenta está activa, enviaremos las instrucciones de recuperación al correo indicado.";

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

function hashEmail(email) {
    const key = process.env.SECURITY_LOG_HMAC_KEY ?? process.env.RATE_LIMIT_SECRET;
    if (!key) return "unavailable";
    return createHmac("sha256", key).update(email).digest("hex");
}

function logPasswordResetAttempt(logger, { email, status }) {
    // Un fallo de telemetría tampoco debe revelar el resultado privado al cliente.
    try {
        logger.info?.("password_reset_request", {
            correlationId: hashEmail(email),
            outcome: status,
        });
    } catch {
        // El sink se supervisa fuera del canal público de recuperación.
    }
}

export function createVerifyAuthSessionHandler({
    pins = { async ensureProvisioned() { return "active"; } },
    logger = safeLogger,
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
    logger = safeLogger,
    sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
    minimumDelayMs = 600,
    random = Math.random,
    now = () => performance.now(),
} = {}) {
    return async function passwordResetRequestHandler(req, res) {
        const startedAt = now();
        const validatedRequest = validatePasswordResetRequest(req.body);

        if (!validatedRequest.valid) {
            return res.status(400).json({ message: validatedRequest.message });
        }

        const { email } = validatedRequest;
        let outcome = "lookup_error";

        try {
            const user = await users.findByEmail(email);

            if (!user) {
                outcome = "not_registered";
            } else if (!isActiveUserStatus(user.estadoUsuario)) {
                outcome = "disabled";
            } else {
                outcome = "delivery_error";
                await requestPasswordEmail({ email });
                outcome = "sent";
            }
        } catch (error) {
            if (error instanceof Auth0ServiceError) {
                try {
                    logger.error?.("password_reset_auth0_error", {
                        code: error.code,
                        outcome: "error",
                    });
                } catch {
                    // Mantener el mismo contrato si el sink está indisponible.
                }
            }
        }

        logPasswordResetAttempt(logger, { email, status: outcome });
        const targetDelay = minimumDelayMs + Math.floor(random() * 200);
        const remaining = targetDelay - (now() - startedAt);
        if (remaining > 0) await sleep(remaining);

        return res.status(202).json({
            status: "accepted",
            message: PASSWORD_RESET_ACCEPTED_MESSAGE,
        });
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
