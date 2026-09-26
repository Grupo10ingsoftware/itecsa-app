import { randomUUID } from 'node:crypto';
import { UnauthorizedError, InvalidRequestError, InsufficientScopeError } from 'express-oauth2-jwt-bearer';
import { AppError } from './AppError.js';
import { PinServiceError } from '../modules/auth/service/pin.service.js';
import { PinDeliveryUnavailableError } from '../modules/auth/service/pinDelivery.service.js';
import { Auth0ServiceError } from '../modules/users/service/auth0Management.service.js';
import { UserRepositoryError } from '../modules/users/repo/users.repo.js';

const ids = new WeakMap();
const DIAGNOSTIC_CODES = new Set(['P1001', 'P1002', 'P2002', 'P2010', 'P2022', 'P2025',
    'AUTH0_INVALID_RESPONSE', 'AUTH0_TOKEN_REQUEST_FAILED', 'AUTH0_PASSWORD_EMAIL_FAILED',
    'AUTH0_LIST_ROLES_FAILED', 'USER_REPOSITORY_ERROR', 'PIN_CONFIGURATION_ERROR',
    'PIN_PENDING_DATA_INVALID', 'PIN_GENERATION_FAILED']);
const INTERNAL = Object.freeze({ status: 500, code: 'INTERNAL_ERROR', message: 'Ocurrio un error interno.' });
const PIN_ERRORS = {
    PIN_USER_UNAVAILABLE: [403, 'El usuario autenticado no esta activo o no esta vinculado.'],
    PIN_NOT_REVEALABLE: [409, 'El PIN ya no puede volver a mostrarse.'],
    PIN_NOT_PROVISIONED: [409, 'El usuario aun no tiene un PIN.'],
    PIN_FORMAT_INVALID: [400, 'El PIN debe contener seis digitos.'],
    PIN_NOT_ACKNOWLEDGED: [403, 'Debes recibir y aceptar tu PIN antes de usarlo.'],
    PIN_LOCKED: [423, 'El PIN esta temporalmente bloqueado.'],
    PIN_INVALID: [403, 'El PIN ingresado no es valido.'],
    PIN_DEBUG_DISABLED: [403, 'La generacion debug solo esta disponible en desarrollo.'],
    PIN_DEBUG_FORBIDDEN: [403, 'Esta accion requiere el rol Soporte y una sesion vigente.'],
    PIN_DEBUG_CONFLICT: [409, 'La cuenta cambio. Actualiza tu sesion e intenta nuevamente.'],
    PIN_RECOVERY_DELIVERY_FAILED: [503, 'No fue posible enviar el codigo de recuperacion.'],
    PIN_RECOVERY_CODE_FORMAT_INVALID: [400, 'El codigo debe contener seis digitos.'],
    PIN_RECOVERY_CODE_EXPIRED: [410, 'El codigo expiro o no existe.'],
    PIN_RECOVERY_ATTEMPTS_EXHAUSTED: [429, 'Se agotaron los intentos del codigo.'],
    PIN_RECOVERY_CODE_INVALID: [400, 'El codigo ingresado no es valido.'],
};

export function requestId(req, res) {
    if (!ids.has(req)) ids.set(req, randomUUID());
    const id = ids.get(req);
    req.requestId = id;
    if (!res.headersSent) res.setHeader?.('X-Request-Id', id);
    return id;
}
export function requestContext(req, res, next) {
    requestId(req, res);
    next();
}

function publicError(error) {
    if (error instanceof AppError && error.statusCode >= 400 && error.statusCode < 500) {
        return { status: error.statusCode, code: error.code, message: error.message };
    }
    if (error instanceof PinServiceError && Object.hasOwn(PIN_ERRORS, error.code)) {
        const [status, message] = PIN_ERRORS[error.code];
        const result = { status, code: error.code, message };
        const retry = error.details?.retryAfterSeconds;
        if (error.code === 'PIN_LOCKED' && Number.isInteger(retry) && retry >= 0 && retry <= 86400) result.retryAfterSeconds = retry;
        return result;
    }
    if (error instanceof PinDeliveryUnavailableError) return { status: 503, code: 'PIN_RECOVERY_DELIVERY_UNAVAILABLE', message: 'La entrega del codigo de recuperacion de PIN no esta configurada.' };
    if (error instanceof UserRepositoryError) {
        if (error.code === 'USER_NOT_FOUND') return { status: 404, code: 'USER_NOT_FOUND', message: 'El usuario no existe.' };
        if (error.code === 'USER_ALREADY_EXISTS') return { status: 409, code: 'USER_ALREADY_EXISTS', message: 'Ya existe un usuario con ese correo.' };
    }
    if (error instanceof Auth0ServiceError) {
        if (error.code === 'USER_EMAIL_ALREADY_EXISTS') return { status: 409, code: error.code, message: 'Ya existe un usuario con ese correo.' };
        if (error.code === 'AUTH0_CONFIGURATION_ERROR') return { status: 503, code: error.code, message: 'La configuracion administrativa de Auth0 esta incompleta.' };
        if (error.code === 'AUTH0_INSUFFICIENT_SCOPE') return { status: 503, code: error.code, message: 'La aplicacion administrativa de Auth0 no tiene permisos suficientes para consultar o modificar usuarios.' };
    }
    if (error instanceof InsufficientScopeError) return { status: 403, code: 'FORBIDDEN', message: 'Acceso denegado.' };
    if (error instanceof InvalidRequestError) return { status: 400, code: 'INVALID_REQUEST', message: 'La solicitud de autenticacion no es valida.' };
    if (error instanceof UnauthorizedError) return { status: 401, code: 'UNAUTHENTICATED', message: 'La sesion no es valida o no esta autenticada.' };
    // Parser errors are mapped to fixed messages, never body or dependency message.
    if (error instanceof SyntaxError && error.type === 'entity.parse.failed' && error.status === 400) return { status: 400, code: 'INVALID_JSON', message: 'El cuerpo JSON no es valido.' };
    if (error?.type === 'entity.too.large' && error?.status === 413) return { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'La solicitud supera el tamano permitido.' };
    return INTERNAL;
}

function safeErrorType(error) {
    if (error instanceof AppError) return 'AppError';
    if (error instanceof PinServiceError) return 'PinServiceError';
    if (error instanceof PinDeliveryUnavailableError) return 'PinDeliveryUnavailableError';
    if (error instanceof Auth0ServiceError) return 'Auth0ServiceError';
    if (error instanceof UserRepositoryError) return 'UserRepositoryError';
    if (error instanceof UnauthorizedError) return 'AuthenticationError';
    if (['P1001', 'P1002', 'P2002', 'P2010', 'P2022', 'P2025'].includes(error?.code)) return 'PersistenceError';
    if (error instanceof TypeError) return 'TypeError';
    if (error instanceof SyntaxError) return 'SyntaxError';
    if (error instanceof RangeError) return 'RangeError';
    return 'UnexpectedError';
}

export function respondError(error, req, res, { logger = req.app?.locals?.errorLogger ?? console } = {}) {
    const id = requestId(req, res);
    const { status, ...body } = publicError(error);
    // Only the registered route template: baseUrl/originalUrl may contain RUT/email.
    const route = typeof req.route?.path === 'string' ? req.route.path : 'unmatched';
    const event = { requestId: id, type: safeErrorType(error), code: body.code,
        method: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'].includes(req.method) ? req.method : 'UNKNOWN',
        route, status, timestamp: new Date().toISOString(),
        ...(DIAGNOSTIC_CODES.has(error?.code) ? { internalCode: error.code } : {}) };
    try { logger.error?.('http_error', event); } catch { /* Logging failure must not change the safe response. */ }
    if (res.headersSent) { res.destroy?.(); return; }
    if (status === 401) res.setHeader?.('WWW-Authenticate', 'Bearer realm="api"');
    return res.status(status).json({ ...body, ...(status >= 500 ? { requestId: id } : {}) });
}

export function errorHandler(error, req, res, next) {
    return respondError(error, req, res);
}
