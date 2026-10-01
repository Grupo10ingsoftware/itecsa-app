import { safeLogger } from '../../../shared/safeLogger.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 100;

export function readPinRecoveryRetentionConfig(env = process.env) {
    const mode = env.PIN_RECOVERY_RETENTION_MODE?.trim() || 'disabled';
    if (!['disabled', 'dry-run', 'delete'].includes(mode)) {
        throw new Error('PIN_RECOVERY_RETENTION_MODE debe ser disabled, dry-run o delete.');
    }
    if (mode === 'disabled') return { mode, days: null };
    const rawDays = String(env.PIN_RECOVERY_RETENTION_DAYS ?? '').trim();
    const days = Number(rawDays);
    if (!/^\d+$/.test(rawDays) || !Number.isSafeInteger(days) || days < 1 || days > 36500) {
        throw new Error('Define PIN_RECOVERY_RETENTION_DAYS con un plazo aprobado de 1 a 36500 dias.');
    }
    return { mode, days };
}

export async function cleanupExpiredPinRecoveries({ client, env = process.env, now = new Date(), logger = safeLogger }) {
    const { mode, days } = readPinRecoveryRetentionConfig(env);
    if (mode === 'disabled') return { mode, candidateCount: 0, deletedCount: 0 };
    if (!(now instanceof Date) || !Number.isFinite(+now)) throw new Error('Fecha de limpieza invalida.');
    const cutoff = new Date(+now - days * DAY_MS);
    // Expiration, not creation or use, starts the conservation period.
    // A strict boundary preserves codes expiring exactly at the cutoff.
    const eligible = { expires_at: { lt: cutoff }, created_at: { lt: cutoff } };
    const rows = await client.pinRecoveryChallenge.findMany({
        where: eligible,
        select: { id_pin_recovery_challenge: true },
        // Stable primary-key order avoids adding a new index/migration for this batch.
        orderBy: { id_pin_recovery_challenge: 'asc' },
        take: BATCH_SIZE + 1,
    });
    const ids = rows.slice(0, BATCH_SIZE).map(row => row.id_pin_recovery_challenge);
    let deletedCount = 0;
    if (mode === 'delete' && ids.length) {
        // Recheck eligibility in the DELETE itself, even if another instance ran
        // the same batch or a record changed after selection.
        const result = await client.pinRecoveryChallenge.deleteMany({
            where: { ...eligible, id_pin_recovery_challenge: { in: ids } },
        });
        deletedCount = result.count;
    }
    const report = {
        mode, retentionDays: days, cutoff: cutoff.toISOString(),
        candidateCount: ids.length, deletedCount, hasMore: rows.length > BATCH_SIZE,
    };
    logger.info('pin_recovery.cleanup', report);
    return report;
}
