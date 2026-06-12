import getPrismaClient from "../../../database/prisma.js";

class ProductTypeRepo {
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
    return this.client.tipo_Producto.findMany({
      orderBy: { nombre_producto: "asc" },
    });
  }

  async getById(productTypeId) {
    return this.client.tipo_Producto.findUnique({
      where: { id_tipo_producto: Number(productTypeId) },
    });
  }

  async create(data) {
    const { nombre_producto, descripcion_producto } = data;

    return this.client.tipo_Producto.create({
      data: {
        nombre_producto,
        descripcion_producto: descripcion_producto ?? null,
      },
    });
  }

  async getByName(nombreProducto) {
    return this.client.tipo_Producto.findFirst({
      where: {
        nombre_producto: {
          equals: nombreProducto,
        },
      },
    });
  }
}

export default ProductTypeRepo;
