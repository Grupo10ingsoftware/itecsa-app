import assert from "node:assert/strict";
import { test } from "node:test";

import SalesNoteSecurityMonitor, {
  SALES_NOTE_LOOKUP_OUTCOMES,
  readSalesNoteMonitoringConfig,
} from "../src/modules/security/service/salesNoteSecurityMonitor.service.js";

const NOW = new Date("2026-10-02T12:00:00.000Z");

function createRepository({ lookupCount = 1, notFoundCount = 1 } = {}) {
  const auditEvents = [];
  const counters = [];

  return {
    auditEvents,
    counters,
    async recordAuditEvent(event) {
      auditEvents.push(event);
      return event;
    },
    async incrementThrottleWindow(data) {
      counters.push(data);
      return {
        request_count: data.scope.endsWith("not-found")
          ? notFoundCount
          : lookupCount,
      };
    },
  };
}

test("audita la busqueda sin copiar el numero de nota y no genera bloqueos", async () => {
  const repository = createRepository();
  const monitor = new SalesNoteSecurityMonitor({
    repository,
    clock: () => NOW,
    config: {
      windowSeconds: 300,
      lookupSignalThreshold: 30,
      notFoundSignalThreshold: 10,
    },
  });

  const result = await monitor.observeLookup({
    actorUserId: 7,
    salesNoteNumber: "NV-2026-24226",
    requestId: "12345678-1234-4234-8234-123456789012",
    outcome: SALES_NOTE_LOOKUP_OUTCOMES.AVAILABLE,
  });

  assert.deepEqual(result, { recorded: true, signals: [] });
  assert.equal(repository.auditEvents.length, 1);
  assert.equal(repository.auditEvents[0].outcome, "AVAILABLE");
  assert.equal(repository.auditEvents[0].resourceId.length, 64);
  assert.notEqual(repository.auditEvents[0].resourceId, "24226");
  assert.equal(repository.counters.length, 1);
  assert.equal(repository.counters[0].subjectHash.length, 64);
  assert.match(repository.counters[0].subjectHash, /^[0-9a-f]{64}$/);
  assert.notEqual(repository.counters[0].subjectHash, "7".repeat(64));
});

test("genera senales de observacion sin convertirlas en una restriccion", async () => {
  const repository = createRepository({ lookupCount: 30, notFoundCount: 10 });
  const monitor = new SalesNoteSecurityMonitor({
    repository,
    clock: () => NOW,
    config: {
      windowSeconds: 300,
      lookupSignalThreshold: 30,
      notFoundSignalThreshold: 10,
    },
  });

  const result = await monitor.observeLookup({
    actorUserId: 7,
    salesNoteNumber: "NV-2026-99999",
    requestId: "12345678-1234-4234-8234-123456789012",
    outcome: SALES_NOTE_LOOKUP_OUTCOMES.NOT_FOUND,
  });

  assert.deepEqual(result.signals, [
    "HIGH_LOOKUP_VELOCITY",
    "HIGH_NOT_FOUND_VOLUME",
  ]);
  assert.equal(repository.counters.length, 2);
  const alerts = repository.auditEvents.filter(
    (event) => event.eventType === "SALES_NOTE_LOOKUP_ALERT",
  );
  assert.deepEqual(
    alerts.map((event) => event.reasonCode),
    result.signals,
  );
  assert.ok(alerts.every((event) => event.outcome === "OBSERVED"));
});

test("una falla de persistencia se informa sin lanzar ni filtrar el identificador", async () => {
  const logs = [];
  const monitor = new SalesNoteSecurityMonitor({
    repository: {
      async recordAuditEvent() { throw new Error("database unavailable"); },
      async incrementThrottleWindow() { throw new Error("database unavailable"); },
    },
    logger: { error(entry) { logs.push(entry); } },
    clock: () => NOW,
  });

  const result = await monitor.observeLookup({
    actorUserId: 7,
    salesNoteNumber: "NV-2026-SECRET",
    requestId: "12345678-1234-4234-8234-123456789012",
    outcome: SALES_NOTE_LOOKUP_OUTCOMES.ERROR,
  });

  assert.equal(result.recorded, false);
  assert.equal(logs.length, 1);
  assert.equal(JSON.stringify(logs).includes("SECRET"), false);
});

test("la configuracion ignora umbrales invalidos y conserva valores seguros", () => {
  assert.deepEqual(readSalesNoteMonitoringConfig({
    SECURITY_MONITOR_WINDOW_SECONDS: "60",
    SECURITY_MONITOR_LOOKUP_SIGNAL_THRESHOLD: "12",
    SECURITY_MONITOR_NOT_FOUND_SIGNAL_THRESHOLD: "0",
  }), {
    windowSeconds: 60,
    lookupSignalThreshold: 12,
    notFoundSignalThreshold: 10,
  });
});
