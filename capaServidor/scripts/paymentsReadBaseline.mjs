import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

import getPrismaClient, { disconnectPrismaClient } from '../src/database/prisma.js';
import OrderService from '../src/modules/orders/service/order.service.js';
import PaymentRecordService from '../src/modules/payments/service/paymentRecord.service.js';

config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

function percentile(samples, fraction) {
  const sorted = [...samples].sort((a, b) => a - b);
  return Math.round(sorted[Math.ceil(sorted.length * fraction) - 1] * 10) / 10;
}

async function sample(operation) {
  const startedAt = performance.now();
  const result = await operation();
  return { result, duration: performance.now() - startedAt };
}

const orderService = new OrderService();
const previewService = new PaymentRecordService();
let stage = 'connection';

try {
  const prisma = getPrismaClient();
  await prisma.$queryRaw`SELECT 1 AS ok`;
  stage = 'order_count';
  const [{ orderCount }] = await prisma.$queryRaw`SELECT COUNT(*) AS orderCount FROM Pedidos`;
  stage = 'workspace';
  const first = await sample(() => orderService.getPaymentWorkspace());
  const orders = first.result.orders ?? [];
  const previewOrderId = orders[0]?.id_pedido ?? orders[0]?.id;
  const workspaceMs = [];
  const previewMs = [];
  const iterations = 10;

  for (let index = 0; index < iterations; index += 1) {
    workspaceMs.push((await sample(() => orderService.getPaymentWorkspace())).duration);
    if (previewOrderId) {
      stage = 'preview';
      previewMs.push((await sample(() => previewService.getConfirmationDetails(previewOrderId))).duration);
      stage = 'workspace';
    }
  }

  const result = {
    scope: 'lecturas de repositorio/servicio; no incluye HTTP, Auth0 ni render React',
    samples: iterations,
    orderCount: Number(orderCount),
    workspaceRows: orders.length,
    workspaceBytes: Buffer.byteLength(JSON.stringify(first.result)),
    workspaceP50Ms: percentile(workspaceMs, 0.5),
    workspaceP95Ms: percentile(workspaceMs, 0.95),
    ...(previewMs.length ? {
      previewP50Ms: percentile(previewMs, 0.5),
      previewP95Ms: percentile(previewMs, 0.95),
    } : {}),
  };
  console.log(JSON.stringify(result));
} catch (error) {
  // Evitar imprimir SQL, URL de conexión, datos de cliente o mensajes del driver.
  console.error(JSON.stringify({
    event: 'payments.read_baseline_failed',
    stage,
    code: typeof error?.code === 'string' ? error.code : 'unknown',
    driverCode: typeof error?.meta?.code === 'string' && /^[A-Za-z0-9_-]{1,20}$/.test(error.meta.code)
      ? error.meta.code
      : undefined,
  }));
  process.exitCode = 1;
} finally {
  await disconnectPrismaClient();
}
