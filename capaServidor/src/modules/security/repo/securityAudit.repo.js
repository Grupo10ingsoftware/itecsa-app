import getPrismaClient from "../../../database/prisma.js";

const text = (value, max) => value === undefined || value === null
    ? null
    : String(value).replace(/[\r\n]/g, " ").slice(0, max);

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
            },
        });
    }
}
