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

export class Auth0ServiceError extends Error {
    constructor(code, message) {
        super(message);
        this.name = "Auth0ServiceError";
        this.code = code;
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
            }),
        });
    } catch {
        throw new Auth0ServiceError(
            "AUTH0_TOKEN_REQUEST_FAILED",
            "No fue posible solicitar autorizacion administrativa a Auth0.",
        );
    }

    if (!response.ok) {
        throw new Auth0ServiceError(
            "AUTH0_TOKEN_REQUEST_FAILED",
            "Auth0 rechazo la autorizacion administrativa.",
        );
    }

    const body = await readSuccessfulJson(
        response,
        "Auth0 no entrego una autorizacion administrativa valida.",
    );

    if (typeof body.access_token !== "string" || body.access_token.length === 0) {
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

async function resolveRoleId({ domain, accessToken, roleName }) {
    const pageSize = 100;

    for (let page = 0; ; page += 1) {
        let response;

        try {
            response = await fetch(
                `https://${domain}/api/v2/roles?per_page=${pageSize}&page=${page}`,
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                },
            );
        } catch {
            throw new Auth0ServiceError(
                "AUTH0_LIST_ROLES_FAILED",
                "No fue posible consultar los roles configurados en Auth0.",
            );
        }

        if (!response.ok) {
            throw new Auth0ServiceError(
                "AUTH0_LIST_ROLES_FAILED",
                "Auth0 rechazo la consulta de roles configurados.",
            );
        }

        const roles = await readSuccessfulJson(
            response,
            "Auth0 no entrego una lista de roles valida.",
        );

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

export async function createAuth0User({ email, rolUsuario }) {
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
    let response;

    try {
        response = await fetch(`https://${domain}/api/v2/users`, {
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
        });
    } catch {
        throw new Auth0ServiceError(
            "AUTH0_CREATE_USER_FAILED",
            "No fue posible crear el usuario en Auth0.",
        );
    }

    if (response.status === 409) {
        throw new Auth0ServiceError(
            "USER_EMAIL_ALREADY_EXISTS",
            "Ya existe un usuario con ese correo.",
        );
    }

    if (!response.ok) {
        throw new Auth0ServiceError(
            "AUTH0_CREATE_USER_FAILED",
            "Auth0 rechazo la creacion del usuario.",
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
        );
    }

    return { requested: true };
}
