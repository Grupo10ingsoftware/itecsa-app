import { randomBytes } from "node:crypto";

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
export const AUTH0_MANAGEMENT_SCOPES = Object.freeze([
    "read:users",
    "create:users",
    "update:users",
    "read:roles",
]);
const OFFICIAL_ROLES = new Set([
    "Administrador",
    "Gerencia",
    "Operario",
    "Ventas",
    "Cobranzas",
]);
const USER_FIELDS = [
    "user_id",
    "email",
    "given_name",
    "family_name",
    "name",
    "blocked",
    "last_login",
    "created_at",
    "updated_at",
    "app_metadata",
    "user_metadata",
];

export class Auth0ServiceError extends Error {
    constructor(code, message, { status, details } = {}) {
        super(message);
        this.name = "Auth0ServiceError";
        this.code = code;
        this.status = status;
        this.details = details;
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
    return `${randomBytes(32).toString("base64url")}aA1!`;
}

async function readJsonSafely(response) {
    const contentType = response.headers?.get?.("content-type");

    if (typeof contentType === "string" && contentType.length > 0 && !contentType.includes("application/json")) {
        return null;
    }

    try {
        return await response.json();
    } catch {
        return null;
    }
}

async function readSuccessfulJson(response, message) {
    const body = await readJsonSafely(response);

    if (body === null) {
        throw new Auth0ServiceError("AUTH0_INVALID_RESPONSE", message);
    }

    return body;
}

function getAuth0ErrorCode(defaultCode, response, body) {
    if (response.status === 403) {
        return "AUTH0_INSUFFICIENT_SCOPE";
    }

    if (response.status === 401) {
        return "AUTH0_MANAGEMENT_UNAUTHORIZED";
    }

    if (response.status === 409) {
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

    return new Auth0ServiceError(code, message, {
        status: response.status,
        details: body,
    });
}

async function requestManagementToken() {
    const configuration = readConfiguration(MANAGEMENT_VARIABLES);
    let response;

    try {
        response = await fetch(`https://${configuration.AUTH0_DOMAIN}/oauth/token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                grant_type: "client_credentials",
                client_id: configuration.AUTH0_MANAGEMENT_CLIENT_ID,
                client_secret: configuration.AUTH0_MANAGEMENT_CLIENT_SECRET,
                audience: `https://${configuration.AUTH0_DOMAIN}/api/v2/`,
                scope: AUTH0_MANAGEMENT_SCOPES.join(" "),
            }),
        });
    } catch {
        throw new Auth0ServiceError(
            "AUTH0_TOKEN_REQUEST_FAILED",
            "No fue posible solicitar autorizacion administrativa a Auth0.",
        );
    }

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
        scope: typeof body.scope === "string" ? body.scope : "",
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
    let response;

    try {
        response = await fetch(`https://${domain}/api/v2/${path.replace(/^\/+/, "")}`, {
            method,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                ...(body === undefined ? {} : { "Content-Type": "application/json" }),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch {
        throw new Auth0ServiceError(errorCode, errorMessage);
    }

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

async function resolveOfficialRoleIds({ domain, accessToken }) {
    const pageSize = 100;
    const roleIds = [];

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
            if (OFFICIAL_ROLES.has(role?.name) && typeof role.id === "string") {
                roleIds.push(role.id);
            }
        });

        if (roles.length < pageSize) {
            return roleIds;
        }
    }
}

async function assignRoleToUser({ domain, accessToken, userId, roleId }) {
    let response;

    try {
        response = await fetch(
            `https://${domain}/api/v2/users/${encodeURIComponent(userId)}/roles`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ roles: [roleId] }),
            },
        );
    } catch {
        return false;
    }

    return response.ok;
}

async function getUserRoles({ domain, accessToken, userId }) {
    try {
        const roles = await fetchAuth0Json({
            domain,
            accessToken,
            path: `users/${encodeURIComponent(userId)}/roles`,
            errorCode: "AUTH0_LIST_USER_ROLES_FAILED",
            errorMessage: "No fue posible consultar los roles del usuario en Auth0.",
        });

        if (!Array.isArray(roles)) {
            return [];
        }

        return roles
            .map((role) => role?.name)
            .filter((roleName) => OFFICIAL_ROLES.has(roleName));
    } catch {
        // La lista de usuarios no debe caer solo porque un usuario no tenga roles consultables.
        return [];
    }
}

async function replaceUserRole({ domain, accessToken, userId, roleName }) {
    const [roleId, officialRoleIds] = await Promise.all([
        resolveRoleId({ domain, accessToken, roleName }),
        resolveOfficialRoleIds({ domain, accessToken }),
    ]);

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

    const assigned = await assignRoleToUser({ domain, accessToken, userId, roleId });

    if (!assigned) {
        throw new Auth0ServiceError(
            "AUTH0_ROLE_REPLACE_FAILED",
            "No fue posible actualizar el rol del usuario en Auth0.",
        );
    }
}

function normalizeAuth0Date(value) {
    if (typeof value !== "string" || value.length === 0) {
        return null;
    }

    return value;
}

function normalizeAuth0User(user, rbacRole) {
    const appMetadata = user?.app_metadata && typeof user.app_metadata === "object" ? user.app_metadata : {};
    const userMetadata = user?.user_metadata && typeof user.user_metadata === "object" ? user.user_metadata : {};
    const primerNombre = typeof user?.given_name === "string" ? user.given_name : "";
    const apellidoPaterno = typeof user?.family_name === "string" ? user.family_name : "";
    const metadataRole = typeof appMetadata.rolUsuario === "string" ? appMetadata.rolUsuario : "";
    const selectedRole = OFFICIAL_ROLES.has(metadataRole) ? metadataRole : rbacRole;
    const estadoUsuario = user?.blocked ? "Desvinculado" : "Vinculado";

    return {
        idUsuarioAutenticacionExterna: user.user_id,
        primerNombre,
        apellidoPaterno,
        nombreCompleto: `${primerNombre} ${apellidoPaterno}`.trim() || user?.name || user?.email || "Usuario sin nombre",
        rut: typeof userMetadata.rut === "string" ? userMetadata.rut : "No disponible",
        correoUsuario: user.email,
        rolUsuario: OFFICIAL_ROLES.has(selectedRole) ? selectedRole : "Sin rol asignado",
        estadoUsuario,
        ultimoAcceso: normalizeAuth0Date(user.last_login),
        fechaCreacion: normalizeAuth0Date(user.created_at),
        fechaActualizacion: normalizeAuth0Date(user.updated_at),
    };
}

function sanitizeAuth0SearchTerm(search) {
    return search
        .trim()
        .replace(/[\\+\-!(){}\[\]^"~*?:/]|&&|\|\|/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function formatSearchRut(search) {
    const normalizedRut = search.replace(/[^0-9kK]/g, "").toUpperCase();

    if (!/^\d{7,8}[0-9K]$/.test(normalizedRut)) {
        return "";
    }

    const body = normalizedRut.slice(0, -1);
    const verifier = normalizedRut.slice(-1);
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    return `${formattedBody}-${verifier}`;
}

function buildAuth0UserSearch({ search, estadoUsuario, rolUsuario }) {
    const queryParts = [];

    if (estadoUsuario === "Vinculado" || estadoUsuario === "Activo") {
        queryParts.push("blocked:false");
    }

    if (estadoUsuario === "Desvinculado") {
        queryParts.push("blocked:true");
    }

    if (OFFICIAL_ROLES.has(rolUsuario)) {
        queryParts.push(`app_metadata.rolUsuario:"${rolUsuario}"`);
    }

    if (typeof search === "string" && search.trim().length > 0) {
        const safeSearch = sanitizeAuth0SearchTerm(search);
        const formattedRut = formatSearchRut(search);

        if (safeSearch.length > 0) {
            const textSearch = safeSearch.length >= 3 ? `*${safeSearch}*` : `${safeSearch}*`;
            const searchFields = [
                `email:${textSearch}`,
                `name:${textSearch}`,
                `given_name:${textSearch}`,
                `family_name:${textSearch}`,
            ];

            if (formattedRut) {
                searchFields.push(`user_metadata.rut:"${formattedRut}"`);
            }

            queryParts.push(`(${searchFields.join(" OR ")})`);
        }
    }

    return queryParts.join(" AND ");
}

function hasOfficialMetadataRole(user) {
    return OFFICIAL_ROLES.has(user?.app_metadata?.rolUsuario);
}

async function fetchAuth0UserCount({ domain, accessToken, query = "" }) {
    const params = new URLSearchParams({
        page: "0",
        per_page: "1",
        include_totals: "true",
        include_fields: "true",
        fields: "user_id",
        search_engine: "v3",
    });

    if (query) {
        params.set("q", query);
    }

    const body = await fetchAuth0Json({
        domain,
        accessToken,
        path: `users?${params.toString()}`,
        errorCode: "AUTH0_LIST_USERS_FAILED",
        errorMessage: "No fue posible consultar el resumen de usuarios en Auth0.",
    });

    if (!Number.isInteger(body?.total)) {
        throw new Auth0ServiceError(
            "AUTH0_INVALID_RESPONSE",
            "Auth0 no entrego un resumen de usuarios valido.",
        );
    }

    return body.total;
}

export async function getAuth0UsersSummary() {
    const { domain, accessToken } = await requestManagementToken();
    const [totalUsuarios, desvinculados] = await Promise.all([
        fetchAuth0UserCount({ domain, accessToken }),
        fetchAuth0UserCount({ domain, accessToken, query: "blocked:true" }),
    ]);

    return {
        totalUsuarios,
        vinculados: Math.max(0, totalUsuarios - desvinculados),
        desvinculados,
    };
}

export async function listAuth0Users({
    page = 1,
    perPage = 10,
    search = "",
    estadoUsuario = "",
    rolUsuario = "",
} = {}) {
    const { domain, accessToken } = await requestManagementToken();
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const safePerPage = Number.isInteger(perPage) && perPage > 0 && perPage <= 50 ? perPage : 10;
    const auth0Page = safePage - 1;
    const searchQuery = buildAuth0UserSearch({ search, estadoUsuario, rolUsuario });
    const params = new URLSearchParams({
        page: String(auth0Page),
        per_page: String(safePerPage),
        include_totals: "true",
        sort: "created_at:-1",
        include_fields: "true",
        fields: USER_FIELDS.join(","),
        search_engine: "v3",
    });

    if (searchQuery) {
        params.set("q", searchQuery);
    }

    const body = await fetchAuth0Json({
        domain,
        accessToken,
        path: `users?${params.toString()}`,
        errorCode: "AUTH0_LIST_USERS_FAILED",
        errorMessage: "No fue posible consultar los usuarios en Auth0.",
    });

    const users = Array.isArray(body) ? body : body?.users;

    if (!Array.isArray(users)) {
        throw new Auth0ServiceError(
            "AUTH0_INVALID_RESPONSE",
            "Auth0 no entrego una lista de usuarios valida.",
        );
    }

    const usersWithoutMetadataRole = users.filter((user) => !hasOfficialMetadataRole(user));
    const rolePairs = await Promise.all(
        usersWithoutMetadataRole.map(async (user) => [
            user.user_id,
            (await getUserRoles({ domain, accessToken, userId: user.user_id }))[0] ?? "",
        ]),
    );
    const rolesByUserId = new Map(rolePairs);

    return {
        usuarios: users.map((user) => normalizeAuth0User(user, rolesByUserId.get(user.user_id))),
        total: Number.isInteger(body?.total) ? body.total : users.length,
        page: safePage,
        perPage: safePerPage,
    };
}

export async function createAuth0User({
    email,
    primerNombre,
    apellidoPaterno,
    rutUsuario,
    rolUsuario,
}) {
    const normalizedUser = {
        email: assertNonEmptyString(email, "email"),
        givenName: assertNonEmptyString(primerNombre, "primerNombre"),
        familyName: assertNonEmptyString(apellidoPaterno, "apellidoPaterno"),
        rut: assertNonEmptyString(rutUsuario, "rutUsuario"),
        role: assertNonEmptyString(rolUsuario, "rolUsuario"),
    };
    const { domain, connection, accessToken } = await requestManagementToken();
    const roleId = await resolveRoleId({
        domain,
        accessToken,
        roleName: normalizedUser.role,
    });
    const temporaryPassword = generateTemporaryPassword();

    let body;

    try {
        body = await fetchAuth0Json({
            domain,
            accessToken,
            path: "users",
            method: "POST",
            body: {
                email: normalizedUser.email,
                given_name: normalizedUser.givenName,
                family_name: normalizedUser.familyName,
                connection,
                password: temporaryPassword,
                app_metadata: { rolUsuario: normalizedUser.role },
                user_metadata: { rut: normalizedUser.rut },
            },
            errorCode: "AUTH0_CREATE_USER_FAILED",
            errorMessage: "Auth0 rechazo la creacion del usuario.",
        });
    } catch (error) {
        if (error instanceof Auth0ServiceError) {
            throw error;
        }

        throw new Auth0ServiceError(
            "AUTH0_CREATE_USER_FAILED",
            "No fue posible crear el usuario en Auth0.",
        );
    }

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
    primerNombre,
    apellidoPaterno,
    correoUsuario,
    rolUsuario,
    estadoUsuario,
}) {
    const normalizedUser = {
        userId: assertNonEmptyString(userId, "userId"),
        givenName: assertNonEmptyString(primerNombre, "primerNombre"),
        familyName: assertNonEmptyString(apellidoPaterno, "apellidoPaterno"),
        email: assertNonEmptyString(correoUsuario, "correoUsuario"),
        role: assertNonEmptyString(rolUsuario, "rolUsuario"),
        status: assertNonEmptyString(estadoUsuario, "estadoUsuario"),
    };
    const { domain, accessToken } = await requestManagementToken();

    await fetchAuth0Json({
        domain,
        accessToken,
        path: `users/${encodeURIComponent(normalizedUser.userId)}`,
        method: "PATCH",
        body: {
            email: normalizedUser.email,
            given_name: normalizedUser.givenName,
            family_name: normalizedUser.familyName,
            blocked: normalizedUser.status === "Desvinculado",
            app_metadata: {
                rolUsuario: normalizedUser.role,
                estadoUsuario: normalizedUser.status,
            },
        },
        errorCode: "AUTH0_UPDATE_USER_FAILED",
        errorMessage: "No fue posible actualizar el usuario en Auth0.",
    });

    await replaceUserRole({
        domain,
        accessToken,
        userId: normalizedUser.userId,
        roleName: normalizedUser.role,
    });

    return {
        idUsuarioAutenticacionExterna: normalizedUser.userId,
        primerNombre: normalizedUser.givenName,
        apellidoPaterno: normalizedUser.familyName,
        nombreCompleto: `${normalizedUser.givenName} ${normalizedUser.familyName}`.trim(),
        correoUsuario: normalizedUser.email,
        rolUsuario: normalizedUser.role,
        estadoUsuario: normalizedUser.status,
    };
}

export async function setAuth0UserStatus({ userId, estadoUsuario }) {
    const normalizedUserId = assertNonEmptyString(userId, "userId");
    const normalizedStatus = assertNonEmptyString(estadoUsuario, "estadoUsuario");
    const { domain, accessToken } = await requestManagementToken();

    await fetchAuth0Json({
        domain,
        accessToken,
        path: `users/${encodeURIComponent(normalizedUserId)}`,
        method: "PATCH",
        body: {
            blocked: normalizedStatus === "Desvinculado",
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
    let response;

    try {
        response = await fetch(
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
        );
    } catch {
        throw new Auth0ServiceError(
            "AUTH0_PASSWORD_EMAIL_FAILED",
            "No fue posible solicitar el correo de establecimiento de contrasena.",
        );
    }

    if (!response.ok) {
        throw new Auth0ServiceError(
            "AUTH0_PASSWORD_EMAIL_FAILED",
            "Auth0 rechazo la solicitud del correo de establecimiento de contrasena.",
            { status: response.status },
        );
    }

    return { requested: true };
}
