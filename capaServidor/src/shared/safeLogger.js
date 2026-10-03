const ALLOWED_FIELDS = new Set([
    "event",
    "requestId",
    "actorId",
    "action",
    "resourceType",
    "resourceId",
    "outcome",
    "code",
    "correlationId",
    "timestamp",
    "mode",
    "cutoff",
    "hasMore",
]);

const COUNT_FIELDS = new Set(['candidateCount', 'deletedCount', 'retentionDays', 'retentionMonths']);

function sanitizedEntry(event, metadata = {}) {
    const entry = {
        event: String(event || "application.event").slice(0, 100),
        timestamp: new Date().toISOString(),
    };

    for (const [key, value] of Object.entries(metadata)) {
        if (COUNT_FIELDS.has(key)) {
            if (Number.isSafeInteger(value) && value >= 0) entry[key] = value;
            continue;
        }
        if (!ALLOWED_FIELDS.has(key) || value === undefined || value === null) continue;
        if (typeof value === "string") entry[key] = value.replace(/[\r\n]/g, " ").slice(0, 200);
        else if (typeof value === "number" || typeof value === "boolean") entry[key] = value;
    }

    return entry;
}

export function createSafeLogger({ sink = console } = {}) {
    const write = (level, event, metadata) => {
        const method = typeof sink[level] === "function" ? level : "log";
        sink[method](sanitizedEntry(event, metadata));
    };

    return Object.freeze({
        info: (event, metadata) => write("info", event, metadata),
        warn: (event, metadata) => write("warn", event, metadata),
        error: (event, metadata) => write("error", event, metadata),
    });
}

export const safeLogger = createSafeLogger();
