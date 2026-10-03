import { validateRequestFields } from '../../../../../shared/privacyRequests.js';
import { AppError } from '../../../errors/AppError.js';

const ALLOWED_FIELDS = new Set(['requestId', 'type', 'subject', 'description', 'email']);
export function validatePrivacyRequest(body, user, subject) {
    if (!user || user.idAuth0 !== subject || !Number.isInteger(user.idUsuario)) throw new AppError(403, 'La identidad no corresponde a la sesión.');
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !ALLOWED_FIELDS.has(key))) throw new AppError(400, 'La solicitud contiene campos no admitidos.');
    if (typeof body.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId)) throw new AppError(400, 'Identificador de solicitud inválido.');
    const email = user.correoUsuario?.trim().toLowerCase();
    const errors = validateRequestFields({ ...body, email });
    if (Object.keys(errors).length) throw new AppError(400, Object.values(errors)[0]);
    if (body.email !== undefined && (typeof body.email !== 'string' || body.email.trim().toLowerCase() !== email)) throw new AppError(400, 'El contacto debe corresponder al correo de tu cuenta.');
    return { requestId: body.requestId.toLowerCase(), type: body.type, subject: body.subject.trim(), description: body.description.trim(), email };
}
