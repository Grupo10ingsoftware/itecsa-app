import getPrismaClient from "../../../database/prisma.js";

export default class ProductionCapacityRepository {
  constructor({ prisma } = {}) { this.prisma = prisma; }
  get client() { if (!this.prisma) this.prisma = getPrismaClient(); return this.prisma; }
  list() {
    return this.client.tipo_Producto.findMany({
      where: { nombre_producto: "Lanyard" },
      select: { id_tipo_producto: true, nombre_producto: true, capacidad_diaria: true },
      orderBy: { nombre_producto: "asc" },
    });
  }
  async updateMany(capacities) {
    await this.client.$transaction(capacities.map(({ id, capacity }) =>
      this.client.tipo_Producto.update({ where: { id_tipo_producto: id }, data: { capacidad_diaria: capacity } })));
    return this.list();
  }
}
