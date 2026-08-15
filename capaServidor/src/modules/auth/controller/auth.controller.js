import { createHash } from "node:crypto";
import {
    Auth0ServiceError,
    requestPasswordSetupEmail,
} from "../../users/service/auth0Management.service.js";
import userRepository from "../../users/repo/users.repo.js";
import { OFFICIAL_ROLES, ROLES } from "../../../config/roles.js";

const EMAIL_CLAIM = "https://itecsa.local/email";
const ROLES_CLAIM = "https://itecsa.local/roles";
const PERMISSIONS_CLAIM = "permissions";
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACTIVE_USER_STATUSES = new Set(["Activo", "Vinculado"]);
const PASSWORD_RESET_NOT_REGISTERED_MESSAGE =
    "No encontramos una cuenta asociada a este correo. Si crees que esto es un error, comunícate con el administrador.";
const PASSWORD_RESET_DISABLED_MESSAGE =
    "Tu cuenta se encuentra desactivada. Comunícate con el administrador.";
const PASSWORD_RESET_SENT_MESSAGE =
    "Te enviamos un enlace para cambiar tu contraseña.";
const PASSWORD_RESET_ERROR_MESSAGE =
    "No fue posible solicitar el correo de recuperación de contraseña.";
const VERIFY_SESSION_ERROR_MESSAGE =
    "No fue posible verificar la sesion autenticada.";

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
    return createHash("sha256").update(email).digest("hex");
}

function logPasswordResetAttempt(logger, { email, status }) {
    logger.info?.("password_reset_request", {
        emailHash: hashEmail(email),
        status,
    });
}

async function syncInternalRole({ users, auth0UserId, rolUsuario }) {
    const internalUser = await users.findByAuth0Id(auth0UserId);

    if (internalUser && internalUser.rolUsuario !== rolUsuario) {
        await users.updateRoleByAuth0Id(auth0UserId, rolUsuario);
    }
}

export function createVerifyAuthSessionHandler({
    users = userRepository,
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
            await syncInternalRole({
                users,
                auth0UserId: payload.sub,
                rolUsuario,
            });
        } catch (error) {
            logger.error?.("auth_verify_role_sync_error", {
                auth0UserId: payload.sub,
                rolUsuario,
                code: error?.code,
            });

            return res.status(500).json({ message: VERIFY_SESSION_ERROR_MESSAGE });
        }

        return res.status(200).json({
            sub: payload.sub,
            email,
            rolUsuario,
            isAdministrador: rolUsuario === ROLES.ADMINISTRADOR,
            permissions,
        });
    };
}

export const verifyAuthSessionHandler = createVerifyAuthSessionHandler();

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

        try {
            const user = await users.findByEmail(email);

            if (!user) {
                logPasswordResetAttempt(logger, { email, status: "not_registered" });
                return res.status(200).json({
                    status: "not_registered",
                    message: PASSWORD_RESET_NOT_REGISTERED_MESSAGE,
                });
            }

            if (!ACTIVE_USER_STATUSES.has(user.estadoUsuario)) {
                logPasswordResetAttempt(logger, { email, status: "disabled" });
                return res.status(200).json({
                    status: "disabled",
                    message: PASSWORD_RESET_DISABLED_MESSAGE,
                });
            }

            await requestPasswordEmail({ email });
            logPasswordResetAttempt(logger, { email, status: "sent" });

            return res.status(200).json({
                status: "sent",
                message: PASSWORD_RESET_SENT_MESSAGE,
            });
        } catch (error) {
            if (error instanceof Auth0ServiceError) {
                logger.error?.("password_reset_auth0_error", {
                    code: error.code,
                    status: error.status,
                });
            }

            return res.status(500).json({ message: PASSWORD_RESET_ERROR_MESSAGE });
        }
    };
}
