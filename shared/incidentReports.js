import { isContactEmail } from './privacyRequests.js';

// Actual modules; context identifiers do not classify severity.
export const INCIDENT_MODULES = Object.freeze([
    { value: 'kanban', label: 'Principal/Kanban' },
    { value: 'profile', label: 'Mi perfil' },
    { value: 'messages', label: 'Bandeja de mensajes' },
    { value: 'payments', label: 'Confirmar pago' },
    { value: 'users', label: 'Gestión de usuarios' },
    { value: 'orders', label: 'Registro de Orden' },
    { value: 'history', label: 'Historial de pedidos' },
    { value: 'calendar', label: 'Calendario' },
    { value: 'metrics', label: 'Métricas' },
    { value: 'documents', label: 'Documentos' },
    { value: 'requests', label: 'Solicitudes sobre mis datos' },
    { value: 'authentication', label: 'Autenticación' },
    { value: 'other', label: 'Otro módulo o servicio' },
]);
export const INCIDENT_LIMITS = Object.freeze({ descriptionMin: 10, description: 1000, technicalReference: 300, clockToleranceMs: 5 * 60_000 });
const invalidControls = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

// Unambiguous UTC contract; reject calendar normalization and future observations.
export function validObservation(value, now = new Date()) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
    const date = new Date(value);
    return Number.isFinite(+date) && date.toISOString() === value && date.getUTCFullYear() >= 1970 && +date <= +now + INCIDENT_LIMITS.clockToleranceMs;
}
export function observationToUtc(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
    const date = new Date(value);
    const parts = value.split(/[-T:]/).map(Number);
    if (!Number.isFinite(+date) || [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()].some((part, index) => part !== parts[index])) return null;
    return date.toISOString();
}
export function validateIncidentFields(values = {}, now = new Date()) {
    const errors = {};
    if (typeof values.description !== 'string' || values.description.trim().length < INCIDENT_LIMITS.descriptionMin) errors.description = 'Describe lo observado con al menos 10 caracteres.';
    else if (values.description.length > INCIDENT_LIMITS.description || invalidControls.test(values.description)) errors.description = 'La descripción admite hasta 1000 caracteres de texto válido.';
    if (!validObservation(values.observedAt, now)) errors.observedAt = 'Ingresa una fecha y hora válidas; no puede ser futura.';
    if (!INCIDENT_MODULES.some(module => module.value === values.module)) errors.module = 'Selecciona un módulo o servicio.';
    if (values.technicalReference !== undefined && (typeof values.technicalReference !== 'string' || values.technicalReference.length > INCIDENT_LIMITS.technicalReference || /[\r\n]/.test(values.technicalReference) || invalidControls.test(values.technicalReference))) errors.technicalReference = 'La referencia admite hasta 300 caracteres en una línea.';
    if (!isContactEmail(values.email)) errors.email = 'Tu cuenta debe tener un correo de contacto válido.';
    return errors;
}
