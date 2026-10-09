import { isContactEmail } from '../../../shared/privacyRequests.js';

export function readIncidentChannel(env = process.env) {
    const provider = env.SECURITY_INCIDENT_PROVIDER?.trim() || 'disabled';
    if (provider === 'disabled') return { enabled: false };
    if (provider !== 'resend') throw new Error('Proveedor de reportes inválido.');
    const recipient = env.SECURITY_INCIDENT_RECIPIENT?.trim();
    const from = env.SECURITY_INCIDENT_FROM?.trim();
    const apiKey = env.RESEND_API_KEY?.trim();
    const digestKey = env.RATE_LIMIT_SECRET?.trim();
    if (!isContactEmail(recipient) || !isContactEmail(from) || !apiKey || /[\r\n]/.test(apiKey) || !digestKey) throw new Error('Canal de reportes no configurado.');
    return { enabled: true, provider, recipient, from, apiKey, digestKey };
}
