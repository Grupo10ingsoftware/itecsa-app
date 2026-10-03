import { validateIncidentFields } from '../../../../../shared/incidentReports.js';
import { AppError } from '../../../errors/AppError.js';

const ALLOWED_FIELDS = new Set(['reportId', 'description', 'observedAt', 'module', 'technicalReference']);
export function validateIncidentReport(body, user, subject, now) {
    if (!user || user.idAuth0 !== subject || !Number.isInteger(user.idUsuario)) throw new AppError(403, 'La identidad no corresponde a la sesión.');
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !ALLOWED_FIELDS.has(key))) throw new AppError(400, 'El reporte contiene campos no admitidos.');
    if (typeof body.reportId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.reportId)) throw new AppError(400, 'Identificador de reporte inválido.');
    const email = user.correoUsuario?.trim().toLowerCase();
    const errors = validateIncidentFields({ ...body, email }, now);
    if (Object.keys(errors).length) throw new AppError(400, Object.values(errors)[0]);
    return { reportId: body.reportId.toLowerCase(), description: body.description.trim(), observedAt: body.observedAt, module: body.module,
        technicalReference: body.technicalReference?.trim() || '', email };
}
