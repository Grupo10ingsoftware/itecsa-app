import 'dotenv/config';
import { parseArgs } from 'node:util';
import getPrismaClient, { disconnectPrismaClient } from '../src/database/prisma.js';
import { cleanupBusinessRetention } from '../src/modules/security/service/businessRetention.service.js';

try {
    const { values } = parseArgs({ options: { help: { type: 'boolean', short: 'h' } }, strict: true });
    if (values.help) {
        console.log('npm run retention:preview\nSimula seis meses de conservacion para mensajes, comentarios, historial y auditoria. Solo lectura, hasta 100 candidatos por categoria y hasMore. No incluye PIN ni elimina datos.');
    } else {
        const report = await cleanupBusinessRetention({
            client: getPrismaClient(), env: { BUSINESS_RETENTION_MODE: 'dry-run' }, logger: { info() {} },
        });
        console.log(JSON.stringify(report, null, 2));
    }
} catch {
    console.error('No fue posible simular la retencion. Revisa la conexion y el esquema de la base de datos.');
    process.exitCode = 1;
} finally {
    await disconnectPrismaClient();
}
