import pool from "../../../database/connection.js";

class ClientRepo {
  async create(data) {
    try {
      const {
        rut_cliente,
        nombre_cliente,
        razon_social,
        estado_cliente
        } = data;

      const [result] = await pool.execute(
        `INSERT INTO Cliente (
                    rut_cliente,
                    nombre_cliente,
                    razon_social,
                    estado_cliente
                )
                VALUES (?, ?, ?, ?)
                `,
        [rut_cliente, nombre_cliente, razon_social, estado_cliente],
      );
      return {
        id_cliente: result.insertId,
        rut_cliente,
        nombre_cliente,
        razon_social,
        estado_cliente,
      };
    } catch (error) {
      console.log(error);
    }
  }

  async get(id) {
    try {
      const [rows] = await pool.execute(
        `SELECT * FROM Cliente WHERE id_cliente = ?`,
        [id],
      );
      return rows[0] || null;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async getAll() {
    try {
      const [rows] = await pool.execute(`SELECT * FROM Cliente`);
      return rows;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async getByRut(rutCliente) {
        try {
            const [rows] = await pool.execute(
            `SELECT * FROM Cliente WHERE rut_cliente = ? LIMIT 1`,
            [rutCliente],
            );

            return rows[0] || null;
        } catch (error) {
            console.log(error);
            return null;
        }
    }

}

export default ClientRepo;