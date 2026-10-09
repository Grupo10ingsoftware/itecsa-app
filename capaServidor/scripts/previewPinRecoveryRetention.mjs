import 'dotenv/config';
import { parseArgs } from 'node:util';
import getPrismaClient, { disconnectPrismaClient } from '../src/database/prisma.js';
import { cleanupExpiredPinRecoveries, readPinRecoveryRetentionConfig } from '../src/modules/security/service/pinRecoveryCleanup.service.js';

try {
    const { values } = parseArgs({ options: { days: { type: 'string' }, help: { type: 'boolean', short: 'h' } }, strict: true });
    if (values.help) {
        console.log('npm run pin:retention:preview -- --days <plazo-en-dias>\nSolo lectura: informa hasta 100 candidatos y hasMore. Nunca elimina datos, aunque el entorno use delete.\nSi omites --days, usa PIN_RECOVERY_RETENTION_DAYS; sin plazo no consulta la base.');
    } else {
        const days = values.days ?? process.env.PIN_RECOVERY_RETENTION_DAYS;
        if (!String(days ?? '').trim()) {
            console.log(JSON.stringify({ mode: 'disabled', message: 'No hay plazo de conservacion definido. No se consulto la base.' }));
        } else {
            const env = { PIN_RECOVERY_RETENTION_MODE: 'dry-run', PIN_RECOVERY_RETENTION_DAYS: days };
            readPinRecoveryRetentionConfig(env);
            const report = await cleanupExpiredPinRecoveries({ client: getPrismaClient(), env, logger: { info() {} } });
            console.log(JSON.stringify(report, null, 2));
        }
    }
} catch {
    // Connection/Prisma errors can contain credentials or SQL: never print them.
    console.error('No fue posible simular la limpieza. Revisa el plazo, la conexion y la tabla PinRecoveryChallenge.');
    process.exitCode = 1;
} finally {
    await disconnectPrismaClient();
}
