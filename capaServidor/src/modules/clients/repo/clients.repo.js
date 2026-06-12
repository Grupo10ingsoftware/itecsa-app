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
    try {
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
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async get(id) {
    try {
      return this.client.cliente.findUnique({
        where: { id_cliente: Number(id) },
      });
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async getAll() {
    try {
      return this.client.cliente.findMany();
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async getByRut(rutCliente) {
    try {
      return this.client.cliente.findUnique({
        where: { rut_cliente: rutCliente },
      });
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}

export default ClientRepo;
