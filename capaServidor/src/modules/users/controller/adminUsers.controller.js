import { roleFromPayload, manageableRoles, canManageUser } from "../../../../../shared/authorization.js";
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

function allowedTarget(req, res, role) {
    if (!canManageUser(roleFromPayload(req.auth?.payload), role)) {
        res.status(403).json({message:"No puedes gestionar ese rol o departamento."});
        return false;
    }
    return true;
}

const INTERNAL_ERROR_MESSAGE = "No fue posible crear el usuario.";
const PASSWORD_EMAIL_ERROR_MESSAGE =
    "No fue posible solicitar el correo de establecimiento de contrasena.";
const LIST_USERS_ERROR_MESSAGE = "No fue posible consultar los usuarios.";
const UPDATE_USER_ERROR_MESSAGE = "No fue posible actualizar el usuario.";
const UPDATE_STATUS_ERROR_MESSAGE = "No fue posible actualizar el estado del usuario.";
const SELF_UNLINK_ERROR_MESSAGE =
    "No puedes desvincular tu propio usuario.";
const SELF_ROLE_UPDATE_ERROR_MESSAGE =
    "No puedes cambiar tu propio rol.";
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

function isSelfTargetRequest(req, targetUserId) {
    return getAuthenticatedUserId(req) === targetUserId;
}

function isSelfUnlinkRequest(req, targetUserId, estadoUsuario) {
    return estadoUsuario === "Desvinculado" && isSelfTargetRequest(req, targetUserId);
}

function isSelfRoleUpdateRequest(req, targetUserId, currentRole, nextRole) {
    return (
        isSelfTargetRequest(req, targetUserId) &&
        typeof currentRole === "string" &&
        typeof nextRole === "string" &&
        currentRole !== nextRole
    );
}

export function createListAdminUsersHandler({ users = userRepository } = {}) {
    return async function listAdminUsersHandler(req, res) {
        const validatedQuery = validateListUsersQuery(req.query ?? {});

        if (!validatedQuery.valid) {
            return res.status(400).json({ message: validatedQuery.message });
        }

        try {
            const allowedRoles = manageableRoles(roleFromPayload(req.auth?.payload));
            if (!allowedRoles.length || (validatedQuery.filters.rolUsuario && !allowedTarget(req,res,validatedQuery.filters.rolUsuario))) {
                if (!allowedRoles.length) res.status(403).json({message:"Acceso denegado."});
                return;
            }
            const result = await users.list({...validatedQuery.filters, allowedRoles});
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
            const allowedRoles = manageableRoles(roleFromPayload(req.auth?.payload));
            if (!allowedRoles.length) return res.status(403).json({message:"Acceso denegado."});
            const result = await users.getSummary({allowedRoles});
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
        if (req.body?.rolUsuario === "Soporte" && !allowedTarget(req,res,req.body.rolUsuario)) return;
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

        try {
            const existingUser = await users.findByAuth0Id(normalizedUserId);

            if (!existingUser) {
                return res.status(404).json({ message: "El usuario no existe." });
            }

            if (!allowedTarget(req,res,existingUser.rolUsuario) || !allowedTarget(req,res,user.rolUsuario)) return;
            if (
                isSelfRoleUpdateRequest(
                    req,
                    normalizedUserId,
                    existingUser.rolUsuario,
                    user.rolUsuario,
                )
            ) {
                return res.status(409).json({
                    message: SELF_ROLE_UPDATE_ERROR_MESSAGE,
                });
            }

            await updateUser({
                userId: normalizedUserId,
                correoUsuario: user.correoUsuario,
                rolUsuario: user.rolUsuario,
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
    pins = { async invalidateByAuth0Id() {}, async ensureProvisioned() {} },
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

            if (!allowedTarget(req,res,existingUser.rolUsuario)) return;

            await updateStatus({
                userId: normalizedUserId,
                estadoUsuario: validatedRequest.estadoUsuario,
            });

            const updatedUser = await users.updateStatusByAuth0Id(
                normalizedUserId,
                validatedRequest.estadoUsuario,
            );
            if (validatedRequest.estadoUsuario === "Desvinculado") {
                await pins.invalidateByAuth0Id(normalizedUserId);
            } else {
                await pins.ensureProvisioned(normalizedUserId);
            }
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
    users = userRepository,
    requestPasswordEmail = requestPasswordSetupEmail,
} = {}) {
    return async function passwordSetupEmailHandler(req, res) {
        const validatedRequest = validatePasswordSetupEmailRequest(req.body);

        if (!validatedRequest.valid) {
            return res.status(400).json({ message: validatedRequest.message });
        }

        try {
            const target = await users.findByEmail(validatedRequest.correoUsuario);
            if (!target || !allowedTarget(req,res,target.rolUsuario)) {
                if (!target) res.status(403).json({message:"No puedes gestionar ese usuario."});
                return;
            }
            if (!['Activo','Vinculado'].includes(target.estadoUsuario)) return res.status(403).json({message:"Usuario desvinculado."});
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
    pins = { async provisionByUserId() {} },
} = {}) {
    return async function adminUserHandler(req, res) {
        if (req.body?.rolUsuario === "Soporte" && !allowedTarget(req,res,req.body.rolUsuario)) return;
        const validatedRequest = validateAdminUserRequest(req.body);

        if (!validatedRequest.valid) {
            return res.status(400).json({ message: validatedRequest.message });
        }

        const user = validatedRequest.user;
        if (!allowedTarget(req,res,user.rolUsuario)) return;
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
                rutUsuario: user.rutUsuario,
                nombreUsuario: user.nombreUsuario,
                apellidoUsuario: user.apellidoUsuario,
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
            await pins.provisionByUserId(createdUser.internalUser.idUsuario);
        } catch {
            return res.status(201).json({
                ...createdResponse(user, createdUser, false),
                recoverable: true,
                message:
                    "La cuenta fue creada, pero no se pudo generar su PIN. Se aprovisionara en el primer acceso y no se solicito el correo de establecimiento de contrasena.",
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
