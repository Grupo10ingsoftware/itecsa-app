import {
    Auth0ServiceError,
    createAuth0User,
    requestPasswordSetupEmail,
} from "../service/auth0Management.service.js";
import {
    validateAdminUserRequest,
    validatePasswordSetupEmailRequest,
} from "../validators/adminUsers.validator.js";
import userRepository, {
    UserRepositoryError,
} from "../repo/users.repo.js";

const INTERNAL_ERROR_MESSAGE = "No fue posible crear el usuario.";
const PASSWORD_EMAIL_ERROR_MESSAGE =
    "No fue posible solicitar el correo de establecimiento de contrasena.";
const ACTIVE_USER_STATUS = "Activo";
const PENDING_ROLE_USER_STATUS = "Pendiente rol";

function createdResponse(user, createdUser, passwordSetupEmailRequested) {
    return {
        ...(createdUser.internalUser?.idUsuario
            ? { idUsuario: createdUser.internalUser.idUsuario }
            : {}),
        idUsuarioAutenticacionExterna: createdUser.userId,
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
    users = userRepository,
} = {}) {
    return async function adminUserHandler(req, res) {
        const validatedRequest = validateAdminUserRequest(req.body);

        if (!validatedRequest.valid) {
            return res.status(400).json({ message: validatedRequest.message });
        }

        const user = validatedRequest.user;
        let createdUser;
        let existingInternalUser;

        try {
            existingInternalUser = await users.findByEmail(user.correoUsuario);
        } catch {
            return res.status(500).json({ message: INTERNAL_ERROR_MESSAGE });
        }

        if (existingInternalUser) {
            return res.status(409).json({
                message: "Ya existe un usuario con ese correo.",
            });
        }

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

        try {
            createdUser.internalUser = await users.create({
                auth0UserId: createdUser.userId,
                correoUsuario: user.correoUsuario,
                rolUsuario: user.rolUsuario,
                estadoUsuario: createdUser.roleAssignmentCompleted
                    ? ACTIVE_USER_STATUS
                    : PENDING_ROLE_USER_STATUS,
            });
        } catch (error) {
            if (
                error instanceof UserRepositoryError &&
                error.code === "USER_ALREADY_EXISTS"
            ) {
                return res.status(409).json({
                    message: "Ya existe un usuario con ese correo.",
                });
            }

            return res.status(201).json({
                ...createdResponse(user, createdUser, false),
                recoverable: true,
                message:
                    "La cuenta fue creada, pero no se pudo registrar el usuario interno. No se solicito el correo de establecimiento de contrasena.",
            });
        }

        if (!createdUser.roleAssignmentCompleted) {
            return res.status(201).json({
                ...createdResponse(user, createdUser, false),
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
                ...createdResponse(user, createdUser, false),
                recoverable: true,
                message:
                    "La cuenta fue creada, pero no se pudo solicitar el correo de establecimiento de contrasena.",
            });
        }

        return res
            .status(201)
            .json(createdResponse(user, createdUser, true));
    };
}
