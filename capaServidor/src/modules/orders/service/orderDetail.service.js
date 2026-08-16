import OrderDetailRepo from "../repo/orderDetail.repo.js";
import defaultUserRepository from "../../users/repo/users.repo.js";

class OrderDetailService {
  constructor({ repo, userRepo } = {}) {
    this.repo = repo ?? new OrderDetailRepo();
    this.userRepo = userRepo ?? defaultUserRepository;
  }

  async createOrderDetail(orderId, data) {
    const {
      id_tipo_producto,
      cantidad,
      fecha_estimada_termino,
      fecha_real_termino,
    } = data;

    if (!orderId) {
      const error = new Error("El ID del pedido es obligatorio");
      error.statusCode = 400;
      throw error;
    }

    if (!id_tipo_producto || cantidad === undefined) {
      const error = new Error("Faltan datos obligatorios del detalle");
      error.statusCode = 400;
      throw error;
    }

    return this.repo.create(orderId, {
      id_tipo_producto,
      cantidad,
      fecha_estimada_termino: fecha_estimada_termino ?? null,
      fecha_real_termino: fecha_real_termino ?? null,
    });
  }

  async getOrderDetail(orderId, detailId) {
    if (!orderId || !detailId) {
      const error = new Error("Faltan IDs obligatorios");
      error.statusCode = 400;
      throw error;
    }

    const detail = await this.repo.getByOrderIdAndDetailId(orderId, detailId);

    if (!detail) {
      const error = new Error("Detalle de pedido no encontrado");
      error.statusCode = 404;
      throw error;
    }

    return detail;
  }

  async getDetailsByOrderId(orderId) {
    if (!orderId) {
      const error = new Error("El ID del pedido es obligatorio");
      error.statusCode = 400;
      throw error;
    }

    return this.repo.getByOrderId(orderId);
  }

  async resolveInternalUserId(auth0UserId) {
    if (!auth0UserId) {
      const error = new Error("El usuario autenticado es obligatorio.");
      error.statusCode = 400;
      throw error;
    }

    const user = await this.userRepo.findByAuth0Id(auth0UserId);

    if (!user?.idUsuario) {
      const error = new Error("No existe un usuario interno vinculado a la sesion.");
      error.statusCode = 403;
      throw error;
    }

    return user.idUsuario;
  }

  async completeSubprocess(detailId, subprocessId, data = {}) {
    if (!detailId || !subprocessId) {
      const error = new Error("Faltan IDs obligatorios");
      error.statusCode = 400;
      throw error;
    }

    const id_usuario = await this.resolveInternalUserId(data.auth0UserId);

    return this.repo.completeSubprocess(detailId, subprocessId, {
      id_usuario,
      comment: data.comment,
    });
  }
}

export default OrderDetailService;
