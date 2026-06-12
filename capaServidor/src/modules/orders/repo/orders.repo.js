import pool from "../../../database/connection.js";

class OrderRepository {
  async getAllOrders() {
    const [rows] = await pool.execute(`
      SELECT
        p.*,
        c.nombre_cliente,
        GROUP_CONCAT(DISTINCT tp.nombre_producto SEPARATOR ', ') AS nombre_producto,
        ep.orden_kanban AS id_etapa_general,
        ep.nombre_etapa AS nombre_etapa_general,
        epa.nombre_estado_pago AS estado_pago
      FROM Pedidos p
      LEFT JOIN Cliente c
        ON c.id_cliente = p.id_cliente
      LEFT JOIN Detalle_pedido dp
        ON dp.id_pedido = p.id_pedido
      LEFT JOIN Tipo_Producto tp
        ON tp.id_tipo_producto = dp.id_tipo_producto
      LEFT JOIN Estado_Pedido ep
        ON ep.id_estado_pedido = p.id_estado_pedido
      LEFT JOIN Estado_Pago epa
        ON epa.id_estado_pago = p.id_estado_pago
      GROUP BY p.id_pedido
      ORDER BY p.id_pedido DESC
    `);

    return rows;
  }

  async get(id) {
    const [rows] = await pool.execute(
      `
      SELECT
        p.*,
        ep.orden_kanban AS id_etapa_general,
        ep.nombre_etapa AS nombre_etapa_general,
        epa.nombre_estado_pago AS estado_pago
      FROM Pedidos p
      LEFT JOIN Estado_Pedido ep
        ON ep.id_estado_pedido = p.id_estado_pedido
      LEFT JOIN Estado_Pago epa
        ON epa.id_estado_pago = p.id_estado_pago
      WHERE p.id_pedido = ?
      `,
      [id],
    );

    return rows[0] || null;
  }

  async create(data) {
    const {
      id_cliente,
      id_usuario,
      id_estado_pedido,
      id_estado_pago,
      id_etiqueta,
      fecha_estimada_termino,
    } = data;

    const [result] = await pool.execute(
      `
      INSERT INTO Pedidos (
        fecha_creacion,
        fecha_estimada_termino,
        id_usuario,
        id_estado_pedido,
        id_estado_pago,
        id_cliente,
        id_etiqueta
      )
      VALUES (NOW(), ?, ?, ?, ?, ?, ?)
      `,
      [
        fecha_estimada_termino ?? null,
        id_usuario,
        id_estado_pedido,
        id_estado_pago,
        id_cliente,
        id_etiqueta ?? null,
      ],
    );

    return this.get(result.insertId);
  }

  async update(id, data) {
    const entries = Object.entries(data).filter(([, value]) => value !== undefined);

    if (entries.length === 0) {
      return this.get(id);
    }

    const fields = entries.map(([key]) => `${key} = ?`).join(", ");
    const values = entries.map(([, value]) => value);

    await pool.execute(
      `UPDATE Pedidos SET ${fields} WHERE id_pedido = ?`,
      [...values, id],
    );

    return this.get(id);
  }

  async updateGeneralStep(id, ordenKanban) {
    await pool.execute(
      `
      UPDATE Pedidos
      SET id_estado_pedido = (
        SELECT id_estado_pedido
        FROM Estado_Pedido
        WHERE orden_kanban = ?
        LIMIT 1
      )
      WHERE id_pedido = ?
      `,
      [ordenKanban, id],
    );

    return this.get(id);
  }

  async updatePaymentStatus(id, paymentStatusId, nextKanbanOrder) {
    await pool.execute(
      `
      UPDATE Pedidos
      SET
        id_estado_pago = ?,
        id_estado_pedido = (
          SELECT id_estado_pedido
          FROM Estado_Pedido
          WHERE orden_kanban = ?
          LIMIT 1
        )
      WHERE id_pedido = ?
      `,
      [paymentStatusId, nextKanbanOrder, id],
    );

    return this.get(id);
  }
}

export default OrderRepository;
