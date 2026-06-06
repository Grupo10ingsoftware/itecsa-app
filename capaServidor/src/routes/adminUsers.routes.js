import { Router } from "express";
import checkJwt from "../middlewares/checkJwt.js";
import requireAdministrador from "../middlewares/requireAdministrador.js";
import {
    AUTH0_MANAGEMENT_SCOPES,
    Auth0ServiceError,
    createAuth0User,
    listAuth0Users,
    requestPasswordSetupEmail,
    setAuth0UserStatus,
    updateAuth0User,
} from "../services/auth0Management.service.js";

const USER_FIELDS = new Set([
    "primerNombre",
    "apellidoPaterno",
    "correoUsuario",
    "rutUsuario",
    "rolUsuario",
]);
const USER_UPDATE_FIELDS = new Set([
    "primerNombre",
    "apellidoPaterno",
    "correoUsuario",
    "rolUsuario",
    "estadoUsuario",
]);
const USER_STATUS_FIELDS = new Set(["estadoUsuario"]);
const PASSWORD_SETUP_EMAIL_FIELDS = new Set(["correoUsuario"]);
const ROLES = new Set([
    "Administrador",
    "Gerencia",
    "Operario",
    "Ventas",
    "Cobranzas",
]);
const USER_STATUSES = new Set(["Activo", "Desvinculado"]);
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INTERNAL_ERROR_MESSAGE = "No fue posible crear el usuario.";
const PASSWORD_EMAIL_ERROR_MESSAGE =
    "No fue posible solicitar el correo de establecimiento de contrasena.";
const LIST_USERS_ERROR_MESSAGE = "No fue posible consultar los usuarios.";
const UPDATE_USER_ERROR_MESSAGE = "No fue posible actualizar el usuario.";
const UPDATE_STATUS_ERROR_MESSAGE = "No fue posible actualizar el estado del usuario.";

function logAuth0Failure(context, error) {
    if (error instanceof Auth0ServiceError) {
        console.error(`[admin-users] ${context}`, {
            code: error.code,
            status: error.status,
            message: error.message,
        });
        return;
    }

    console.error(`[admin-users] ${context}`, error);
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
        response.message = "La aplicacion administrativa de Auth0 no tiene permisos suficientes para consultar o modificar usuarios.";
        response.requiredScopes = AUTH0_MANAGEMENT_SCOPES;
    }

    return response;
}

function invalidRequest(message) {
    return { valid: false, message };
}

function normalizeRut(value) {
    return value.replace(/[^0-9kK]/g, "").toUpperCase();
}

function formatRut(value) {
    const normalizedRut = normalizeRut(value);
    const body = normalizedRut.slice(0, -1);
    const verifier = normalizedRut.slice(-1);
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    return `${formattedBody}-${verifier}`;
}

function isValidRut(value) {
    const normalizedRut = normalizeRut(value);
    const body = normalizedRut.slice(0, -1);
    const verifier = normalizedRut.slice(-1);

    if (!/^\d{7,8}$/.test(body) || !/^[0-9K]$/.test(verifier)) {
        return false;
    }

    let sum = 0;
    let multiplier = 2;

    for (let index = body.length - 1; index >= 0; index -= 1) {
        sum += Number(body[index]) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const remainder = 11 - (sum % 11);
    const expectedVerifier =
        remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);

    return verifier === expectedVerifier;
}

function validateUserPayload(body, allowedFields = USER_FIELDS) {
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
        return invalidRequest("Los datos del usuario no son validos.");
    }

    if (Object.keys(body).some((field) => !allowedFields.has(field))) {
        return invalidRequest("La solicitud contiene campos no permitidos.");
    }

    const user = {};
    for (const field of allowedFields) {
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

    if (user.rutUsuario) {
        if (!isValidRut(user.rutUsuario)) {
            return invalidRequest("El rutUsuario no es valido.");
        }

        user.rutUsuario = formatRut(user.rutUsuario);
    }

    if (user.estadoUsuario && !USER_STATUSES.has(user.estadoUsuario)) {
        return invalidRequest("El estadoUsuario no es valido.");
    }

    return { valid: true, user };
}

function validateRequest(body) {
    return validateUserPayload(body, USER_FIELDS);
}

function validateUpdateRequest(body) {
    return validateUserPayload(body, USER_UPDATE_FIELDS);
}

function validateStatusRequest(body) {
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
        return invalidRequest("Los datos del estado no son validos.");
    }

    if (Object.keys(body).some((field) => !USER_STATUS_FIELDS.has(field))) {
        return invalidRequest("La solicitud contiene campos no permitidos.");
    }

    if (typeof body.estadoUsuario !== "string" || body.estadoUsuario.trim().length === 0) {
        return invalidRequest("El campo estadoUsuario es obligatorio.");
    }

    const estadoUsuario = body.estadoUsuario.trim();

    if (!USER_STATUSES.has(estadoUsuario)) {
        return invalidRequest("El estadoUsuario no es valido.");
    }

    return { valid: true, estadoUsuario };
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

function parseIntegerQuery(value, fallback, { min, max }) {
    const parsedValue = Number.parseInt(value, 10);

    if (!Number.isInteger(parsedValue)) {
        return fallback;
    }

    return Math.min(Math.max(parsedValue, min), max);
}

function parseListQuery(query) {
    const page = parseIntegerQuery(query.page, 1, { min: 1, max: 500 });
    const perPage = parseIntegerQuery(query.perPage, 10, { min: 1, max: 50 });
    const search = typeof query.search === "string" ? query.search.trim() : "";
    const estadoUsuario =
        typeof query.estadoUsuario === "string" ? query.estadoUsuario.trim() : "";

    if (estadoUsuario && !USER_STATUSES.has(estadoUsuario)) {
        return invalidRequest("El estadoUsuario no es valido.");
    }

    return {
        valid: true,
        filters: {
            page,
            perPage,
            search,
            estadoUsuario,
        },
    };
}

function createdResponse(user, userId, passwordSetupEmailRequested) {
    return {
        idUsuarioAutenticacionExterna: userId,
        correoUsuario: user.correoUsuario,
        rut: user.rutUsuario,
        rolUsuario: user.rolUsuario,
        passwordSetupEmailRequested,
    };
}

export function createListAdminUsersHandler({ listUsers = listAuth0Users } = {}) {
    return async function listAdminUsersHandler(req, res) {
        const validatedQuery = parseListQuery(req.query ?? {});

        if (!validatedQuery.valid) {
            return res.status(400).json({ message: validatedQuery.message });
        }

        try {
            const result = await listUsers(validatedQuery.filters);
            return res.status(200).json(result);
        } catch (error) {
            logAuth0Failure("listUsers failed", error);
            return res.status(500).json(auth0ErrorResponse(error, LIST_USERS_ERROR_MESSAGE));
        }
    };
}

export function createUpdateAdminUserHandler({ updateUser = updateAuth0User } = {}) {
    return async function updateAdminUserHandler(req, res) {
        const userId = req.params.userId;
        const validatedRequest = validateUpdateRequest(req.body);

        if (typeof userId !== "string" || userId.trim().length === 0) {
            return res.status(400).json({ message: "El identificador del usuario es obligatorio." });
        }

        if (!validatedRequest.valid) {
            return res.status(400).json({ message: validatedRequest.message });
        }

        try {
            const updatedUser = await updateUser({
                userId: userId.trim(),
                ...validatedRequest.user,
            });
            return res.status(200).json(updatedUser);
        } catch (error) {
            if (
                error instanceof Auth0ServiceError &&
                error.code === "USER_EMAIL_ALREADY_EXISTS"
            ) {
                return res.status(409).json({
                    message: "Ya existe un usuario con ese correo.",
                });
            }

            logAuth0Failure("updateUser failed", error);
            return res.status(500).json(auth0ErrorResponse(error, UPDATE_USER_ERROR_MESSAGE));
        }
    };
}

export function createUpdateAdminUserStatusHandler({ updateStatus = setAuth0UserStatus } = {}) {
    return async function updateAdminUserStatusHandler(req, res) {
        const userId = req.params.userId;
        const validatedRequest = validateStatusRequest(req.body);

        if (typeof userId !== "string" || userId.trim().length === 0) {
            return res.status(400).json({ message: "El identificador del usuario es obligatorio." });
        }

        if (!validatedRequest.valid) {
            return res.status(400).json({ message: validatedRequest.message });
        }

        try {
            const updatedUser = await updateStatus({
                userId: userId.trim(),
                estadoUsuario: validatedRequest.estadoUsuario,
            });
            return res.status(200).json(updatedUser);
        } catch (error) {
            logAuth0Failure("updateUserStatus failed", error);
            return res.status(500).json(auth0ErrorResponse(error, UPDATE_STATUS_ERROR_MESSAGE));
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
                primerNombre: user.primerNombre,
                apellidoPaterno: user.apellidoPaterno,
                rutUsuario: user.rutUsuario,
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

            logAuth0Failure("createUser failed", error);
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
    listUsers,
    updateUser,
    updateStatus,
} = {}) {
    const router = Router();
    router.get(
        "/users",
        authenticate,
        authorize,
        createListAdminUsersHandler({ listUsers }),
    );
    router.post(
        "/users",
        authenticate,
        authorize,
        createAdminUserHandler({ createUser, requestPasswordEmail }),
    );
    router.patch(
        "/users/:userId",
        authenticate,
        authorize,
        createUpdateAdminUserHandler({ updateUser }),
    );
    router.patch(
        "/users/:userId/status",
        authenticate,
        authorize,
        createUpdateAdminUserStatusHandler({ updateStatus }),
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
