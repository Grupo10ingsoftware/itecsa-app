import getPrismaClient from "../../../database/prisma.js";
import { Prisma } from "@prisma/client";
import { snapshotOmit, supportsOrderSnapshots } from "../../orders/repo/orderSnapshotSchema.js";

const LANYARD_DAILY_CAPACITY = 1200;
const KANBAN_EN_PRODUCCION_STEP = 2;

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isLanyardName(value) {
  return normalizeText(value).includes("lanyard");
}

function toDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateOnly(dateKey) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function latestProgress(records = []) {
  return records[0] ?? null;
}

function deduplicateEntries(entries = []) {
  const byDetailId = new Map();

  for (const entry of entries) {
    byDetailId.set(Number(entry.detailId), {
      detailId: Number(entry.detailId),
      quantity: Number(entry.quantity),
      observation: entry.observation,
    });
  }

  return [...byDetailId.values()];
}

function firstProgressByDetail(records = []) {
  const progressByDetail = new Map();

  for (const record of records) {
    const detailId = Number(record.id_detalle_pedido);

    if (!progressByDetail.has(detailId)) {
      progressByDetail.set(detailId, record);
    }
  }

  return progressByDetail;
}

function mapDetail(detail, dateKey) {
  const todayProgress = detail.Avance_Lanyard.find((item) => toDateKey(item.fecha_produccion) === dateKey) ?? null;
  const currentProgress = latestProgress(detail.Avance_Lanyard);
  const quantity = Number(detail.cantidad ?? 0);
  const accumulated = Number(currentProgress?.cantidad_acumulada ?? 0);
  const percentage = Number(currentProgress?.porcentaje_acumulado ?? 0);

  return {
    detailId: detail.id_detalle_pedido,
    orderId: detail.id_pedido,
    salesNoteNumber: detail.Pedidos?.numero_nota_venta ?? null,
    clientName: detail.Pedidos?.Cliente?.nombre_cliente ?? detail.Pedidos?.Cliente?.razon_social ?? null,
    productType: detail.Tipo_Producto?.nombre_producto ?? null,
    quantity,
    dueDate: detail.fecha_estimada_termino ?? detail.Pedidos?.fecha_estimada_termino ?? null,
    orderStatus: detail.Pedidos?.Estado_Pedido?.nombre_etapa ?? null,
    generalStepId: detail.Pedidos?.Estado_Pedido?.orden_kanban ?? null,
    dailyQuantity: Number(todayProgress?.cantidad_dia ?? 0),
    accumulatedQuantity: accumulated,
    remainingQuantity: Math.max(0, quantity - accumulated),
    progressPercentage: percentage,
    todayProgressId: todayProgress?.id_avance_lanyard ?? null,
    latestProgressId: currentProgress?.id_avance_lanyard ?? null,
  };
}

export default class ProductionLoadRepository {
  constructor({ prisma } = {}) {
    this.prisma = prisma;
  }

  get client() {
    if (!this.prisma) this.prisma = getPrismaClient();
    return this.prisma;
  }

  async getCapacity() {
    return LANYARD_DAILY_CAPACITY;
  }

  async listLanyardDetails(dateKey) {
    const date = toDateOnly(dateKey);
    const details = await this.client.detalle_pedido.findMany({
      ...snapshotOmit(await supportsOrderSnapshots(this.client)),
      where: {
        Tipo_Producto: { nombre_producto: { contains: "Lanyard" } },
        Pedidos: { Estado_Pedido: { orden_kanban: KANBAN_EN_PRODUCCION_STEP } },
      },
      include: {
        Tipo_Producto: true,
        Pedidos: {
          include: {
            Cliente: true,
            Estado_Pedido: true,
          },
        },
        Avance_Lanyard: {
          where: { fecha_produccion: { lte: date } },
          orderBy: [
            { fecha_produccion: "desc" },
            { id_avance_lanyard: "desc" },
          ],
        },
      },
      orderBy: [
        { id_pedido: "asc" },
        { id_detalle_pedido: "asc" },
      ],
    });

    return details.map((detail) => mapDetail(detail, dateKey));
  }

  async updateDailyLoads({ dateKey, entries, userId, capacity }) {
    const date = toDateOnly(dateKey);
    const normalizedEntries = deduplicateEntries(entries);

    if (normalizedEntries.length === 0) {
      return undefined;
    }

    return this.client.$transaction(async (tx) => {
      const detailIds = normalizedEntries.map((entry) => entry.detailId);
      const details = await tx.detalle_pedido.findMany({
        ...snapshotOmit(await supportsOrderSnapshots(tx)),
        where: { id_detalle_pedido: { in: detailIds } },
        include: {
          Tipo_Producto: true,
          Pedidos: { include: { Estado_Pedido: true } },
        },
      });
      const detailsById = new Map(details.map((detail) => [Number(detail.id_detalle_pedido), detail]));

      if (detailsById.size !== detailIds.length) {
        const error = new Error("Detalle de pedido no encontrado.");
        error.statusCode = 404;
        throw error;
      }

      const previousProgress = firstProgressByDetail(await tx.avance_Lanyard.findMany({
        where: {
          id_detalle_pedido: { in: detailIds },
          fecha_produccion: { lt: date },
        },
        orderBy: [
          { id_detalle_pedido: "asc" },
          { fecha_produccion: "desc" },
          { id_avance_lanyard: "desc" },
        ],
      }));
      const rows = normalizedEntries.map((entry) => {
        const detail = detailsById.get(entry.detailId);
        const dailyQuantity = Number(entry.quantity);

        if (!isLanyardName(detail.Tipo_Producto?.nombre_producto)) {
          const error = new Error("Solo se puede registrar carga para detalles Lanyard.");
          error.statusCode = 400;
          throw error;
        }

        if (Number(detail.Pedidos?.Estado_Pedido?.orden_kanban) !== KANBAN_EN_PRODUCCION_STEP) {
          const error = new Error("La carga operativa solo considera pedidos En produccion.");
          error.statusCode = 409;
          throw error;
        }

        const totalQuantity = Number(detail.cantidad ?? 0);
        if (!Number.isInteger(totalQuantity) || totalQuantity <= 0) {
          const error = new Error("El detalle Lanyard no tiene una cantidad valida.");
          error.statusCode = 409;
          throw error;
        }

        const previous = previousProgress.get(entry.detailId);
        const accumulated = Number(previous?.cantidad_acumulada ?? 0) + dailyQuantity;

        if (accumulated > totalQuantity) {
          const error = new Error("La carga diaria supera la cantidad pendiente del detalle Lanyard.");
          error.statusCode = 400;
          throw error;
        }

        return {
          detailId: entry.detailId,
          dailyQuantity,
          accumulated,
          percentage: Math.round((accumulated / totalQuantity) * 10000) / 100,
          observation: entry.observation?.trim() || null,
        };
      });

      const values = Prisma.join(rows.map((row) => Prisma.sql`(
        ${row.detailId},
        ${date},
        ${row.dailyQuantity},
        ${row.accumulated},
        ${row.percentage},
        ${capacity},
        ${Number(userId)},
        ${row.observation}
      )`));

      await tx.$executeRaw`
        INSERT INTO Avance_Lanyard (
          id_detalle_pedido,
          fecha_produccion,
          cantidad_dia,
          cantidad_acumulada,
          porcentaje_acumulado,
          capacidad_diaria_referencia,
          id_usuario_registra,
          observacion
        )
        VALUES ${values}
        ON DUPLICATE KEY UPDATE
          cantidad_dia = VALUES(cantidad_dia),
          cantidad_acumulada = VALUES(cantidad_acumulada),
          porcentaje_acumulado = VALUES(porcentaje_acumulado),
          capacidad_diaria_referencia = VALUES(capacidad_diaria_referencia),
          id_usuario_registra = VALUES(id_usuario_registra),
          observacion = VALUES(observacion)
      `;
    }, { timeout: 15000 });
  }
}

export { LANYARD_DAILY_CAPACITY };
