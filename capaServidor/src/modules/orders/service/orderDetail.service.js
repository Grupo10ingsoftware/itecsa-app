import OrderDetailRepo from "../repo/orderDetail.repo.js";

class OrderDetailService {
  constructor({ repo } = {}) {
    this.repo = repo ?? new OrderDetailRepo();
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
}

export default OrderDetailService;
