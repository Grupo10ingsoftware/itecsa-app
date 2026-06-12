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

    return this.client.registro_Pago.create({
      data: {
        fecha_registro: fecha_registro ?? new Date(),
        observacion: observacion ?? null,
        id_pedido: Number(orderId),
        id_usuario: Number(id_usuario),
        id_estado_pago: Number(id_estado_pago),
      },
    });
  }

  async getById(paymentRecordId) {
    return this.client.registro_Pago.findUnique({
      where: { id_registro_pago: Number(paymentRecordId) },
    });
  }

  async getByOrderId(orderId) {
    return this.client.registro_Pago.findMany({
      where: { id_pedido: Number(orderId) },
      orderBy: [
        { fecha_registro: "desc" },
        { id_registro_pago: "desc" },
      ],
    });
  }

  async getByOrderIdAndRecordId(orderId, paymentRecordId) {
    return this.client.registro_Pago.findFirst({
      where: {
        id_pedido: Number(orderId),
        id_registro_pago: Number(paymentRecordId),
      },
    });
  }
}

export default PaymentRecordRepo;
