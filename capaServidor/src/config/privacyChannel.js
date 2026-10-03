import { DOCUMENT_IDS, isContactEmail } from '../../../shared/privacyRequests.js';

const DOCUMENT_KEYS = { notice: 'NOTICE', terms: 'TERMS', policy: 'POLICY', procedure: 'PROCEDURE' };

export function documentUrl(value) {
    const url = String(value ?? '').trim();
    if (!url) return null;
    if (/[\s\\]/.test(url) || /[\u0000-\u001f\u007f]/.test(url)) throw new Error('Documento configurado con URL invalida.');
    if (url.startsWith('/') && !url.startsWith('//') && !/[?#]/.test(url) && !/%(?:2f|5c|2e)/i.test(url) && !url.split('/').includes('..')) return url;
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('Los documentos externos requieren HTTPS.');
    return parsed.href;
}

export function readPrivacyDocuments(env = process.env) {
    return DOCUMENT_IDS.map(id => ({
        id,
        url: documentUrl(env[`PRIVACY_DOCUMENT_${DOCUMENT_KEYS[id]}_URL`]),
        version: String(env[`PRIVACY_DOCUMENT_${DOCUMENT_KEYS[id]}_VERSION`] ?? '').trim().slice(0, 80) || null,
    }));
}

export function readPrivacyChannel(env = process.env) {
    const provider = env.PRIVACY_REQUEST_PROVIDER?.trim() || 'disabled';
    if (provider === 'disabled') return { enabled: false };
    if (provider !== 'resend') throw new Error('Proveedor del canal de solicitudes invalido.');
    const recipient = env.PRIVACY_REQUEST_RECIPIENT?.trim();
    const from = env.PRIVACY_REQUEST_FROM?.trim();
    const apiKey = env.RESEND_API_KEY?.trim();
    const digestKey = env.RATE_LIMIT_SECRET?.trim();
    if (!isContactEmail(recipient) || !isContactEmail(from) || !apiKey || /[\r\n]/.test(apiKey) || !digestKey) throw new Error('Configurar destinatario, remitente, proveedor y secreto del canal.');
    return { enabled: true, provider, recipient, from, apiKey, digestKey };
}
