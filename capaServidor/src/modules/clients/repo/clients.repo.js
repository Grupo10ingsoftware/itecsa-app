import getPrismaClient from "../../../database/prisma.js";

class ClientRepo {
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
      const {
        rut_cliente,
        nombre_cliente,
        razon_social,
        estado_cliente
        } = data;

      return this.client.cliente.create({
        data: {
          rut_cliente,
          nombre_cliente,
          razon_social,
          estado_cliente,
        },
      });
  }

  async get(id) {
      return this.client.cliente.findUnique({
        where: { id_cliente: Number(id) },
      });
  }

  async getAll() {
      return this.client.cliente.findMany();
  }

  async getByRut(rutCliente) {
      return this.client.cliente.findUnique({
        where: { rut_cliente: rutCliente },
      });
  }
}

export default ClientRepo;
