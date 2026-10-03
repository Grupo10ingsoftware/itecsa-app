import assert from "node:assert/strict";
import { test } from "node:test";

import SecurityMonitoringRepository from "../src/modules/security/repo/securityMonitoring.repo.js";

test("registra un evento usando exclusivamente las columnas aprobadas", async () => {
  let createOptions;
  const repository = new SecurityMonitoringRepository({
    prisma: {
      securityAuditEvent: {
        async create(options) {
          createOptions = options;
          return { id_security_audit_event: 1n, ...options.data };
        },
      },
    },
  });
  const occurredAt = new Date("2026-10-02T12:00:00.000Z");

  await repository.recordAuditEvent({
    occurredAt,
    eventType: "SALES_NOTE_LOOKUP",
    actorUserId: 7,
    action: "READ_SALES_NOTE",
    resourceType: "SALES_NOTE",
    resourceId: "protected-id",
    requestId: "12345678-1234-4234-8234-123456789012",
    outcome: "AVAILABLE",
    reasonCode: "SALES_NOTE_AVAILABLE",
  });

  assert.deepEqual(createOptions, {
    data: {
      occurred_at: occurredAt,
      event_type: "SALES_NOTE_LOOKUP",
      actor_user_id: 7,
      action: "READ_SALES_NOTE",
      resource_type: "SALES_NOTE",
      resource_id: "protected-id",
      request_id: "12345678-1234-4234-8234-123456789012",
      outcome: "AVAILABLE",
      reason_code: "SALES_NOTE_AVAILABLE",
    },
  });
});

test("incrementa la ventana mediante un upsert atomico y consulta por el indice unico", async () => {
  let rawCall;
  let findOptions;
  const expectedCounter = {
    request_count: 4,
    window_started_at: new Date("2026-10-02T12:00:00.000Z"),
    expires_at: new Date("2026-10-02T12:05:00.000Z"),
  };
  const repository = new SecurityMonitoringRepository({
    prisma: {
      async $executeRaw(strings, ...values) {
        rawCall = { sql: strings.join("?"), values };
        return 1;
      },
      securityThrottle: {
        async findUnique(options) {
          findOptions = options;
          return expectedCounter;
        },
      },
    },
  });
  const windowStartedAt = new Date("2026-10-02T12:00:00.000Z");
  const expiresAt = new Date("2026-10-02T12:05:00.000Z");

  const counter = await repository.incrementThrottleWindow({
    scope: "sales-note-lookup:all",
    subjectHash: "a".repeat(64),
    windowStartedAt,
    expiresAt,
  });

  assert.match(rawCall.sql, /ON DUPLICATE KEY UPDATE/);
  assert.equal(rawCall.sql.includes("a".repeat(64)), false);
  assert.ok(rawCall.values.includes("a".repeat(64)));
  assert.deepEqual(findOptions.where, {
    scope_subject_hash: {
      scope: "sales-note-lookup:all",
      subject_hash: "a".repeat(64),
    },
  });
  assert.equal(counter, expectedCounter);
});
