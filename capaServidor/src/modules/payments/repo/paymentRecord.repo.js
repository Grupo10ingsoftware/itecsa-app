import getPrismaClient from "../../../database/prisma.js";

class PaymentRecordRepo {
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
      fecha_registro,
      observacion,
      id_usuario,
      id_estado_pago,
    } = data;
    const createdAt = fecha_registro ?? new Date();

    const registry = await this.client.registros.create({
      data: {
        FECHA_HORA: createdAt,
        id_pedido: Number(orderId),
        id_usuario: Number(id_usuario),
      },
    });

    return this.client.registro_Pago.create({
      data: {
        id_registro: registry.ID_REGISTRO,
        fecha_registro: createdAt,
        observacion: observacion ?? null,
        id_estado_pago_nuevo: Number(id_estado_pago),
      },
      include: {
        Registros: true,
      },
    });
  }

  async getById(paymentRecordId) {
    return this.client.registro_Pago.findUnique({
      where: { id_registro: Number(paymentRecordId) },
      include: {
        Registros: true,
      },
    });
  }

  async getByOrderId(orderId) {
    return this.client.registro_Pago.findMany({
      where: {
        Registros: {
          id_pedido: Number(orderId),
        },
      },
      include: {
        Registros: true,
      },
      orderBy: [
        { fecha_registro: "desc" },
        { id_registro: "desc" },
      ],
    });
  }

  async getByOrderIdAndRecordId(orderId, paymentRecordId) {
    return this.client.registro_Pago.findFirst({
      where: {
        id_registro: Number(paymentRecordId),
        Registros: {
          id_pedido: Number(orderId),
        },
      },
      include: {
        Registros: true,
      },
    });
  }
}

export default PaymentRecordRepo;
