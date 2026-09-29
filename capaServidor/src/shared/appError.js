export class AppError extends Error {
    constructor(code, message, { status = 400, expose = true, details } = {}) {
        super(message);
        this.name = "AppError";
        this.code = code;
        this.status = status;
        this.expose = expose;
        this.details = details;
    }
}

export function normalizeErrorStatus(error) {
    const status = Number(error?.status ?? error?.statusCode);
    return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
}
