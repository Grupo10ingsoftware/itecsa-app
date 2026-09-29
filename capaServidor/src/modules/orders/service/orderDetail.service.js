import { AppError } from "../../../errors/AppError.js";
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
      id_estado_subproceso,
    } = data;

    if (!orderId) {
      const error = new AppError(400, "El ID del pedido es obligatorio");
      throw error;
    }

    if (!id_tipo_producto || cantidad === undefined) {
      const error = new AppError(400, "Faltan datos obligatorios del detalle");
      throw error;
    }

    return this.repo.create(orderId, {
      linea_origen: data.linea_origen ?? null,
      codigo_origen: data.codigo_origen ?? null,
      producto_origen: data.producto_origen ?? null,
      familia_origen: data.familia_origen ?? null,
      subfamilia_origen: data.subfamilia_origen ?? null,
      id_tipo_producto,
      cantidad,
      fecha_estimada_termino: fecha_estimada_termino ?? null,
      fecha_real_termino: fecha_real_termino ?? null,
      id_estado_subproceso: id_estado_subproceso ?? null,
    });
  }

  async getOrderDetail(orderId, detailId) {
    if (!orderId || !detailId) {
      const error = new AppError(400, "Faltan IDs obligatorios");
      throw error;
    }

    const detail = await this.repo.getByOrderIdAndDetailId(orderId, detailId);

    if (!detail) {
      const error = new AppError(404, "Detalle de pedido no encontrado");
      throw error;
    }

    return detail;
  }

  async getDetailsByOrderId(orderId) {
    if (!orderId) {
      const error = new AppError(400, "El ID del pedido es obligatorio");
      throw error;
    }

    return this.repo.getByOrderId(orderId);
  }
}

export default OrderDetailService;
