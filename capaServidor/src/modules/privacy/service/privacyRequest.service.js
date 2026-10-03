import { createHmac } from 'node:crypto';
import { readPrivacyChannel, readPrivacyDocuments } from '../../../config/privacyChannel.js';
import { AppError } from '../../../errors/AppError.js';
import { validatePrivacyRequest } from '../validators/privacyRequest.validator.js';
import PrivacySubmissionRepo from '../repo/privacySubmission.repo.js';
import PrivacyDeliveryService, { PrivacyDeliveryError } from './privacyDelivery.service.js';

export class PrivacyChannelError extends Error {
    constructor(code, message, reference = null) { super(message); this.code = code; this.reference = reference; }
}
const receipt = row => ({ requestId: row.id, receivedAt: row.received_at.toISOString(), status: 'sent', message: 'Tu solicitud fue remitida al servicio de correo para el área responsable. Itecsa gestionará la respuesta por correo electrónico.' });

export default class PrivacyRequestService {
    constructor({ repository = new PrivacySubmissionRepo(), delivery = new PrivacyDeliveryService(), env = process.env, now = () => new Date() } = {}) {
        Object.assign(this, { repository, delivery, env, now });
    }
    documents() {
        const documents = readPrivacyDocuments(this.env);
        let requestsEnabled = false;
        try { requestsEnabled = readPrivacyChannel(this.env).enabled; } catch { /* No keys/addresses exposed. */ }
        return { documents, requestsEnabled, attachmentsEnabled: false };
    }
    async submit(body, user, subject) {
        const request = validatePrivacyRequest(body, user, subject);
        let config;
        try { config = readPrivacyChannel(this.env); } catch { throw new PrivacyChannelError('PRIVACY_CHANNEL_UNAVAILABLE', 'El canal de solicitudes todavía no está configurado.'); }
        if (!config.enabled) throw new PrivacyChannelError('PRIVACY_CHANNEL_UNAVAILABLE', 'El canal de solicitudes todavía no está configurado.');
        const fingerprint = createHmac('sha256', config.digestKey).update(JSON.stringify(request)).digest('hex');
        const { row, created } = await this.repository.reserve({ id: request.requestId, user_id: user.idUsuario, type: request.type,
            received_at: this.now(), status: 'sending', payload_digest: fingerprint, recipient: config.recipient, sender: config.from, channel: 'resend' });
        if (row.user_id !== user.idUsuario || row.payload_digest !== fingerprint) throw new AppError(409, 'El identificador corresponde a otra solicitud.');
        if (row.status === 'sent') return receipt(row);
        if (!created) {
            if (row.recipient !== config.recipient || row.sender !== config.from || this.now() - row.received_at >= 23 * 60 * 60 * 1000) throw new AppError(409, 'Consulta al área responsable antes de reenviar esta solicitud.', 'PRIVACY_REVIEW_DELIVERY');
            if (row.status !== 'failed' || !await this.repository.claimRetry(row.id)) throw new AppError(409, 'El envío está en curso o requiere confirmar su recepción con el área responsable.', 'PRIVACY_REVIEW_DELIVERY');
        }
        let providerId;
        try { providerId = await this.delivery.send({ config: { ...config, recipient: row.recipient, from: row.sender }, request, userId: user.idUsuario, receivedAt: row.received_at }); }
        catch (error) {
            const retryable = error instanceof PrivacyDeliveryError && error.retryable;
            await this.repository.finish(row.id, { status: retryable ? 'failed' : 'unconfirmed', error_code: retryable ? 'DELIVERY_REJECTED' : 'DELIVERY_UNCONFIRMED' });
            throw new PrivacyChannelError(retryable ? 'PRIVACY_DELIVERY_FAILED' : 'PRIVACY_REVIEW_DELIVERY', retryable ? 'No se pudo enviar la solicitud. Puedes reintentar sin cambiar el formulario.' : 'No pudimos confirmar el envío. Consulta al área responsable con este identificador antes de reenviar.', row.id);
        }
        try { return receipt(await this.repository.finish(row.id, { status: 'sent', provider_id: providerId, sent_at: this.now(), error_code: null })); }
        catch { throw new PrivacyChannelError('PRIVACY_REVIEW_DELIVERY', 'El servicio de correo aceptó la solicitud, pero no pudimos confirmar su registro. Consulta al área responsable con este identificador.', row.id); }
    }
}
