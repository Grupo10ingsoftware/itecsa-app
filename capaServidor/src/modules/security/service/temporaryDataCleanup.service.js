import getPrismaClient from "../../../database/prisma.js";
import { safeLogger } from "../../../shared/safeLogger.js";
import { purgeExpiredSalesNoteCaches } from "../../orders/service/salesNoteSource.service.js";

export class TemporaryDataCleanupService {
    constructor({ prisma, now = () => new Date(), salesNotes } = {}) {
        this.prisma = prisma;
        this.now = now;
        this.salesNotes = salesNotes;
    }

    get client() {
        return this.prisma ?? getPrismaClient();
    }

    async run() {
        const now = this.now();
        const throttles = await this.client.securityThrottle.deleteMany({
            where: { expires_at: { lte: now } },
        });
        this.salesNotes?.clearExpired?.();
        purgeExpiredSalesNoteCaches();
        return { throttles: throttles.count };
    }
}

export function startTemporaryDataCleanup({
    service = new TemporaryDataCleanupService(),
    logger = safeLogger,
    intervalMs = Number(process.env.TEMPORARY_DATA_CLEANUP_INTERVAL_MS ?? 60 * 60_000),
} = {}) {
    const execute = () => service.run().catch((error) => logger.error("temporary_cleanup.failed", {
        code: error?.code ?? "CLEANUP_FAILED",
        outcome: "error",
    }));
    const timer = setInterval(execute, intervalMs);
    timer.unref?.();
    execute();
    return () => clearInterval(timer);
}
