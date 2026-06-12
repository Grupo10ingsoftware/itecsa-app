import PaymentRecordRepo from "../repo/paymentRecord.repo.js";

class PaymentRecordService {
  constructor({ repo } = {}) {
    this.repo = repo ?? new PaymentRecordRepo();
  }

  async createPaymentRecord(orderId, data) {
    const {
      fecha_registro,
      observacion,
      id_usuario,
      id_estado_pago,
    } = data;

    if (!orderId) {
      const error = new Error("El ID del pedido es obligatorio");
      error.statusCode = 400;
      throw error;
    }

    if (!id_usuario || !id_estado_pago) {
      const error = new Error("Faltan datos obligatorios del registro de pago");
      error.statusCode = 400;
      throw error;
    }

    return this.repo.create(orderId, {
      fecha_registro,
      observacion,
      id_usuario,
      id_estado_pago,
    });
  }

  async getPaymentRecord(orderId, paymentRecordId) {
    if (!orderId || !paymentRecordId) {
      const error = new Error("Faltan IDs obligatorios");
      error.statusCode = 400;
      throw error;
    }

    const record = await this.repo.getByOrderIdAndRecordId(orderId, paymentRecordId);

    if (!record) {
      const error = new Error("Registro de pago no encontrado");
      error.statusCode = 404;
      throw error;
    }

    return record;
  }

  async getPaymentRecordsByOrderId(orderId) {
    if (!orderId) {
      const error = new Error("El ID del pedido es obligatorio");
      error.statusCode = 400;
      throw error;
    }

    return this.repo.getByOrderId(orderId);
  }
}

export default PaymentRecordService;
