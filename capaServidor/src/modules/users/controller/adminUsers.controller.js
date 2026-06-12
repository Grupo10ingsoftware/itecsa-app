import {
    AUTH0_MANAGEMENT_SCOPES,
    Auth0ServiceError,
    createAuth0User,
    requestPasswordSetupEmail,
    setAuth0UserStatus,
    updateAuth0User,
} from "../service/auth0Management.service.js";
import {
    validateAdminUserStatusRequest,
    validateAdminUserRequest,
    validateAdminUserUpdateRequest,
    validateListUsersQuery,
    validatePasswordSetupEmailRequest,
} from "../validators/adminUsers.validator.js";
import userRepository, {
    UserRepositoryError,
} from "../repo/users.repo.js";
import { deleteSignatureFile } from "../middleware/signatureUpload.js";

const INTERNAL_ERROR_MESSAGE = "No fue posible crear el usuario.";
const PASSWORD_EMAIL_ERROR_MESSAGE =
    "No fue posible solicitar el correo de establecimiento de contrasena.";
const LIST_USERS_ERROR_MESSAGE = "No fue posible consultar los usuarios.";
const UPDATE_USER_ERROR_MESSAGE = "No fue posible actualizar el usuario.";
const UPDATE_STATUS_ERROR_MESSAGE = "No fue posible actualizar el estado del usuario.";
const SELF_UNLINK_ERROR_MESSAGE =
    "No puedes desvincular tu propio usuario administrador.";
const ACTIVE_USER_STATUS = "Activo";
const PENDING_ROLE_USER_STATUS = "Pendiente rol";

function managementUserResponse(user) {
    const nombreUsuario = user.nombreUsuario ?? "";
    const apellidoUsuario = user.apellidoUsuario ?? "";

    return {
        idUsuario: user.idUsuario,
        idUsuarioAutenticacionExterna: user.idAuth0,
        nombreUsuario,
        apellidoUsuario,
        nombreCompleto: `${nombreUsuario} ${apellidoUsuario}`.trim(),
        rutUsuario: user.rutUsuario,
        correoUsuario: user.correoUsuario,
        rolUsuario: user.rolUsuario,
        estadoUsuario: user.estadoUsuario,
        rutaFirma: user.rutaFirma,
    };
}

function createdResponse(user, createdUser, passwordSetupEmailRequested) {
    return {
        ...(createdUser.internalUser?.idUsuario
            ? { idUsuario: createdUser.internalUser.idUsuario }
            : {}),
        idUsuarioAutenticacionExterna: createdUser.userId,
        nombreUsuario: user.nombreUsuario,
        apellidoUsuario: user.apellidoUsuario,
        rutUsuario: user.rutUsuario,
        correoUsuario: user.correoUsuario,
        rolUsuario: user.rolUsuario,
        rutaFirma: createdUser.internalUser?.rutaFirma,
        passwordSetupEmailRequested,
    };
}

function auth0ErrorResponse(error, fallbackMessage) {
    if (!(error instanceof Auth0ServiceError)) {
        return { message: fallbackMessage };
    }

    const response = {
        message: fallbackMessage,
        code: error.code,
    };

    if (error.code === "AUTH0_CONFIGURATION_ERROR") {
        response.message = "La configuracion administrativa de Auth0 esta incompleta.";
    }

    if (error.code === "AUTH0_INSUFFICIENT_SCOPE") {
        response.message =
            "La aplicacion administrativa de Auth0 no tiene permisos suficientes para consultar o modificar usuarios.";
        response.requiredScopes = AUTH0_MANAGEMENT_SCOPES;
    }

    return response;
}

function isMissingUserError(error) {
    return (
        error instanceof UserRepositoryError &&
        error.code === "USER_NOT_FOUND"
    );
}

function isDuplicateUserError(error) {
    return (
        error instanceof UserRepositoryError &&
        error.code === "USER_ALREADY_EXISTS"
    );
}

function invalidUserId(userId) {
    return typeof userId !== "string" || userId.trim().length === 0;
}

function getAuthenticatedUserId(req) {
    const subject = req.auth?.payload?.sub;

    return typeof subject === "string" ? subject.trim() : "";
}

function isSelfUnlinkRequest(req, targetUserId, estadoUsuario) {
    return (
        estadoUsuario === "Desvinculado" &&
        getAuthenticatedUserId(req) === targetUserId
    );
}

export function createListAdminUsersHandler({ users = userRepository } = {}) {
    return async function listAdminUsersHandler(req, res) {
        const validatedQuery = validateListUsersQuery(req.query ?? {});

        if (!validatedQuery.valid) {
            return res.status(400).json({ message: validatedQuery.message });
        }

        try {
            const result = await users.list(validatedQuery.filters);
            return res.status(200).json({
                ...result,
                usuarios: result.usuarios.map(managementUserResponse),
            });
        } catch {
            return res.status(500).json({ message: LIST_USERS_ERROR_MESSAGE });
        }
    };
}

export function createAdminUsersSummaryHandler({ users = userRepository } = {}) {
    return async function adminUsersSummaryHandler(req, res) {
        try {
            const result = await users.getSummary();
            return res.status(200).json(result);
        } catch {
            return res.status(500).json({ message: LIST_USERS_ERROR_MESSAGE });
        }
    };
}

export function createUpdateAdminUserHandler({
    updateUser = updateAuth0User,
    users = userRepository,
} = {}) {
    return async function updateAdminUserHandler(req, res) {
        const userId = req.params.userId;
        const validatedRequest = validateAdminUserUpdateRequest(req.body);

        if (invalidUserId(userId)) {
            return res.status(400).json({
                message: "El identificador del usuario es obligatorio.",
            });
        }

        if (!validatedRequest.valid) {
            return res.status(400).json({ message: validatedRequest.message });
        }

        const normalizedUserId = userId.trim();
        const user = validatedRequest.user;

        if (isSelfUnlinkRequest(req, normalizedUserId, user.estadoUsuario)) {
            return res.status(409).json({
                message: SELF_UNLINK_ERROR_MESSAGE,
            });
        }

        try {
            const existingUser = await users.findByAuth0Id(normalizedUserId);

            if (!existingUser) {
                return res.status(404).json({ message: "El usuario no existe." });
            }

            await updateUser({
                userId: normalizedUserId,
                correoUsuario: user.correoUsuario,
                rolUsuario: user.rolUsuario,
                estadoUsuario: user.estadoUsuario,
            });

            const updatedUser = await users.updateByAuth0Id(normalizedUserId, user);
            return res.status(200).json(managementUserResponse(updatedUser));
        } catch (error) {
            if (
                error instanceof Auth0ServiceError &&
                error.code === "USER_EMAIL_ALREADY_EXISTS"
            ) {
                return res.status(409).json({
                    message: "Ya existe un usuario con ese correo.",
                });
            }

            if (isDuplicateUserError(error)) {
                return res.status(409).json({
                    message: "Ya existe un usuario con ese correo.",
                });
            }

            if (isMissingUserError(error)) {
                return res.status(404).json({ message: "El usuario no existe." });
            }

            if (error instanceof Auth0ServiceError) {
                return res
                    .status(500)
                    .json(auth0ErrorResponse(error, UPDATE_USER_ERROR_MESSAGE));
            }

            return res.status(500).json({ message: UPDATE_USER_ERROR_MESSAGE });
        }
    };
}

export function createUpdateAdminUserStatusHandler({
    updateStatus = setAuth0UserStatus,
    users = userRepository,
} = {}) {
    return async function updateAdminUserStatusHandler(req, res) {
        const userId = req.params.userId;
        const validatedRequest = validateAdminUserStatusRequest(req.body);

        if (invalidUserId(userId)) {
            return res.status(400).json({
                message: "El identificador del usuario es obligatorio.",
            });
        }

        if (!validatedRequest.valid) {
            return res.status(400).json({ message: validatedRequest.message });
        }

        const normalizedUserId = userId.trim();

        if (
            isSelfUnlinkRequest(
                req,
                normalizedUserId,
                validatedRequest.estadoUsuario,
            )
        ) {
            return res.status(409).json({
                message: SELF_UNLINK_ERROR_MESSAGE,
            });
        }

        try {
            const existingUser = await users.findByAuth0Id(normalizedUserId);

            if (!existingUser) {
                return res.status(404).json({ message: "El usuario no existe." });
            }

            await updateStatus({
                userId: normalizedUserId,
                estadoUsuario: validatedRequest.estadoUsuario,
            });

            const updatedUser = await users.updateStatusByAuth0Id(
                normalizedUserId,
                validatedRequest.estadoUsuario,
            );
            return res.status(200).json(managementUserResponse(updatedUser));
        } catch (error) {
            if (isMissingUserError(error)) {
                return res.status(404).json({ message: "El usuario no existe." });
            }

            if (error instanceof Auth0ServiceError) {
                return res
                    .status(500)
                    .json(auth0ErrorResponse(error, UPDATE_STATUS_ERROR_MESSAGE));
            }

            return res.status(500).json({ message: UPDATE_STATUS_ERROR_MESSAGE });
        }
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
            deleteSignatureFile(req.signatureFile?.path);
            return res.status(400).json({ message: validatedRequest.message });
        }

        if (!req.signatureFile) {
            return res.status(400).json({
                message: "El campo firmaElectronica es obligatorio.",
            });
        }

        const user = validatedRequest.user;
        let createdUser;
        let existingInternalUser;

        try {
            existingInternalUser = await users.findByEmail(user.correoUsuario);
        } catch {
            deleteSignatureFile(req.signatureFile.path);
            return res.status(500).json({ message: INTERNAL_ERROR_MESSAGE });
        }

        if (existingInternalUser) {
            deleteSignatureFile(req.signatureFile.path);
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
                deleteSignatureFile(req.signatureFile.path);
                return res.status(409).json({
                    message: "Ya existe un usuario con ese correo.",
                });
            }

            deleteSignatureFile(req.signatureFile.path);
            return res.status(500).json({ message: INTERNAL_ERROR_MESSAGE });
        }

        try {
            createdUser.internalUser = await users.create({
                auth0UserId: createdUser.userId,
                correoUsuario: user.correoUsuario,
                rutUsuario: user.rutUsuario,
                nombreUsuario: user.nombreUsuario,
                apellidoUsuario: user.apellidoUsuario,
                rolUsuario: user.rolUsuario,
                estadoUsuario: createdUser.roleAssignmentCompleted
                    ? ACTIVE_USER_STATUS
                    : PENDING_ROLE_USER_STATUS,
                rutaFirma: req.signatureFile.storedPath,
            });
        } catch (error) {
            deleteSignatureFile(req.signatureFile.path);

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
