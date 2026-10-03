import getPrismaClient from '../../../database/prisma.js';
import SecurityAuditRepository from './securityAudit.repo.js';

const eventTypes = ['incident_report.attempt', 'incident_report.delivery'];

// Each attempt and outcome is appended. Existing security events are never rewritten.
export default class IncidentReportRepo {
    constructor({ database = getPrismaClient } = {}) { this.database = database; }
    record(row, phase, outcome, reasonCode, metadata) {
        return new SecurityAuditRepository({ prisma: this.database() }).record({
            eventType: `incident_report.${phase}`, occurredAt: row.sent_at ?? new Date(),
            actorUserId: row.user_id, action: 'send_report', resourceType: 'incident_report',
            resourceId: row.id, requestId: row.id, outcome, reasonCode,
            eventKey: `incident-report/${row.id}/${phase}/${row.attempt}`,
            metadata: { ...metadata, attempt: row.attempt },
        });
    }
    attempt(row) {
        return this.record(row, 'attempt', 'sending', 'DELIVERY_STARTED', {
            module: row.module, observedAt: row.observed_at.toISOString(), receivedAt: row.received_at.toISOString(),
            payloadDigest: row.payload_digest, recipient: row.recipient, sender: row.sender, channel: row.channel,
        });
    }
    async read(id) {
        const events = await this.database().securityAuditEvent.findMany({
            where: { request_id: id, resource_type: 'incident_report', resource_id: id, event_type: { in: eventTypes } },
            orderBy: { id_security_audit_event: 'asc' },
        });
        const first = events.find(event => event.event_type === eventTypes[0]);
        if (!first) return null;
        const latest = events.filter(event => event.event_type === eventTypes[0]).at(-1);
        const result = events.find(event => event.event_type === eventTypes[1] && event.metadata?.attempt === latest.metadata.attempt);
        return { id, user_id: first.actor_user_id, module: first.metadata.module,
            observed_at: new Date(first.metadata.observedAt), received_at: new Date(first.metadata.receivedAt),
            payload_digest: first.metadata.payloadDigest, recipient: first.metadata.recipient, sender: first.metadata.sender,
            channel: first.metadata.channel, attempt: latest.metadata.attempt, status: result?.outcome ?? 'sending',
            provider_id: result?.metadata.providerId ?? null, sent_at: result?.metadata.sentAt ? new Date(result.metadata.sentAt) : null,
            error_code: result?.reason_code ?? null };
    }
    async reserve(data) {
        const row = { ...data, attempt: 0 };
        try { await this.attempt(row); return { row, created: true }; }
        catch (error) {
            if (error.code !== 'P2002') throw error;
            const existing = await this.read(row.id);
            if (!existing) throw error;
            return { row: existing, created: false };
        }
    }
    async claimRetry(id, expectedAttempt) {
        const previous = await this.read(id);
        if (!previous || previous.status !== 'failed' || previous.attempt !== expectedAttempt) return null;
        const row = { ...previous, attempt: expectedAttempt + 1, status: 'sending', error_code: null };
        try { await this.attempt(row); return row; }
        catch (error) { if (error.code === 'P2002') return null; throw error; }
    }
    async finish(id, attempt, data) {
        const previous = await this.read(id);
        if (!previous || previous.attempt !== attempt || previous.status !== 'sending') throw new Error('Incident attempt is no longer active');
        await this.record({ ...previous, ...data }, 'delivery', data.status, data.error_code ?? 'PROVIDER_ACCEPTED', {
            providerId: data.provider_id, sentAt: data.sent_at?.toISOString(),
        });
        return this.read(id);
    }
}
