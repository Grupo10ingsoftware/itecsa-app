import { Router } from "express";
import checkJwt from "../middlewares/checkJwt.js";
import requireAdministrador from "../middlewares/requireAdministrador.js";
import {
    Auth0ServiceError,
    createAuth0User,
    requestPasswordSetupEmail,
} from "../services/auth0Management.service.js";

const USER_FIELDS = new Set(["correoUsuario", "rolUsuario"]);
const PASSWORD_SETUP_EMAIL_FIELDS = new Set(["correoUsuario"]);
const ROLES = new Set([
    "Administrador",
    "Gerencia",
    "Operario",
    "Ventas",
    "Cobranzas",
]);
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INTERNAL_ERROR_MESSAGE = "No fue posible crear el usuario.";
const PASSWORD_EMAIL_ERROR_MESSAGE =
    "No fue posible solicitar el correo de establecimiento de contrasena.";

function invalidRequest(message) {
    return { valid: false, message };
}

function validateRequest(body) {
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
        return invalidRequest("Los datos del usuario no son validos.");
    }

    if (Object.keys(body).some((field) => !USER_FIELDS.has(field))) {
        return invalidRequest("La solicitud contiene campos no permitidos.");
    }

    const user = {};
    for (const field of USER_FIELDS) {
        if (typeof body[field] !== "string" || body[field].trim().length === 0) {
            return invalidRequest(`El campo ${field} es obligatorio.`);
        }

        user[field] = body[field].trim();
    }

    if (!EMAIL_FORMAT.test(user.correoUsuario)) {
        return invalidRequest("El correoUsuario no tiene un formato valido.");
    }

    if (!ROLES.has(user.rolUsuario)) {
        return invalidRequest("El rolUsuario no es valido.");
    }

    return { valid: true, user };
}

function validatePasswordSetupEmailRequest(body) {
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
        return invalidRequest("Los datos de la solicitud no son validos.");
    }

    if (
        Object.keys(body).some(
            (field) => !PASSWORD_SETUP_EMAIL_FIELDS.has(field),
        )
    ) {
        return invalidRequest("La solicitud contiene campos no permitidos.");
    }

    if (
        typeof body.correoUsuario !== "string" ||
        body.correoUsuario.trim().length === 0
    ) {
        return invalidRequest("El campo correoUsuario es obligatorio.");
    }

    const correoUsuario = body.correoUsuario.trim();

    if (!EMAIL_FORMAT.test(correoUsuario)) {
        return invalidRequest("El correoUsuario no tiene un formato valido.");
    }

    return { valid: true, correoUsuario };
}

function createdResponse(user, userId, passwordSetupEmailRequested) {
    return {
        idUsuarioAutenticacionExterna: userId,
        correoUsuario: user.correoUsuario,
        rolUsuario: user.rolUsuario,
        passwordSetupEmailRequested,
    };
}

export function createPasswordSetupEmailHandler({
    requestPasswordEmail = requestPasswordSetupEmail,
} = {}) {
    return async function passwordSetupEmailHandler(req, res) {
        const validatedRequest = validatePasswordSetupEmailRequest(req.body);

        if (!validatedRequest.valid) {
            return res.status(400).json({ message: validatedRequest.message });
        }

        try {
            await requestPasswordEmail({
                email: validatedRequest.correoUsuario,
            });
        } catch {
            return res.status(500).json({
                message: PASSWORD_EMAIL_ERROR_MESSAGE,
            });
        }

        return res.status(200).json({
            correoUsuario: validatedRequest.correoUsuario,
            passwordSetupEmailRequested: true,
        });
    };
}

export function createAdminUserHandler({
    createUser = createAuth0User,
    requestPasswordEmail = requestPasswordSetupEmail,
} = {}) {
    return async function adminUserHandler(req, res) {
        const validatedRequest = validateRequest(req.body);

        if (!validatedRequest.valid) {
            return res.status(400).json({ message: validatedRequest.message });
        }

        const user = validatedRequest.user;
        let createdUser;

        try {
            createdUser = await createUser({
                email: user.correoUsuario,
                rolUsuario: user.rolUsuario,
            });
        } catch (error) {
            if (
                error instanceof Auth0ServiceError &&
                error.code === "USER_EMAIL_ALREADY_EXISTS"
            ) {
                return res.status(409).json({
                    message: "Ya existe un usuario con ese correo.",
                });
            }

            return res.status(500).json({ message: INTERNAL_ERROR_MESSAGE });
        }

        if (!createdUser.roleAssignmentCompleted) {
            return res.status(201).json({
                ...createdResponse(user, createdUser.userId, false),
                roleAssignmentCompleted: false,
                recoverable: true,
                message:
                    "La cuenta fue creada, pero no se pudo asignar el rol de acceso. No se solicito el correo de establecimiento de contrasena.",
            });
        }

        try {
            await requestPasswordEmail({ email: user.correoUsuario });
        } catch {
            return res.status(201).json({
                ...createdResponse(user, createdUser.userId, false),
                recoverable: true,
                message:
                    "La cuenta fue creada, pero no se pudo solicitar el correo de establecimiento de contrasena.",
            });
        }

        return res
            .status(201)
            .json(createdResponse(user, createdUser.userId, true));
    };
}

export function createAdminUsersRouter({
    authenticate = checkJwt,
    authorize = requireAdministrador,
    createUser,
    requestPasswordEmail,
} = {}) {
    const router = Router();
    router.post(
        "/users",
        authenticate,
        authorize,
        createAdminUserHandler({ createUser, requestPasswordEmail }),
    );
    router.post(
        "/users/password-setup-email",
        authenticate,
        authorize,
        createPasswordSetupEmailHandler({ requestPasswordEmail }),
    );
    return router;
}

export default createAdminUsersRouter();
