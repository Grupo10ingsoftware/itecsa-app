import getPrismaClient from "../../../database/prisma.js";

const text = (value, max) => value === undefined || value === null
    ? null
    : String(value).replace(/[\r\n]/g, " ").slice(0, max);

// Incident metadata is deliberately allowlisted; report content never enters the log.
const incidentMetadata = metadata => {
    const result = {};
    for (const [key, max] of Object.entries({ module: 30, observedAt: 24, receivedAt: 24,
        payloadDigest: 64, recipient: 254, sender: 254, channel: 20, providerId: 128, sentAt: 24 })) {
        if (metadata?.[key] !== undefined && metadata[key] !== null) result[key] = text(metadata[key], max);
    }
    if (Number.isSafeInteger(metadata?.attempt) && metadata.attempt >= 0) result.attempt = metadata.attempt;
    return result;
};

export default class SecurityAuditRepository {
    constructor({ prisma } = {}) {
        this.prisma = prisma;
    }

    get client() {
        return this.prisma ?? getPrismaClient();
    }

    async record(event, { client = this.client } = {}) {
        return client.securityAuditEvent.create({
            data: {
                event_type: text(event.eventType, 80),
                occurred_at: event.occurredAt ?? new Date(),
                actor_user_id: event.actorUserId ? Number(event.actorUserId) : null,
                action: text(event.action, 80),
                resource_type: text(event.resourceType, 60),
                resource_id: text(event.resourceId, 120),
                request_id: text(event.requestId, 36),
                outcome: text(event.outcome, 30),
                reason_code: text(event.reasonCode, 80),
                ...(['incident_report.attempt', 'incident_report.delivery'].includes(event.eventType) ? {
                    event_key: text(event.eventKey, 100),
                    metadata: incidentMetadata(event.metadata),
                } : {}),
            },
        });
    }
}
