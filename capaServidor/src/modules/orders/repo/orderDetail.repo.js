import getPrismaClient from "../../../database/prisma.js";

const KANBAN_EN_PRODUCCION_STEP = 2;

async function nextId(client, modelName, fieldName) {
  const result = await client[modelName].aggregate({
    _max: { [fieldName]: true },
  });

  return Number(result._max[fieldName] ?? 0) + 1;
}

class OrderDetailRepo {
  constructor({ prisma } = {}) {
    this.prisma = prisma;
  }

  get client() {
    if (!this.prisma) {
      this.prisma = getPrismaClient();
    }

    return this.prisma;
  }

  async create(orderId, data) {
    const {
      id_tipo_producto,
      cantidad,
      fecha_estimada_termino,
      fecha_real_termino,
    } = data;

    return this.client.detalle_pedido.create({
      data: {
        id_pedido: Number(orderId),
        id_tipo_producto: Number(id_tipo_producto),
        cantidad,
        fecha_estimada_termino: fecha_estimada_termino ?? null,
        fecha_real_termino: fecha_real_termino ?? null,
      },
    });
  }

  async getById(detailId) {
    return this.client.detalle_pedido.findUnique({
      where: { id_detalle_pedido: Number(detailId) },
    });
  }

  async getByOrderId(orderId) {
    return this.client.detalle_pedido.findMany({
      where: { id_pedido: Number(orderId) },
      orderBy: { id_detalle_pedido: "asc" },
    });
  }

  async getByOrderIdAndDetailId(orderId, detailId) {
    return this.client.detalle_pedido.findFirst({
      where: {
        id_pedido: Number(orderId),
        id_detalle_pedido: Number(detailId),
      },
    });
  }

  async completeSubprocess(detailId, subprocessId, data) {
    const { id_usuario, comment } = data;
    const completedAt = new Date();

    return this.client.$transaction(async (tx) => {
      const detail = await tx.detalle_pedido.findUnique({
        where: { id_detalle_pedido: Number(detailId) },
        include: {
          Pedidos: {
            include: {
              Estado_Pedido: true,
            },
          },
          Tipo_Producto: {
            include: {
              Producto_Subproceso: {
                include: {
                  Estado_Subprocesos: true,
                },
                orderBy: { orden_flujo: "asc" },
              },
            },
          },
          registro_subprocesos: true,
        },
      });

      if (!detail) {
        const error = new Error("Detalle de pedido no encontrado");
        error.statusCode = 404;
        throw error;
      }

      if (Number(detail.Pedidos?.Estado_Pedido?.orden_kanban) !== KANBAN_EN_PRODUCCION_STEP) {
        const error = new Error("Los subprocesos solo se pueden completar en En produccion.");
        error.statusCode = 409;
        throw error;
      }

      const subprocesses = detail.Tipo_Producto?.Producto_Subproceso ?? [];
      const targetIndex = subprocesses.findIndex(
        (subprocess) =>
          Number(subprocess.id_estado_subproceso) === Number(subprocessId),
      );

      if (targetIndex === -1) {
        const error = new Error("El subproceso no corresponde al tipo de producto del detalle.");
        error.statusCode = 404;
        throw error;
      }

      const completedIds = new Set(
        detail.registro_subprocesos
          .filter((record) => record.id_estado_subproceso !== null)
          .map((record) => Number(record.id_estado_subproceso)),
      );

      if (completedIds.has(Number(subprocessId))) {
        const error = new Error("El subproceso ya fue completado.");
        error.statusCode = 409;
        throw error;
      }

      const firstPendingIndex = subprocesses.findIndex(
        (subprocess) =>
          !completedIds.has(Number(subprocess.id_estado_subproceso)),
      );

      if (targetIndex !== firstPendingIndex) {
        const error = new Error("No puedes saltar subprocesos pendientes.");
        error.statusCode = 409;
        throw error;
      }

      const record = await tx.registro_subprocesos.create({
        data: {
          id_registro_subproceso: await nextId(
            tx,
            "registro_subprocesos",
            "id_registro_subproceso",
          ),
          fecha_hora_entrada: completedAt,
          fecha_hora_salida: completedAt,
          id_detalle_pedido: Number(detailId),
          id_estado_subproceso: Number(subprocessId),
          id_usuario: Number(id_usuario),
        },
      });

      const trimmedComment =
        typeof comment === "string" ? comment.trim() : "";

      const productionComment = trimmedComment
        ? await tx.comentario_Produccion.create({
            data: {
              id_comentario_produccion: await nextId(
                tx,
                "comentario_Produccion",
                "id_comentario_produccion",
              ),
              comentario: trimmedComment,
              fecha_comentario: completedAt,
              id_usuario: Number(id_usuario),
              id_detalle_pedido: Number(detailId),
            },
          })
        : null;

      return {
        record,
        comment: productionComment,
      };
    });
  }
}

export default OrderDetailRepo;
