const USER_FIELDS = new Set([
    "nombreUsuario",
    "apellidoUsuario",
    "rutUsuario",
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
const RUT_FORMAT = /^(\d{1,2}\.?\d{3}\.?\d{3}-[\dkK])$/;
const LETTERS_AND_SPACES_FORMAT =
    /^[A-Za-z\u00c1\u00c9\u00cd\u00d3\u00da\u00e1\u00e9\u00ed\u00f3\u00fa\u00d1\u00f1\u00dc\u00fc\s]+$/;

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
