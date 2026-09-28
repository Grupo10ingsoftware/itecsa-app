import ClientRepo from "../repo/clients.repo.js";

class ClientService {
  constructor({ repo } = {}) {
    this.repo = repo ?? new ClientRepo();
  }

  async createClient(data) {
    try {
      const { rut_cliente, nombre_cliente, razon_social, estado_cliente } =
        data;

      return await this.repo.create({
        rut_cliente,
        nombre_cliente,
        razon_social,
        estado_cliente,
      });
    } catch (error) {
      throw new Error(
        "Error al crear nuevo cliente - Capa Servicio",
        error.msg,
      );
    }
  }

  async findOrCreateClient(data) {
    const { rut_cliente, nombre_cliente, razon_social, estado_cliente } = data;

    if (!rut_cliente) {
      const error = new Error("El RUT del cliente es obligatorio");
      error.statusCode = 400;
      throw error;
    }

    const existingClient = await this.repo.getByRut(rut_cliente);

    if (existingClient) return existingClient;

    return this.repo.create({
      rut_cliente,
      nombre_cliente,
      razon_social,
      estado_cliente: estado_cliente ?? "ACTIVO",
    });
  }
  async getClient(id) {
    const client = await this.repo.get(id);
    if (!client) throw new Error("No se encontró el estado de pago solicitado");
    return client;
  }

  async getClientByRut(rutCliente) {
    if (!rutCliente) {
      const error = new Error("El RUT del cliente es obligatorio");
      error.statusCode = 400;
      throw error;
    }

    const client = await this.repo.getByRut(rutCliente);

    if (!client) {
      const error = new Error("Cliente no encontrado");
      error.statusCode = 404;
      throw error;
    }

    return client;
  }
}

export default ClientService;
