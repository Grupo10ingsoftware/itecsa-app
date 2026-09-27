import "dotenv/config";
import getPrismaClient, { disconnectPrismaClient } from "../src/database/prisma.js";
import OrderRepository from "../src/modules/orders/repo/orders.repo.js";
import SalesNoteSourceService, { normalizeSalesNoteNumber } from "../src/modules/orders/service/salesNoteSource.service.js";
import { Prisma } from "@prisma/client";

const db = getPrismaClient();
try {
  const report = {};
  try {
    const rows = await new OrderRepository({ prisma: db }).getAllOrders();
    report.kanbanRead = { ok: true, count: rows.length };
  } catch (error) {
    report.kanbanRead = { ok: false, code: error.code ?? error.name, column: error.meta?.column ?? null };
  }
  const [state, payment, types, labels, columns, storedNumbers, otherColumns, appliedMigrations, noteColumn, noteIndexes, blankNotes, canonicalCollisions, documentNoteCount, stageCounts, serverVersion, roleCounts] = await Promise.all([
    db.$queryRaw`SELECT id_estado_pedido AS id, nombre_etapa AS name FROM Estado_Pedido WHERE id_estado_pedido = 1`,
    db.$queryRaw`SELECT id_estado_pago AS id, nombre_estado_pago AS name FROM Estado_Pago WHERE id_estado_pago = 1`,
    db.$queryRaw`SELECT nombre_producto AS name FROM Tipo_Producto WHERE nombre_producto IN ('Yoyo','Lanyard','Tarjeta') ORDER BY nombre_producto`,
    db.$queryRaw`SELECT nombre_etiqueta AS name FROM etiqueta WHERE nombre_etiqueta IN ('Urgencia','Prioridad por contrato') AND esta_activa = 1 ORDER BY nombre_etiqueta`,
    db.$queryRaw`SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Detalle_pedido' AND COLUMN_NAME IN ('linea_origen','codigo_origen','producto_origen','familia_origen','subfamilia_origen') ORDER BY COLUMN_NAME`,
    db.$queryRaw`SELECT numero_nota_venta AS number FROM Pedidos WHERE numero_nota_venta IS NOT NULL`,
    db.$queryRaw`SELECT TABLE_NAME AS tableName, COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND ((TABLE_NAME = 'Registros' AND COLUMN_NAME = 'observacion') OR (TABLE_NAME = 'Tipo_Producto' AND COLUMN_NAME = 'capacidad_diaria')) ORDER BY TABLE_NAME`,
    db.$queryRaw`SELECT migration_name AS name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name`,
    db.$queryRaw`SELECT COLLATION_NAME AS collation FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Pedidos' AND COLUMN_NAME = 'numero_nota_venta'`,
    db.$queryRaw`SELECT INDEX_NAME AS name, NON_UNIQUE AS nonUnique FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Pedidos' AND COLUMN_NAME = 'numero_nota_venta'`,
    db.$queryRaw`SELECT COUNT(*) AS total FROM Pedidos WHERE numero_nota_venta IS NULL OR TRIM(numero_nota_venta) = ''`,
    db.$queryRaw`SELECT COUNT(*) AS total FROM (SELECT CASE WHEN TRIM(numero_nota_venta) REGEXP '^[Nn][Vv]-[0-9]{4}-' THEN SUBSTRING(TRIM(numero_nota_venta),9) ELSE TRIM(numero_nota_venta) END AS canonical FROM Pedidos WHERE numero_nota_venta IS NOT NULL GROUP BY canonical HAVING COUNT(*) > 1) AS duplicates`,
    db.$queryRaw`SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Nota_Venta'`,
    db.$queryRaw`SELECT COALESCE(ep.nombre_etapa, 'Sin estado') AS stage, COUNT(*) AS total FROM Pedidos p LEFT JOIN Estado_Pedido ep ON ep.id_estado_pedido = p.id_estado_pedido GROUP BY ep.nombre_etapa ORDER BY ep.nombre_etapa`,
    db.$queryRaw`SELECT VERSION() AS version`,
    db.$queryRaw`SELECT COUNT(*) AS total FROM Usuario WHERE BINARY rol_usuario IN ('Administrador','Producción','Ventas','Cobranzas','Administrador Producción','Operario Producción')`,
  ]);
  report.creationPrerequisites = {
    initialOrderState: state.length === 1,
    initialOrderStateName: state[0]?.name ?? null,
    initialPaymentState: payment.length === 1,
    initialPaymentStateName: payment[0]?.name ?? null,
    productiveTypes: types.map((row) => row.name),
    activePriorityLabels: labels.map((row) => row.name),
    snapshotColumns: columns.map((row) => row.name),
  };
  const fixture = await new SalesNoteSourceService().getSalesNotes();
  const existing = new Set(storedNumbers.map((row) => normalizeSalesNoteNumber(row.number)));
  report.fixtureCoverage = {
    fixtureNotes: fixture.length,
    alreadyRegistered: fixture.filter((row) => existing.has(normalizeSalesNoteNumber(row.numeroNota))).length,
    availableToRegister: fixture.filter((row) => !existing.has(normalizeSalesNoteNumber(row.numeroNota))).length,
  };
  if (process.argv[2]) {
    const requested = normalizeSalesNoteNumber(process.argv[2]);
    report.requestedNote = {
      inFixture: fixture.some((row) => normalizeSalesNoteNumber(row.numeroNota) === requested),
      alreadyRegistered: existing.has(requested),
    };
  }
  report.migrationPreflight = {
    otherColumns: otherColumns.map((row) => `${row.tableName}.${row.name}`),
    appliedMigrations: appliedMigrations.map((row) => row.name),
    noteCollation: noteColumn[0]?.collation ?? null,
    noteIndexes: noteIndexes.map((row) => ({ name: row.name, unique: row.nonUnique === 0 })),
    blankOrMissingNotes: Number(blankNotes[0]?.total ?? 0),
    canonicalDuplicateGroups: Number(canonicalCollisions[0]?.total ?? 0),
  };
  report.otherSource = { notaVentaTablePresent: documentNoteCount.length === 1 };
  report.databaseVersion = serverVersion[0]?.version ?? null;
  report.legacyRoleRows = Number(roleCounts[0]?.total ?? 0);
  report.orderStages = stageCounts.map((row) => ({ stage: row.stage, count: Number(row.total) }));
  const physicalColumns = await db.$queryRaw`SELECT TABLE_NAME AS tableName, COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()`;
  const byTable = new Map();
  for (const row of physicalColumns) {
    if (!byTable.has(row.tableName)) byTable.set(row.tableName, new Set());
    byTable.get(row.tableName).add(row.name);
  }
  const relevant = new Set(['Pedidos','Detalle_pedido','Cliente','Estado_Pedido','Estado_Pago','Tipo_Producto','Producto_Subproceso','Registros','Registro_Etapas','Pedido_Etiqueta','etiqueta','Pedido_Item_Sin_Seguimiento','Usuario','Mensaje','MENSAJE_USUARIO','Avance_Lanyard','registro_subprocesos']);
  report.modelDrift = Prisma.dmmf.datamodel.models
    .filter((model) => relevant.has(model.name))
    .map((model) => {
      const table = model.dbName ?? model.name;
      const physical = byTable.get(table);
      return { model: model.name, tablePresent: Boolean(physical), missing: physical ? model.fields.filter((field) => field.kind === 'scalar' || field.kind === 'enum').map((field) => field.dbName ?? field.name).filter((name) => !physical.has(name)) : [] };
    }).filter((model) => !model.tablePresent || model.missing.length);
  report.schemaReady = report.kanbanRead.ok
    && report.creationPrerequisites.initialOrderState
    && report.creationPrerequisites.initialPaymentState
    && report.creationPrerequisites.productiveTypes.length === 3
    && report.creationPrerequisites.snapshotColumns.length === 5
    && report.migrationPreflight.noteIndexes.some((index) => index.unique)
    && report.migrationPreflight.blankOrMissingNotes === 0
    && report.migrationPreflight.canonicalDuplicateGroups === 0
    && report.modelDrift.length === 0;
  report.sourceMode = 'local fixture';
  report.realOrdersReady = false;
  console.log(JSON.stringify(report));
  if (!report.schemaReady) process.exitCode = 2;
} catch (error) {
  console.log(JSON.stringify({ probeFailure: error.code ?? error.name, databaseCode: error.meta?.code ?? null }));
  process.exitCode = 1;
} finally {
  await disconnectPrismaClient();
}
