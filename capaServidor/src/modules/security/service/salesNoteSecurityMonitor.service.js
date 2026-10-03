import { createHash } from "node:crypto";

import { normalizeSalesNoteNumber } from "../../orders/service/salesNoteSource.service.js";
import SecurityMonitoringRepository from "../repo/securityMonitoring.repo.js";

export const SALES_NOTE_LOOKUP_OUTCOMES = Object.freeze({
  AVAILABLE: "AVAILABLE",
  ALREADY_REGISTERED: "ALREADY_REGISTERED",
  NOT_FOUND: "NOT_FOUND",
  ERROR: "ERROR",
});

const LOOKUP_EVENT_TYPE = "SALES_NOTE_LOOKUP";
const ALERT_EVENT_TYPE = "SALES_NOTE_LOOKUP_ALERT";
const LOOKUP_SCOPE = "sales-note-lookup:all";
const NOT_FOUND_SCOPE = "sales-note-lookup:not-found";

const DEFAULT_CONFIG = Object.freeze({
  windowSeconds: 300,
  lookupSignalThreshold: 30,
  notFoundSignalThreshold: 10,
});

function positiveInteger(value, fallback) {
  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function readSalesNoteMonitoringConfig(env = process.env) {
  return {
    windowSeconds: positiveInteger(
      env.SECURITY_MONITOR_WINDOW_SECONDS,
      DEFAULT_CONFIG.windowSeconds,
    ),
    lookupSignalThreshold: positiveInteger(
      env.SECURITY_MONITOR_LOOKUP_SIGNAL_THRESHOLD,
      DEFAULT_CONFIG.lookupSignalThreshold,
    ),
    notFoundSignalThreshold: positiveInteger(
      env.SECURITY_MONITOR_NOT_FOUND_SIGNAL_THRESHOLD,
      DEFAULT_CONFIG.notFoundSignalThreshold,
    ),
  };
}

function sha256(namespace, value) {
  return createHash("sha256")
    .update(`${namespace}:${value}`, "utf8")
    .digest("hex");
}

function reasonCodeFor(outcome) {
  const reasons = {
    [SALES_NOTE_LOOKUP_OUTCOMES.AVAILABLE]: "SALES_NOTE_AVAILABLE",
    [SALES_NOTE_LOOKUP_OUTCOMES.ALREADY_REGISTERED]: "SALES_NOTE_ALREADY_REGISTERED",
    [SALES_NOTE_LOOKUP_OUTCOMES.NOT_FOUND]: "SALES_NOTE_NOT_FOUND",
    [SALES_NOTE_LOOKUP_OUTCOMES.ERROR]: "SALES_NOTE_LOOKUP_ERROR",
  };

  return reasons[outcome] ?? "SALES_NOTE_LOOKUP_ERROR";
}

function reachesSignal(count, threshold) {
  return Number.isInteger(count) && count >= threshold && count % threshold === 0;
}

class SalesNoteSecurityMonitor {
  constructor({ repository, logger = console, clock = () => new Date(), config } = {}) {
    this.repository = repository ?? new SecurityMonitoringRepository();
    this.logger = logger;
    this.clock = clock;
    this.config = { ...readSalesNoteMonitoringConfig(), ...config };
  }

  async observeLookup({ actorUserId, salesNoteNumber, requestId, outcome }) {
    const numericActorId = Number(actorUserId);

    if (!Number.isSafeInteger(numericActorId) || numericActorId <= 0) {
      this.logger.error?.({
        event: "security.sales_note_lookup_monitor_skipped",
        requestId,
        reason: "INVALID_ACTOR",
      });
      return { recorded: false, signals: [] };
    }

    const occurredAt = this.clock();
    const expiresAt = new Date(
      occurredAt.getTime() + this.config.windowSeconds * 1000,
    );
    const normalizedNumber = normalizeSalesNoteNumber(salesNoteNumber);
    const subjectHash = sha256("sales-note-lookup-user", numericActorId);
    const resourceId = normalizedNumber
      ? sha256("sales-note-number", normalizedNumber)
      : null;
    const operations = [
      {
        name: "audit",
        promise: this.repository.recordAuditEvent({
          occurredAt,
          eventType: LOOKUP_EVENT_TYPE,
          actorUserId: numericActorId,
          action: "READ_SALES_NOTE",
          resourceType: "SALES_NOTE",
          resourceId,
          requestId,
          outcome,
          reasonCode: reasonCodeFor(outcome),
        }),
      },
      {
        name: "lookup-counter",
        promise: this.repository.incrementThrottleWindow({
          scope: LOOKUP_SCOPE,
          subjectHash,
          windowStartedAt: occurredAt,
          expiresAt,
        }),
      },
    ];

    if (outcome === SALES_NOTE_LOOKUP_OUTCOMES.NOT_FOUND) {
      operations.push({
        name: "not-found-counter",
        promise: this.repository.incrementThrottleWindow({
          scope: NOT_FOUND_SCOPE,
          subjectHash,
          windowStartedAt: occurredAt,
          expiresAt,
        }),
      });
    }

    const settled = await Promise.allSettled(
      operations.map((operation) => operation.promise),
    );
    const failedOperations = settled
      .map((result, index) => result.status === "rejected" ? operations[index].name : null)
      .filter(Boolean);

    if (failedOperations.length > 0) {
      this.logger.error?.({
        event: "security.sales_note_lookup_monitor_write_failed",
        requestId,
        operations: failedOperations,
      });
    }

    const valueFor = (name) => {
      const index = operations.findIndex((operation) => operation.name === name);
      const result = settled[index];

      return result?.status === "fulfilled" ? result.value : null;
    };
    const lookupCounter = valueFor("lookup-counter");
    const notFoundCounter = valueFor("not-found-counter");
    const signals = [];

    if (reachesSignal(
      lookupCounter?.request_count,
      this.config.lookupSignalThreshold,
    )) {
      signals.push("HIGH_LOOKUP_VELOCITY");
    }

    if (reachesSignal(
      notFoundCounter?.request_count,
      this.config.notFoundSignalThreshold,
    )) {
      signals.push("HIGH_NOT_FOUND_VOLUME");
    }

    if (signals.length > 0) {
      const signalResults = await Promise.allSettled(
        signals.map((reasonCode) => this.repository.recordAuditEvent({
          occurredAt,
          eventType: ALERT_EVENT_TYPE,
          actorUserId: numericActorId,
          action: "OBSERVE_SALES_NOTE_LOOKUPS",
          resourceType: "SALES_NOTE_LOOKUP",
          resourceId: null,
          requestId,
          outcome: "OBSERVED",
          reasonCode,
        })),
      );

      if (signalResults.some((result) => result.status === "rejected")) {
        this.logger.error?.({
          event: "security.sales_note_lookup_signal_write_failed",
          requestId,
        });
      }
    }

    return {
      recorded: failedOperations.length === 0,
      signals,
    };
  }
}

export default SalesNoteSecurityMonitor;
