import { randomBytes } from "node:crypto";
import { OFFICIAL_ROLES, FUNCTIONAL_ROLES } from "../../../config/roles.js";
import { USER_STATUS } from "../../../config/userLifecycle.js";

const MANAGEMENT_VARIABLES = [
    "AUTH0_DOMAIN",
    "AUTH0_MANAGEMENT_CLIENT_ID",
    "AUTH0_MANAGEMENT_CLIENT_SECRET",
    "AUTH0_DATABASE_CONNECTION",
];
const PASSWORD_EMAIL_VARIABLES = [
    "AUTH0_DOMAIN",
    "AUTH0_DATABASE_CONNECTION",
    "AUTH0_PASSWORD_RESET_CLIENT_ID",
];
const DEFAULT_AUTH0_REQUEST_TIMEOUT_MS = 8000;
const MIN_AUTH0_REQUEST_TIMEOUT_MS = 100;
const MAX_AUTH0_REQUEST_TIMEOUT_MS = 30000;
const AUTH0_USER_STATUSES = new Set([
    USER_STATUS.ACTIVE,
    USER_STATUS.UNLINKED,
]);
export const AUTH0_MANAGEMENT_SCOPES = Object.freeze([
    "read:users",
    "create:users",
    "update:users",
    "read:roles",
]);
export class Auth0ServiceError extends Error {
    constructor(code, message, { status, details, category, retryAfterSeconds } = {}) {
        super(message);
        this.name = "Auth0ServiceError";
        this.code = code;
        this.status = status;
        this.details = details;
        this.category = category;
        this.retryAfterSeconds = retryAfterSeconds;
    }
}

function readRequestTimeout() {
    const configuredValue = process.env.AUTH0_REQUEST_TIMEOUT_MS;

    if (configuredValue === undefined || configuredValue.trim() === "") {
        return DEFAULT_AUTH0_REQUEST_TIMEOUT_MS;
    }

    const timeout = Number(configuredValue);
    if (
        !Number.isInteger(timeout) ||
        timeout < MIN_AUTH0_REQUEST_TIMEOUT_MS ||
        timeout > MAX_AUTH0_REQUEST_TIMEOUT_MS
    ) {
        throw new Auth0ServiceError(
            "AUTH0_CONFIGURATION_ERROR",
            `AUTH0_REQUEST_TIMEOUT_MS debe ser un entero entre ${MIN_AUTH0_REQUEST_TIMEOUT_MS} y ${MAX_AUTH0_REQUEST_TIMEOUT_MS}.`,
        );
    }

    return timeout;
}

async function fetchWithDeadline(url, options, { errorCode, errorMessage }) {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, readRequestTimeout());

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch {
        throw new Auth0ServiceError(errorCode, errorMessage, {
            category: timedOut ? "timeout" : "network",
        });
    } finally {
        clearTimeout(timeout);
    }
}

function readConfiguration(variableNames) {
    const missingVariables = variableNames.filter(
        (variable) => !process.env[variable]?.trim(),
    );

    if (missingVariables.length > 0) {
        throw new Auth0ServiceError(
            "AUTH0_CONFIGURATION_ERROR",
            `Faltan variables de entorno Auth0 requeridas: ${missingVariables.join(", ")}`,
        );
    }

    return Object.fromEntries(
        variableNames.map((variable) => [variable, process.env[variable].trim()]),
    );
}

function assertNonEmptyString(value, fieldName) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Auth0ServiceError(
            "INVALID_ARGUMENT",
            `El campo ${fieldName} es obligatorio.`,
        );
    }

    return value.trim();
}

function generateTemporaryPassword() {
    // El sufijo cubre politicas habituales sin reducir la entropia aleatoria.
    return `${randomBytes(32).toString("base64url")}aA1!`;
}

async function readSuccessfulJson(response, message) {
    try {
        return await response.json();
    } catch {
        throw new Auth0ServiceError("AUTH0_INVALID_RESPONSE", message);
    }
}

async function readJsonSafely(response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

function getAuth0ErrorCode(defaultCode, response, body) {
    if (response.status === 429) {
        return "AUTH0_RATE_LIMITED";
    }

    if (response.status >= 500) {
        return "AUTH0_UPSTREAM_ERROR";
    }

    if (response.status === 403) {
        return "AUTH0_INSUFFICIENT_SCOPE";
    }

    if (response.status === 401) {
        return "AUTH0_MANAGEMENT_UNAUTHORIZED";
    }

    if (
        response.status === 409 &&
        new Set(["AUTH0_CREATE_USER_FAILED", "AUTH0_UPDATE_USER_FAILED"]).has(defaultCode)
    ) {
        return "USER_EMAIL_ALREADY_EXISTS";
    }

    if (typeof body?.errorCode === "string") {
        return body.errorCode;
    }

    return defaultCode;
}

function buildAuth0Failure(defaultCode, defaultMessage, response, body) {
    const code = getAuth0ErrorCode(defaultCode, response, body);

    if (code === "USER_EMAIL_ALREADY_EXISTS") {
        return new Auth0ServiceError(
            "USER_EMAIL_ALREADY_EXISTS",
            "Ya existe un usuario con ese correo.",
            { status: response.status, details: body },
        );
    }

    const message =
        code === "AUTH0_INSUFFICIENT_SCOPE"
            ? "La aplicacion Machine to Machine de Auth0 no tiene permisos suficientes para esta operacion."
            : defaultMessage;

    const category = response.status === 429
        ? "rate_limit"
        : response.status >= 500
            ? "upstream"
            : "client";
    const retryAfterHeader = response.headers?.get?.("retry-after");
    const parsedRetryAfter = Number(retryAfterHeader);
    const retryAfterSeconds = Number.isFinite(parsedRetryAfter) && parsedRetryAfter >= 0
        ? parsedRetryAfter
        : undefined;

    return new Auth0ServiceError(code, message, {
        status: response.status,
        details: body,
        category,
        retryAfterSeconds,
    });
}

async function requestManagementToken() {
    const configuration = readConfiguration(MANAGEMENT_VARIABLES);
    const response = await fetchWithDeadline(`https://${configuration.AUTH0_DOMAIN}/oauth/token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                grant_type: "client_credentials",
                client_id: configuration.AUTH0_MANAGEMENT_CLIENT_ID,
                client_secret: configuration.AUTH0_MANAGEMENT_CLIENT_SECRET,
                audience: `https://${configuration.AUTH0_DOMAIN}/api/v2/`,
                scope: AUTH0_MANAGEMENT_SCOPES.join(" "),
            }),
        }, {
            errorCode: "AUTH0_TOKEN_REQUEST_FAILED",
            errorMessage: "No fue posible solicitar autorizacion administrativa a Auth0.",
        });

    const body = await readJsonSafely(response);

    if (!response.ok) {
        throw buildAuth0Failure(
            "AUTH0_TOKEN_REQUEST_FAILED",
            "Auth0 rechazo la autorizacion administrativa.",
            response,
            body,
        );
    }

    if (typeof body?.access_token !== "string" || body.access_token.length === 0) {
        throw new Auth0ServiceError(
            "AUTH0_INVALID_RESPONSE",
            "Auth0 no entrego una autorizacion administrativa valida.",
        );
    }

    return {
        domain: configuration.AUTH0_DOMAIN,
        connection: configuration.AUTH0_DATABASE_CONNECTION,
        accessToken: body.access_token,
    };
}

async function fetchAuth0Json({
    domain,
    accessToken,
    path,
    method = "GET",
    body,
    errorCode,
    errorMessage,
}) {
    const response = await fetchWithDeadline(`https://${domain}/api/v2/${path.replace(/^\/+/, "")}`, {
            method,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                ...(body === undefined ? {} : { "Content-Type": "application/json" }),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        }, { errorCode, errorMessage });

    const responseBody = await readJsonSafely(response);

    if (!response.ok) {
        throw buildAuth0Failure(errorCode, errorMessage, response, responseBody);
    }

    if (response.status === 204) {
        return null;
    }

    if (responseBody === null) {
        throw new Auth0ServiceError(
            "AUTH0_INVALID_RESPONSE",
            "Auth0 no entrego una respuesta valida.",
        );
    }

    return responseBody;
}

async function resolveRoleId({ domain, accessToken, roleName }) {
    const pageSize = 100;

    for (let page = 0; ; page += 1) {
        const roles = await fetchAuth0Json({
            domain,
            accessToken,
            path: `roles?per_page=${pageSize}&page=${page}`,
            errorCode: "AUTH0_LIST_ROLES_FAILED",
            errorMessage: "No fue posible consultar los roles configurados en Auth0.",
        });

        if (!Array.isArray(roles)) {
            throw new Auth0ServiceError(
                "AUTH0_INVALID_RESPONSE",
                "Auth0 no entrego una lista de roles valida.",
            );
        }

        const selectedRole = roles.find(
            (role) => role?.name === roleName && typeof role.id === "string",
        );

        if (selectedRole?.id) {
            return selectedRole.id;
        }

        if (roles.length < pageSize) {
            throw new Auth0ServiceError(
                "AUTH0_ROLE_NOT_FOUND",
                "El rol solicitado no existe en Auth0.",
            );
        }
    }
}

async function resolveRoleReplacement({ domain, accessToken, roleName }) {
    const pageSize = 100;
    const officialRoleIds = [];
    let selectedRoleId;

    for (let page = 0; ; page += 1) {
        const roles = await fetchAuth0Json({
            domain,
            accessToken,
            path: `roles?per_page=${pageSize}&page=${page}`,
            errorCode: "AUTH0_LIST_ROLES_FAILED",
            errorMessage: "No fue posible consultar los roles configurados en Auth0.",
        });

        if (!Array.isArray(roles)) {
            throw new Auth0ServiceError(
                "AUTH0_INVALID_RESPONSE",
                "Auth0 no entrego una lista de roles valida.",
            );
        }

        roles.forEach((role) => {
            if (typeof role?.id !== "string") return;
            if (role.name === roleName) selectedRoleId = role.id;
            if (OFFICIAL_ROLES.has(role.name)) officialRoleIds.push(role.id);
        });

        if (roles.length < pageSize) {
            if (!selectedRoleId) {
                throw new Auth0ServiceError(
                    "AUTH0_ROLE_NOT_FOUND",
                    "El rol solicitado no existe en Auth0.",
                );
            }
            return { roleId: selectedRoleId, officialRoleIds };
        }
    }
}

async function assignRoleToUser({
    domain,
    accessToken,
    userId,
    roleId,
    throwOnFailure = false,
}) {
    try {
        const response = await fetchWithDeadline(
            `https://${domain}/api/v2/users/${encodeURIComponent(userId)}/roles`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ roles: [roleId] }),
            },
            {
                errorCode: "AUTH0_ROLE_ASSIGNMENT_FAILED",
                errorMessage: "No fue posible asignar el rol del usuario en Auth0.",
            },
        );

        if (!response.ok) {
            const body = await readJsonSafely(response);
            throw buildAuth0Failure(
                "AUTH0_ROLE_ASSIGNMENT_FAILED",
                "No fue posible asignar el rol del usuario en Auth0.",
                response,
                body,
            );
        }

        return true;
    } catch (error) {
        if (throwOnFailure) throw error;
        return false;
    }
}

async function replaceUserRole({ domain, accessToken, userId, roleName }) {
    const { roleId, officialRoleIds } = await resolveRoleReplacement({
        domain,
        accessToken,
        roleName,
    });

    if (officialRoleIds.length > 0) {
        await fetchAuth0Json({
            domain,
            accessToken,
            path: `users/${encodeURIComponent(userId)}/roles`,
            method: "DELETE",
            body: { roles: officialRoleIds },
            errorCode: "AUTH0_ROLE_REPLACE_FAILED",
            errorMessage: "No fue posible actualizar el rol del usuario en Auth0.",
        });
    }

    await assignRoleToUser({
        domain,
        accessToken,
        userId,
        roleId,
        throwOnFailure: true,
    });
}

export async function createAuth0User({ email, rolUsuario }) {
    if (!FUNCTIONAL_ROLES.includes(rolUsuario)) throw new Auth0ServiceError("INVALID_ROLE", "Rol no asignable mediante gestion funcional.");
    const normalizedUser = {
        email: assertNonEmptyString(email, "email"),
        role: assertNonEmptyString(rolUsuario, "rolUsuario"),
    };
    const { domain, connection, accessToken } = await requestManagementToken();
    const roleId = await resolveRoleId({
        domain,
        accessToken,
        roleName: normalizedUser.role,
    });
    const temporaryPassword = generateTemporaryPassword();
    const response = await fetchWithDeadline(`https://${domain}/api/v2/users`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: normalizedUser.email,
                connection,
                password: temporaryPassword,
            }),
        }, {
            errorCode: "AUTH0_CREATE_USER_FAILED",
            errorMessage: "No fue posible crear el usuario en Auth0.",
        });

    if (!response.ok) {
        const body = await readJsonSafely(response);
        throw buildAuth0Failure(
            "AUTH0_CREATE_USER_FAILED",
            "Auth0 rechazo la creacion del usuario.",
            response,
            body,
        );
    }

    const body = await readSuccessfulJson(
        response,
        "Auth0 no entrego un identificador de usuario valido.",
    );

    if (typeof body.user_id !== "string" || body.user_id.length === 0) {
        throw new Auth0ServiceError(
            "AUTH0_INVALID_RESPONSE",
            "Auth0 no entrego un identificador de usuario valido.",
        );
    }

    const roleAssignmentCompleted = await assignRoleToUser({
        domain,
        accessToken,
        userId: body.user_id,
        roleId,
    });

    return { userId: body.user_id, roleAssignmentCompleted };
}

export async function updateAuth0User({
    userId,
    correoUsuario,
    rolUsuario,
    rolUsuarioAnterior,
}) {
    if (!FUNCTIONAL_ROLES.includes(rolUsuario)) throw new Auth0ServiceError("INVALID_ROLE", "Rol no asignable mediante gestion funcional.");
    const normalizedUser = {
        userId: assertNonEmptyString(userId, "userId"),
        email: assertNonEmptyString(correoUsuario, "correoUsuario"),
        role: assertNonEmptyString(rolUsuario, "rolUsuario"),
    };
    const { domain, accessToken } = await requestManagementToken();

    await fetchAuth0Json({
        domain,
        accessToken,
        path: `users/${encodeURIComponent(normalizedUser.userId)}`,
        method: "PATCH",
        body: {
            email: normalizedUser.email,
            app_metadata: {
                rolUsuario: normalizedUser.role,
            },
        },
        errorCode: "AUTH0_UPDATE_USER_FAILED",
        errorMessage: "No fue posible actualizar el usuario en Auth0.",
    });

    if (rolUsuarioAnterior !== normalizedUser.role) {
        await replaceUserRole({
            domain,
            accessToken,
            userId: normalizedUser.userId,
            roleName: normalizedUser.role,
        });
    }

    return {
        idUsuarioAutenticacionExterna: normalizedUser.userId,
        correoUsuario: normalizedUser.email,
        rolUsuario: normalizedUser.role,
    };
}

export async function getAuth0UserRole(userId) {
    const { domain, accessToken } = await requestManagementToken();
    const result = await fetchAuth0Json({
        domain,
        accessToken,
        path: `users/${encodeURIComponent(assertNonEmptyString(userId, "userId"))}/roles?per_page=100&page=0&include_totals=true`,
        errorCode: "AUTH0_GET_USER_ROLES_FAILED",
        errorMessage: "No fue posible consultar el rol del usuario en Auth0.",
    });

    if (!Array.isArray(result?.roles) || !Number.isInteger(result.total) || result.total !== result.roles.length) {
        throw new Auth0ServiceError("AUTH0_INVALID_RESPONSE", "Auth0 no entrego una lista completa de roles valida.");
    }

    const officialRoles = result.roles
        .map((role) => role?.name)
        .filter((name) => OFFICIAL_ROLES.has(name));

    return officialRoles.length === 1 ? officialRoles[0] : null;
}

export async function setAuth0UserStatus({ userId, estadoUsuario }) {
    const normalizedUserId = assertNonEmptyString(userId, "userId");
    const normalizedStatus = assertNonEmptyString(estadoUsuario, "estadoUsuario");

    if (!AUTH0_USER_STATUSES.has(normalizedStatus)) {
        throw new Auth0ServiceError(
            "INVALID_STATUS",
            "El estado no es asignable en Auth0.",
        );
    }

    const { domain, accessToken } = await requestManagementToken();

    await fetchAuth0Json({
        domain,
        accessToken,
        path: `users/${encodeURIComponent(normalizedUserId)}`,
        method: "PATCH",
        body: {
            blocked: normalizedStatus === USER_STATUS.UNLINKED,
            app_metadata: { estadoUsuario: normalizedStatus },
        },
        errorCode: "AUTH0_UPDATE_USER_STATUS_FAILED",
        errorMessage: "No fue posible actualizar el estado del usuario en Auth0.",
    });

    return {
        idUsuarioAutenticacionExterna: normalizedUserId,
        estadoUsuario: normalizedStatus,
    };
}

export async function requestPasswordSetupEmail({ email }) {
    const normalizedEmail = assertNonEmptyString(email, "email");
    const configuration = readConfiguration(PASSWORD_EMAIL_VARIABLES);
    const response = await fetchWithDeadline(
            `https://${configuration.AUTH0_DOMAIN}/dbconnections/change_password`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    client_id: configuration.AUTH0_PASSWORD_RESET_CLIENT_ID,
                    email: normalizedEmail,
                    connection: configuration.AUTH0_DATABASE_CONNECTION,
                }),
            },
            {
                errorCode: "AUTH0_PASSWORD_EMAIL_FAILED",
                errorMessage: "No fue posible solicitar el correo de establecimiento de contrasena.",
            },
        );

    if (!response.ok) {
        const body = await readJsonSafely(response);
        throw buildAuth0Failure(
            "AUTH0_PASSWORD_EMAIL_FAILED",
            "Auth0 rechazo la solicitud del correo de establecimiento de contrasena.",
            response,
            body,
        );
    }

    return { requested: true };
}
