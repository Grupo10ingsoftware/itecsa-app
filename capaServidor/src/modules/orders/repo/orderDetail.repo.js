import pool from "../../../database/connection.js";

class OrderDetailRepo {
async create(orderId, data) {
    const {
      id_tipo_producto,
      cantidad,
      fecha_estimada_termino,
      fecha_real_termino,
    } = data;

    const [result] = await pool.execute(
      `
      INSERT INTO Detalle_pedido (
        id_pedido,
        id_tipo_producto,
        cantidad,
        fecha_estimada_termino,
        fecha_real_termino
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        orderId,
        id_tipo_producto,
        cantidad,
        fecha_estimada_termino,
        fecha_real_termino ?? null,
      ],
    );

    return this.getById(result.insertId);
  }

  async getById(detailId) {
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM Detalle_pedido
      WHERE id_detalle_pedido = ?
      `,
      [detailId],
    );

    return rows[0] || null;
  }

  async getByOrderId(orderId) {
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM Detalle_pedido
      WHERE id_pedido = ?
      ORDER BY id_detalle_pedido ASC
      `,
      [orderId],
    );

    return rows;
  }

  async getByOrderIdAndDetailId(orderId, detailId) {
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM Detalle_pedido
      WHERE id_pedido = ?
        AND id_detalle_pedido = ?
      `,
      [orderId, detailId],
    );

    return rows[0] || null;
  }
}

export default OrderDetailRepo;