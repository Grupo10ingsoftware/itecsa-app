import 'dotenv/config';
import { loadPrivacyConfiguration } from '../src/modules/privacy/privacyConfig.js';
import { PrivacyRepository } from '../src/modules/privacy/privacyRepository.js';
import { addCalendarDays } from '../src/modules/privacy/privacyDeadlines.js';
import { disconnectPrismaClient } from '../src/database/prisma.js';

try {
  const config = loadPrivacyConfiguration();
  if (!config.enabled) throw new Error('PRIVACY_DISABLED');
  const now = new Date();
  const counts = await new PrivacyRepository().deadlineCounts(now, addCalendarDays(now, 3));
  // Sólo conteos: integrar en monitoreo, sin nombres, contactos o cuerpos de solicitudes.
  process.stdout.write(`${JSON.stringify({ checkedAt: now.toISOString(), ...counts })}\n`);
  if (counts.overdue || counts.blockingOverdue) process.exitCode = 2;
} catch {
  process.stderr.write('No fue posible comprobar los plazos de privacidad. Revisar configuración y conectividad.\n');
  process.exitCode = 1;
} finally { await disconnectPrismaClient(); }
