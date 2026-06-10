import pool from "../../../database/connection.js";

class PaymentRecordRepo {
  async create(orderId, data) {
    const {
      fecha_registro,
      observacion,
      id_usuario,
      id_estado_pago,
    } = data;

    const [result] = await pool.execute(
      `
      INSERT INTO Registro_Pago (
        fecha_registro,
        observacion,
        id_pedido,
        id_usuario,
        id_estado_pago
      )
      VALUES (COALESCE(?, NOW()), ?, ?, ?, ?)
      `,
      [
        fecha_registro ?? null,
        observacion ?? null,
        orderId,
        id_usuario,
        id_estado_pago,
      ],
    );

    return this.getById(result.insertId);
  }

  async getById(paymentRecordId) {
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM Registro_Pago
      WHERE id_registro_pago = ?
      `,
      [paymentRecordId],
    );

    return rows[0] || null;
  }

  async getByOrderId(orderId) {
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM Registro_Pago
      WHERE id_pedido = ?
      ORDER BY fecha_registro DESC, id_registro_pago DESC
      `,
      [orderId],
    );

    return rows;
  }

  async getByOrderIdAndRecordId(orderId, paymentRecordId) {
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM Registro_Pago
      WHERE id_pedido = ?
        AND id_registro_pago = ?
      `,
      [orderId, paymentRecordId],
    );

    return rows[0] || null;
  }
}

export default PaymentRecordRepo;