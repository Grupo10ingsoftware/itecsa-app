import { respondError } from "../../../errors/httpErrors.js";
import { roleFromPayload, manageableRoles, canManageUser } from "../../../../../shared/authorization.js";
import {
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
    validateUserMovementsQuery,
    validatePasswordSetupEmailRequest,
} from "../validators/adminUsers.validator.js";
import userRepository, {
    UserRepositoryError,
} from "../repo/users.repo.js";
import {
    isActiveUserStatus,
    USER_STATUS,
} from "../../../config/userLifecycle.js";

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
const INVALID_STATUS_TRANSITION_MESSAGE =
    "La transicion de estado del usuario no esta permitida.";
const SELF_UNLINK_ERROR_MESSAGE =
    "No puedes desvincular tu propio usuario.";
const SELF_ROLE_UPDATE_ERROR_MESSAGE =
    "No puedes cambiar tu propio rol.";
const ACTIVE_USER_STATUS = USER_STATUS.ACTIVE;
const PENDING_FIRST_LOGIN_USER_STATUS = USER_STATUS.PENDING_FIRST_LOGIN;
const PENDING_ROLE_USER_STATUS = USER_STATUS.PENDING_ROLE;

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

function createdResponse(user, createdUser, {
    internalUserPersisted,
    pinProvisioned,
    passwordSetupEmailRequested,
}) {
    const roleAssignmentCompleted = createdUser.roleAssignmentCompleted === true;
    const completed =
        internalUserPersisted === true &&
        roleAssignmentCompleted &&
        pinProvisioned === true &&
        passwordSetupEmailRequested === true;

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
        outcome: completed ? "completed" : "failed_recoverable",
        recoverable: !completed,
        internalUserPersisted,
        roleAssignmentCompleted,
        pinProvisioned,
        passwordSetupEmailRequested,
    };
}

function internalError(req, res) {
    return respondError(new Error(), req, res);
}

function externalIdentityError(req, res, error, message) {
    if (
        !(error instanceof Auth0ServiceError) ||
        !new Set(["timeout", "network", "upstream", "rate_limit"]).has(error.category)
    ) {
        return internalError(req, res, message);
    }

    if (
        Number.isFinite(error.retryAfterSeconds) &&
        typeof res.set === "function"
    ) {
        res.set("Retry-After", String(error.retryAfterSeconds));
    }

    return res.status(503).json({
        code: "IDENTITY_PROVIDER_UNAVAILABLE",
        message,
        requestId: req.requestId,
    });
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
            return internalError(req, res, LIST_USERS_ERROR_MESSAGE);
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
            return internalError(req, res, LIST_USERS_ERROR_MESSAGE);
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
        let roleTransitionStarted = false;
        let externalUpdateCompleted = false;
        let existingUser;

        try {
            existingUser = await users.findByAuth0Id(normalizedUserId);

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

            const roleChanged = existingUser.rolUsuario !== user.rolUsuario;
            if (roleChanged) {
                await users.beginRoleTransition(
                    normalizedUserId,
                    existingUser.rolUsuario,
                );
                roleTransitionStarted = true;
            }

            await updateUser({
                userId: normalizedUserId,
                correoUsuario: user.correoUsuario,
                rolUsuario: user.rolUsuario,
                rolUsuarioAnterior: existingUser.rolUsuario,
            });
            externalUpdateCompleted = true;

            const updatedUser = roleChanged
                ? await users.completeRoleTransition(
                    normalizedUserId,
                    existingUser.rolUsuario,
                    user,
                )
                : await users.updateByAuth0Id(normalizedUserId, user);
            return res.status(200).json(managementUserResponse(updatedUser));
        } catch (error) {
            if (
                error instanceof Auth0ServiceError &&
                error.code === "USER_EMAIL_ALREADY_EXISTS"
            ) {
                if (roleTransitionStarted && !externalUpdateCompleted) {
                    try {
                        await users.cancelRoleTransition(
                            normalizedUserId,
                            existingUser.rolUsuario,
                        );
                    } catch {
                        return internalError(req, res, UPDATE_USER_ERROR_MESSAGE);
                    }
                }
                return res.status(409).json({
                    message: "Ya existe un usuario con ese correo.",
                });
            }

            if (isDuplicateUserError(error)) {
                if (roleTransitionStarted && externalUpdateCompleted) {
                    return res.status(409).json({
                        code: "USER_UPDATE_PENDING_RECONCILIATION",
                        recoverable: true,
                        message:
                            "Auth0 fue actualizado, pero el usuario interno quedo pendiente de conciliacion.",
                    });
                }
                return res.status(409).json({
                    message: "Ya existe un usuario con ese correo.",
                });
            }

            if (isMissingUserError(error)) {
                return res.status(404).json({ message: "El usuario no existe." });
            }

            return externalIdentityError(
                req,
                res,
                error,
                UPDATE_USER_ERROR_MESSAGE,
            );
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

            const nextStatus = validatedRequest.estadoUsuario;
            const currentStatus = existingUser.estadoUsuario;
            if (
                nextStatus === USER_STATUS.ACTIVE &&
                !isActiveUserStatus(currentStatus) &&
                currentStatus !== USER_STATUS.UNLINKED
            ) {
                return res.status(409).json({
                    message: INVALID_STATUS_TRANSITION_MESSAGE,
                });
            }

            if (
                (nextStatus === USER_STATUS.ACTIVE && isActiveUserStatus(currentStatus)) ||
                (nextStatus === USER_STATUS.UNLINKED && currentStatus === USER_STATUS.UNLINKED)
            ) {
                return res.status(200).json(managementUserResponse(existingUser));
            }

            if (nextStatus === USER_STATUS.UNLINKED) {
                const updatedUser = await users.updateStatusIfCurrent(
                    normalizedUserId,
                    currentStatus,
                    USER_STATUS.UNLINKED,
                );
                await pins.invalidateByAuth0Id(normalizedUserId);
                await updateStatus({
                    userId: normalizedUserId,
                    estadoUsuario: USER_STATUS.UNLINKED,
                });
                return res.status(200).json(managementUserResponse(updatedUser));
            }

            // Reactivation never reuses a previous PIN. The local row remains
            // deny-by-default until Auth0 has confirmed the unblock.
            await pins.invalidateByAuth0Id(normalizedUserId);
            await updateStatus({
                userId: normalizedUserId,
                estadoUsuario: USER_STATUS.ACTIVE,
            });
            const updatedUser = await users.updateStatusIfCurrent(
                normalizedUserId,
                USER_STATUS.UNLINKED,
                USER_STATUS.ACTIVE,
            );
            try {
                await pins.ensureProvisioned(normalizedUserId);
            } catch (error) {
                await Promise.allSettled([
                    users.updateStatusIfCurrent(
                        normalizedUserId,
                        USER_STATUS.ACTIVE,
                        USER_STATUS.UNLINKED,
                    ),
                    updateStatus({
                        userId: normalizedUserId,
                        estadoUsuario: USER_STATUS.UNLINKED,
                    }),
                ]);
                throw error;
            }
            return res.status(200).json(managementUserResponse(updatedUser));
        } catch (error) {
            if (isMissingUserError(error)) {
                return res.status(404).json({ message: "El usuario no existe." });
            }

            return externalIdentityError(
                req,
                res,
                error,
                UPDATE_STATUS_ERROR_MESSAGE,
            );
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
            if (!isActiveUserStatus(target.estadoUsuario) && target.estadoUsuario !== PENDING_FIRST_LOGIN_USER_STATUS) {
                return res.status(403).json({message:"Usuario desvinculado."});
            }
            await requestPasswordEmail({
                email: validatedRequest.correoUsuario,
            });
        } catch (error) {
            return externalIdentityError(
                req,
                res,
                error,
                PASSWORD_EMAIL_ERROR_MESSAGE,
            );
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
            return internalError(req, res, INTERNAL_ERROR_MESSAGE);
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

            return externalIdentityError(
                req,
                res,
                error,
                INTERNAL_ERROR_MESSAGE,
            );
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
                    ? PENDING_FIRST_LOGIN_USER_STATUS
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
                ...createdResponse(user, createdUser, {
                    internalUserPersisted: false,
                    pinProvisioned: false,
                    passwordSetupEmailRequested: false,
                }),
                message:
                    "La cuenta fue creada, pero no se pudo registrar el usuario interno. No se solicito el correo de establecimiento de contrasena.",
            });
        }

        if (!createdUser.roleAssignmentCompleted) {
            return res.status(201).json({
                ...createdResponse(user, createdUser, {
                    internalUserPersisted: true,
                    pinProvisioned: false,
                    passwordSetupEmailRequested: false,
                }),
                message:
                    "La cuenta fue creada, pero no se pudo asignar el rol de acceso. No se solicito el correo de establecimiento de contrasena.",
            });
        }

        try {
            await pins.provisionByUserId(createdUser.internalUser.idUsuario);
        } catch {
            return res.status(201).json({
                ...createdResponse(user, createdUser, {
                    internalUserPersisted: true,
                    pinProvisioned: false,
                    passwordSetupEmailRequested: false,
                }),
                message:
                    "La cuenta fue creada, pero no se pudo generar su PIN. Se aprovisionara en el primer acceso y no se solicito el correo de establecimiento de contrasena.",
            });
        }

        try {
            await requestPasswordEmail({ email: user.correoUsuario });
        } catch {
            return res.status(201).json({
                ...createdResponse(user, createdUser, {
                    internalUserPersisted: true,
                    pinProvisioned: true,
                    passwordSetupEmailRequested: false,
                }),
                message:
                    "La cuenta fue creada, pero no se pudo solicitar el correo de establecimiento de contrasena.",
            });
        }

        return res
            .status(201)
            .json(createdResponse(user, createdUser, {
                internalUserPersisted: true,
                pinProvisioned: true,
                passwordSetupEmailRequested: true,
            }));
    };
}


export function createAdminUserMovementsHandler({ users = userRepository } = {}) {
    return async function adminUserMovementsHandler(req, res) {
        if (invalidUserId(req.params.userId)) {
            return res.status(400).json({ message: "El identificador del usuario es obligatorio." });
        }
        const query = validateUserMovementsQuery(req.query ?? {});
        if (!query.valid) return res.status(400).json({ message: query.message });
        try {
            const user = await users.findByAuth0Id(req.params.userId.trim());
            if (!user) return res.status(404).json({ message: "El usuario no existe." });
            if (!allowedTarget(req, res, user.rolUsuario)) return;
            const result = await users.listMovements(user.idUsuario, query.filters);
            return res.status(200).json(result);
        } catch {
            return internalError(req, res, "No fue posible consultar los movimientos del usuario.");
        }
    };
}
