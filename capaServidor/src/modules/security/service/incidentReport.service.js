import { createHmac } from 'node:crypto';
import { readIncidentChannel } from '../../../config/incidentChannel.js';
import { AppError } from '../../../errors/AppError.js';
import { TextDeliveryError } from '../../../shared/resendTextDelivery.js';
import { safeLogger } from '../../../shared/safeLogger.js';
import { validateIncidentReport } from '../validators/incidentReport.validator.js';
import IncidentReportRepo from '../repo/incidentReport.repo.js';
import IncidentDeliveryService from './incidentDelivery.service.js';

export class IncidentChannelError extends Error {
    constructor(code, message, reference = null) { super(message); this.code = code; this.reference = reference; }
}
const receipt = row => ({ reportId: row.id, receivedAt: row.received_at.toISOString(), observedAt: row.observed_at.toISOString(), status: 'sent',
    message: 'Tu reporte fue remitido al servicio de correo para el equipo responsable de Itecsa. Comunica una posible situación; no confirma un incidente ni su resolución.' });

export default class IncidentReportService {
    constructor({ repository = new IncidentReportRepo(), delivery = new IncidentDeliveryService(), env = process.env, now = () => new Date(), logger = safeLogger } = {}) {
        Object.assign(this, { repository, delivery, env, now, logger });
    }
    configuration(user) {
        let reportsEnabled = false;
        try { reportsEnabled = readIncidentChannel(this.env).enabled; } catch { /* No secrets or recipients exposed. */ }
        return { reportsEnabled, contactEmail: user.correoUsuario?.trim().toLowerCase() || '' };
    }
    log(id, outcome, code) {
        try { this.logger.info('incident_report.delivery', { resourceId: id, outcome, code }); } catch { /* Logger must not change delivery result. */ }
    }
    async submit(body, user, subject) {
        const report = validateIncidentReport(body, user, subject, this.now());
        let config;
        try { config = readIncidentChannel(this.env); } catch { throw new IncidentChannelError('INCIDENT_CHANNEL_UNAVAILABLE', 'El canal de reportes todavía no está configurado por Itecsa.'); }
        if (!config.enabled) throw new IncidentChannelError('INCIDENT_CHANNEL_UNAVAILABLE', 'El canal de reportes todavía no está configurado por Itecsa.');
        const fingerprint = createHmac('sha256', config.digestKey).update(JSON.stringify(report)).digest('hex');
        let { row, created } = await this.repository.reserve({ id: report.reportId, user_id: user.idUsuario, module: report.module,
            observed_at: new Date(report.observedAt), received_at: this.now(), status: 'sending', payload_digest: fingerprint,
            recipient: config.recipient, sender: config.from, channel: 'resend' });
        if (row.user_id !== user.idUsuario || row.payload_digest !== fingerprint) throw new AppError(409, 'El identificador corresponde a otro reporte.');
        if (row.status === 'sent') return receipt(row);
        if (!created) {
            if (row.recipient !== config.recipient || row.sender !== config.from || this.now() - row.received_at >= 23 * 60 * 60 * 1000 || row.status !== 'failed') {
                throw new IncidentChannelError('INCIDENT_REVIEW_DELIVERY', 'El envío está en curso o requiere comprobar su recepción con el responsable de Itecsa antes de reenviar.', row.id);
            }
            const retry = await this.repository.claimRetry(row.id, row.attempt);
            if (!retry) throw new IncidentChannelError('INCIDENT_REVIEW_DELIVERY', 'El envío está en curso o requiere comprobar su recepción con el responsable de Itecsa antes de reenviar.', row.id);
            row = retry;
        }
        let providerId;
        try { providerId = await this.delivery.send({ config: { ...config, recipient: row.recipient, from: row.sender }, report, userId: user.idUsuario, receivedAt: row.received_at }); }
        catch (error) {
            const retryable = error instanceof TextDeliveryError && error.retryable;
            try { await this.repository.finish(row.id, row.attempt, { status: retryable ? 'failed' : 'unconfirmed', error_code: retryable ? 'DELIVERY_REJECTED' : 'DELIVERY_UNCONFIRMED' }); }
            catch { this.log(row.id, 'unconfirmed', 'RECORD_UNCONFIRMED'); throw new IncidentChannelError('INCIDENT_REVIEW_DELIVERY', 'No pudimos confirmar el registro del envío. Consulta al responsable de Itecsa con este identificador.', row.id); }
            this.log(row.id, retryable ? 'failed' : 'unconfirmed', retryable ? 'DELIVERY_REJECTED' : 'DELIVERY_UNCONFIRMED');
            throw new IncidentChannelError(retryable ? 'INCIDENT_DELIVERY_FAILED' : 'INCIDENT_REVIEW_DELIVERY', retryable ? 'No se pudo remitir el reporte. Puedes reintentar sin cambiar el formulario.' : 'No pudimos confirmar el envío. Consulta al responsable de Itecsa con este identificador antes de reenviar.', row.id);
        }
        try {
            const result = receipt(await this.repository.finish(row.id, row.attempt, { status: 'sent', provider_id: providerId, sent_at: this.now(), error_code: null }));
            this.log(row.id, 'sent', 'PROVIDER_ACCEPTED'); return result;
        } catch {
            this.log(row.id, 'unconfirmed', 'RECORD_UNCONFIRMED');
            throw new IncidentChannelError('INCIDENT_REVIEW_DELIVERY', 'El servicio de correo aceptó el reporte, pero no pudimos confirmar su registro. Consulta al responsable de Itecsa con este identificador.', row.id);
        }
    }
}
