import getPrismaClient from "../../../database/prisma.js";
import { safeLogger } from "../../../shared/safeLogger.js";
import { purgeExpiredSalesNoteCaches } from "../../orders/service/salesNoteSource.service.js";
import { cleanupExpiredPinRecoveries, readPinRecoveryRetentionConfig } from './pinRecoveryCleanup.service.js';
import { cleanupBusinessRetention, readBusinessRetentionConfig } from './businessRetention.service.js';

export class TemporaryDataCleanupService {
    constructor({ prisma, now = () => new Date(), salesNotes, env = process.env, logger = safeLogger } = {}) {
        this.prisma = prisma;
        this.now = now;
        this.salesNotes = salesNotes;
        this.env = env;
        this.logger = logger;
    }

    get client() {
        return this.prisma ?? getPrismaClient();
    }

    async run() {
        const retention = readPinRecoveryRetentionConfig(this.env);
        const businessRetention = readBusinessRetentionConfig(this.env);
        const now = this.now();
        const throttles = await this.client.securityThrottle.deleteMany({
            where: { expires_at: { lte: now } },
        });
        this.salesNotes?.clearExpired?.();
        purgeExpiredSalesNoteCaches();
        const result = { throttles: throttles.count };
        if (retention.mode !== 'disabled') {
            result.pinRecoveries = await cleanupExpiredPinRecoveries({
                client: this.client, env: this.env, now, logger: this.logger,
            });
        }
        if (businessRetention.mode !== 'disabled') {
            result.businessRetention = await cleanupBusinessRetention({
                client: this.client, env: this.env, now, logger: this.logger,
            });
        }
        return result;
    }
}

export function startTemporaryDataCleanup({
    service = new TemporaryDataCleanupService(),
    logger = safeLogger,
    intervalMs = Number(process.env.TEMPORARY_DATA_CLEANUP_INTERVAL_MS ?? 60 * 60_000),
} = {}) {
    if (!Number.isSafeInteger(intervalMs) || intervalMs < 1000 || intervalMs > 2147483647) {
        throw new Error('Intervalo de limpieza invalido.');
    }
    let running = false;
    const execute = async () => {
        if (running) return;
        running = true;
        try { await service.run(); }
        catch (error) {
            logger.error("temporary_cleanup.failed", { code: error?.code ?? "CLEANUP_FAILED", outcome: "error" });
        } finally { running = false; }
    };
    const timer = setInterval(execute, intervalMs);
    timer.unref?.();
    execute();
    return () => clearInterval(timer);
}
