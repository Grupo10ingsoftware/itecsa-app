import getPrismaClient from "../../../database/prisma.js";

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
}

export default OrderDetailRepo;
