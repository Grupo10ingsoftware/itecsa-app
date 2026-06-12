import getPrismaClient from "../../../database/prisma.js";

const UPDATE_FIELDS = new Set([
  "nombre_etapa",
  "orden_kanban",
  "descripcion_estado",
]);

class OrderStatusRepository {
  constructor({ prisma } = {}) {
    this.prisma = prisma;
  }

  get client() {
    if (!this.prisma) {
      this.prisma = getPrismaClient();
    }

    return this.prisma;
  }

  async getAll() {
    return this.client.estado_Pedido.findMany({
      orderBy: { orden_kanban: "asc" },
    });
  }

  async create(data) {
    const { nombre_etapa, orden_kanban, descripcion_estado } = data;

    return this.client.estado_Pedido.create({
      data: {
        nombre_etapa,
        orden_kanban,
        descripcion_estado,
      },
    });
  }

  async update(id, data) {
    const entries = Object.entries(data)
      .filter(([key, value]) => UPDATE_FIELDS.has(key) && value !== undefined);

    if (entries.length === 0) {
      return this.get(id);
    }

    try {
      return await this.client.estado_Pedido.update({
        where: { id_estado_pedido: Number(id) },
        data: Object.fromEntries(entries),
      });
    } catch (error) {
      if (error?.code === "P2025") return null;
      throw error;
    }
  }

  async get(id) {
    return this.client.estado_Pedido.findUnique({
      where: { id_estado_pedido: Number(id) },
    });
  }
}

export default OrderStatusRepository;
