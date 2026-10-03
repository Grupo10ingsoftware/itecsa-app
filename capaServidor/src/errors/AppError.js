const DEFAULT_CODES = { 400: 'VALIDATION_ERROR', 401: 'UNAUTHENTICATED', 403: 'FORBIDDEN',
    404: 'NOT_FOUND', 409: 'CONFLICT', 413: 'PAYLOAD_TOO_LARGE', 423: 'LOCKED', 429: 'RATE_LIMITED' };

// Construct only with application-owned messages, never dependency error.message.
export class AppError extends Error {
    constructor(statusCode, message, code = DEFAULT_CODES[statusCode] ?? 'INTERNAL_ERROR') {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
    }
}
