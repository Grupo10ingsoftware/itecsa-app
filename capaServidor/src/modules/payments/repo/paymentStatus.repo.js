import getPrismaClient from "../../../database/prisma.js";

class PaymentStatusRepo {
  constructor({ prisma } = {}) {
    this.prisma = prisma;
  }

  get client() {
    if (!this.prisma) {
      this.prisma = getPrismaClient();
    }

    return this.prisma;
  }

  async create(data) {
    const { nombre_estado_pago, descripcion_estado_pago } = data;

    return this.client.estado_Pago.create({
      data: {
        nombre_estado_pago,
        descripcion_estado_pago,
      },
    });
  }

  async get(id) {
    return this.client.estado_Pago.findUnique({
      where: { id_estado_Pago: Number(id) },
    });
  }

  async getAll() {
    return this.client.estado_Pago.findMany({
      orderBy: { id_estado_Pago: "asc" },
    });
  }
}

export default PaymentStatusRepo;
