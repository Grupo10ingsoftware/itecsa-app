const USER_FIELDS = new Set([
    "nombreUsuario",
    "apellidoUsuario",
    "rutUsuario",
    "correoUsuario",
    "rolUsuario",
]);
const PASSWORD_SETUP_EMAIL_FIELDS = new Set(["correoUsuario"]);
const USER_UPDATE_FIELDS = new Set([
    "nombreUsuario",
    "apellidoUsuario",
    "correoUsuario",
    "rolUsuario",
    "estadoUsuario",
]);
const USER_STATUS_FIELDS = new Set(["estadoUsuario"]);
const ROLES = new Set([
    "Administrador",
    "Gerencia",
    "Producción",
    "Ventas",
    "Cobranzas",
]);
const USER_STATUSES = new Set(["Activo", "Vinculado", "Desvinculado"]);
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RUT_FORMAT = /^(\d{1,2}\.?\d{3}\.?\d{3}-[\dkK])$/;
const LETTERS_AND_SPACES_FORMAT =
    /^[A-Za-z\u00c1\u00c9\u00cd\u00d3\u00da\u00e1\u00e9\u00ed\u00f3\u00fa\u00d1\u00f1\u00dc\u00fc\s]+$/;

function invalidRequest(message) {
    return { valid: false, message };
}

function normalizeUserStatus(value) {
    return value === "Vinculado" ? "Activo" : value;
}

function parseIntegerQuery(value, fallback, { min, max }) {
    const parsedValue = Number.parseInt(value, 10);

    if (!Number.isInteger(parsedValue)) {
        return fallback;
    }

    return Math.min(Math.max(parsedValue, min), max);
}

export function validateAdminUserRequest(body) {
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

    if (!LETTERS_AND_SPACES_FORMAT.test(user.nombreUsuario)) {
        return invalidRequest("El nombreUsuario solo debe contener letras y espacios.");
    }

    if (!LETTERS_AND_SPACES_FORMAT.test(user.apellidoUsuario)) {
        return invalidRequest(
            "El apellidoUsuario solo debe contener letras y espacios.",
        );
    }

    if (!RUT_FORMAT.test(user.rutUsuario)) {
        return invalidRequest("El rutUsuario no tiene un formato valido.");
    }

    if (!ROLES.has(user.rolUsuario)) {
        return invalidRequest("El rolUsuario no es valido.");
    }

    user.correoUsuario = user.correoUsuario.toLowerCase();
    user.rutUsuario = user.rutUsuario.toUpperCase();

    return { valid: true, user };
}

export function validatePasswordSetupEmailRequest(body) {
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

export function validateListUsersQuery(query = {}) {
    const page = parseIntegerQuery(query.page, 1, { min: 1, max: 500 });
    const perPage = parseIntegerQuery(query.perPage, 10, { min: 1, max: 50 });
    const search = typeof query.search === "string" ? query.search.trim() : "";
    const estadoUsuario =
        typeof query.estadoUsuario === "string"
            ? query.estadoUsuario.trim()
            : "";
    const rolUsuario =
        typeof query.rolUsuario === "string" ? query.rolUsuario.trim() : "";

    if (estadoUsuario && !USER_STATUSES.has(estadoUsuario)) {
        return invalidRequest("El estadoUsuario no es valido.");
    }

    if (rolUsuario && !ROLES.has(rolUsuario)) {
        return invalidRequest("El rolUsuario no es valido.");
    }

    return {
        valid: true,
        filters: {
            page,
            perPage,
            search,
            estadoUsuario,
            rolUsuario,
        },
    };
}

export function validateAdminUserUpdateRequest(body) {
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
        return invalidRequest("Los datos del usuario no son validos.");
    }

    if (Object.keys(body).some((field) => !USER_UPDATE_FIELDS.has(field))) {
        return invalidRequest("La solicitud contiene campos no permitidos.");
    }

    const user = {};
    for (const field of USER_UPDATE_FIELDS) {
        if (typeof body[field] !== "string" || body[field].trim().length === 0) {
            return invalidRequest(`El campo ${field} es obligatorio.`);
        }

        user[field] = body[field].trim();
    }

    if (!EMAIL_FORMAT.test(user.correoUsuario)) {
        return invalidRequest("El correoUsuario no tiene un formato valido.");
    }

    if (!LETTERS_AND_SPACES_FORMAT.test(user.nombreUsuario)) {
        return invalidRequest("El nombreUsuario solo debe contener letras y espacios.");
    }

    if (!LETTERS_AND_SPACES_FORMAT.test(user.apellidoUsuario)) {
        return invalidRequest(
            "El apellidoUsuario solo debe contener letras y espacios.",
        );
    }

    if (!ROLES.has(user.rolUsuario)) {
        return invalidRequest("El rolUsuario no es valido.");
    }

    if (!USER_STATUSES.has(user.estadoUsuario)) {
        return invalidRequest("El estadoUsuario no es valido.");
    }

    user.correoUsuario = user.correoUsuario.toLowerCase();
    user.estadoUsuario = normalizeUserStatus(user.estadoUsuario);

    return { valid: true, user };
}

export function validateAdminUserStatusRequest(body) {
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
        return invalidRequest("Los datos del estado no son validos.");
    }

    if (Object.keys(body).some((field) => !USER_STATUS_FIELDS.has(field))) {
        return invalidRequest("La solicitud contiene campos no permitidos.");
    }

    if (
        typeof body.estadoUsuario !== "string" ||
        body.estadoUsuario.trim().length === 0
    ) {
        return invalidRequest("El campo estadoUsuario es obligatorio.");
    }

    const estadoUsuario = body.estadoUsuario.trim();

    if (!USER_STATUSES.has(estadoUsuario)) {
        return invalidRequest("El estadoUsuario no es valido.");
    }

    return { valid: true, estadoUsuario: normalizeUserStatus(estadoUsuario) };
}
