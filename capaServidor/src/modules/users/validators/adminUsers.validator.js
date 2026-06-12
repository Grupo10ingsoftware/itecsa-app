const USER_FIELDS = new Set([
    "correoUsuario",
    "rolUsuario",
]);
const PASSWORD_SETUP_EMAIL_FIELDS = new Set(["correoUsuario"]);
const ROLES = new Set([
    "Administrador",
    "Gerencia",
    "Operario",
    "Ventas",
    "Cobranzas",
]);
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function invalidRequest(message) {
    return { valid: false, message };
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

    if (!ROLES.has(user.rolUsuario)) {
        return invalidRequest("El rolUsuario no es valido.");
    }

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
