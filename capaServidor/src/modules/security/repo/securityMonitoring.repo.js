import getPrismaClient from "../../../database/prisma.js";

class SecurityMonitoringRepository {
  constructor({ prisma } = {}) {
    this.prisma = prisma;
  }

  get client() {
    if (!this.prisma) {
      this.prisma = getPrismaClient();
    }

    return this.prisma;
  }

  async recordAuditEvent({
    occurredAt,
    eventType,
    actorUserId,
    action,
    resourceType,
    resourceId,
    requestId,
    outcome,
    reasonCode,
  }) {
    return this.client.securityAuditEvent.create({
      data: {
        occurred_at: occurredAt,
        event_type: eventType,
        actor_user_id: actorUserId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        request_id: requestId,
        outcome,
        reason_code: reasonCode,
      },
    });
  }

  async incrementThrottleWindow({
    scope,
    subjectHash,
    windowStartedAt,
    expiresAt,
  }) {
    await this.client.$executeRaw`
      INSERT INTO SecurityThrottle (
        scope,
        subject_hash,
        window_started_at,
        request_count,
        expires_at,
        updated_at
      ) VALUES (
        ${scope},
        ${subjectHash},
        ${windowStartedAt},
        1,
        ${expiresAt},
        ${windowStartedAt}
      )
      ON DUPLICATE KEY UPDATE
        request_count = IF(expires_at <= ${windowStartedAt}, 1, request_count + 1),
        window_started_at = IF(expires_at <= ${windowStartedAt}, ${windowStartedAt}, window_started_at),
        expires_at = IF(expires_at <= ${windowStartedAt}, ${expiresAt}, expires_at),
        updated_at = ${windowStartedAt}
    `;

    return this.client.securityThrottle.findUnique({
      where: {
        scope_subject_hash: {
          scope,
          subject_hash: subjectHash,
        },
      },
      select: {
        request_count: true,
        window_started_at: true,
        expires_at: true,
      },
    });
  }
}

export default SecurityMonitoringRepository;
