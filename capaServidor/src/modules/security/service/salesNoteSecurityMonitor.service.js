import { createHash, createHmac } from "node:crypto";
import { normalizeSalesNoteNumber } from "../../orders/service/salesNoteSource.service.js";
import SecurityAuditRepository from "../repo/securityAudit.repo.js";
import { createDefaultThrottle } from "./securityThrottle.service.js";

export const SALES_NOTE_LOOKUP_OUTCOMES = Object.freeze({
  AVAILABLE: "AVAILABLE", ALREADY_REGISTERED: "ALREADY_REGISTERED", NOT_FOUND: "NOT_FOUND", ERROR: "ERROR",
});

const DEFAULT_CONFIG = Object.freeze({ windowSeconds: 300, lookupSignalThreshold: 30, notFoundSignalThreshold: 10 });
const positiveInteger = (value, fallback) => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : fallback;

export function readSalesNoteMonitoringConfig(env = process.env) {
  return {
    windowSeconds: positiveInteger(env.SECURITY_MONITOR_WINDOW_SECONDS, DEFAULT_CONFIG.windowSeconds),
    lookupSignalThreshold: positiveInteger(env.SECURITY_MONITOR_LOOKUP_SIGNAL_THRESHOLD, DEFAULT_CONFIG.lookupSignalThreshold),
    notFoundSignalThreshold: positiveInteger(env.SECURITY_MONITOR_NOT_FOUND_SIGNAL_THRESHOLD, DEFAULT_CONFIG.notFoundSignalThreshold),
  };
}

function fingerprint(namespace, value, secret = process.env.SECURITY_LOG_HMAC_KEY ?? process.env.RATE_LIMIT_SECRET) {
  if (secret) return createHmac("sha256", secret).update(`${namespace}:${value}`, "utf8").digest("hex");
  return createHash("sha256").update(`${namespace}:${value}`, "utf8").digest("hex");
}

const reasonCodeFor = (outcome) => ({
  AVAILABLE: "SALES_NOTE_AVAILABLE", ALREADY_REGISTERED: "SALES_NOTE_ALREADY_REGISTERED",
  NOT_FOUND: "SALES_NOTE_NOT_FOUND", ERROR: "SALES_NOTE_LOOKUP_ERROR",
}[outcome] ?? "SALES_NOTE_LOOKUP_ERROR");
const reachesSignal = (count, threshold) => Number.isInteger(Number(count)) && Number(count) >= threshold && Number(count) % threshold === 0;

class SalesNoteSecurityMonitor {
  constructor({ repository, auditRepository, throttle, logger = console, clock = () => new Date(), config } = {}) {
    this.repository = repository ?? null;
    this.auditRepository = auditRepository ?? new SecurityAuditRepository();
    this.throttle = throttle ?? createDefaultThrottle();
    this.logger = logger;
    this.clock = clock;
    this.config = { ...readSalesNoteMonitoringConfig(), ...config };
  }

  recordAuditEvent(event) {
    return this.repository?.recordAuditEvent ? this.repository.recordAuditEvent(event) : this.auditRepository.record(event);
  }

  incrementCounter({ scope, subject, windowMs }) {
    if (this.repository?.incrementThrottleWindow) {
      const now = this.clock();
      return this.repository.incrementThrottleWindow({
        scope, subjectHash: fingerprint("sales-note-lookup-user", subject),
        windowStartedAt: now, expiresAt: new Date(now.getTime() + windowMs),
      });
    }
    return this.throttle.increment({ scope, subject, windowMs });
  }

  async observeLookup({ actorUserId, salesNoteNumber, requestId, outcome }) {
    const actor = Number(actorUserId);
    if (!Number.isSafeInteger(actor) || actor <= 0) {
      this.logger.error?.({ event: "security.sales_note_lookup_monitor_skipped", requestId, reason: "INVALID_ACTOR" });
      return { recorded: false, signals: [] };
    }
    const occurredAt = this.clock();
    const normalized = normalizeSalesNoteNumber(salesNoteNumber);
    const audit = (event) => this.recordAuditEvent({ occurredAt, actorUserId: actor, requestId, ...event });
    const operations = [
      audit({ eventType: "SALES_NOTE_LOOKUP", action: "READ_SALES_NOTE", resourceType: "SALES_NOTE", resourceId: normalized ? fingerprint("sales-note-number", normalized) : null, outcome, reasonCode: reasonCodeFor(outcome) }),
      this.incrementCounter({ scope: "sales-note-lookup:all", subject: actor, windowMs: this.config.windowSeconds * 1000 }),
    ];
    if (outcome === SALES_NOTE_LOOKUP_OUTCOMES.NOT_FOUND) {
      operations.push(this.incrementCounter({ scope: "sales-note-lookup:not-found", subject: actor, windowMs: this.config.windowSeconds * 1000 }));
    }
    const settled = await Promise.allSettled(operations);
    const counters = settled.slice(1).map((result) => result.status === "fulfilled" ? result.value : null);
    const signals = [];
    if (reachesSignal(counters[0]?.request_count, this.config.lookupSignalThreshold)) signals.push("HIGH_LOOKUP_VELOCITY");
    if (reachesSignal(counters[1]?.request_count, this.config.notFoundSignalThreshold)) signals.push("HIGH_NOT_FOUND_VOLUME");
    await Promise.allSettled(signals.map((reasonCode) => audit({
      eventType: "SALES_NOTE_LOOKUP_ALERT", action: "OBSERVE_SALES_NOTE_LOOKUPS",
      resourceType: "SALES_NOTE_LOOKUP", resourceId: null, outcome: "OBSERVED", reasonCode,
    })));
    const recorded = settled.every((result) => result.status === "fulfilled");
    if (!recorded) this.logger.error?.({ event: "security.sales_note_lookup_monitor_write_failed", requestId });
    return { recorded, signals };
  }
}

export default SalesNoteSecurityMonitor;
