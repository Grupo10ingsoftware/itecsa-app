import pool from "../../../database/connection.js";

class ProductTypeRepo {
  async getAll() {
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM Tipo_Producto
      ORDER BY nombre_producto ASC
      `,
    );

    return rows;
  }

  async getById(productTypeId) {
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM Tipo_Producto
      WHERE id_tipo_producto = ?
      `,
      [productTypeId],
    );

    return rows[0] || null;
  }

  async create(data) {
    const {
      nombre_producto,
      descripcion_producto,

    } = data;

    const [result] = await pool.execute(
      `
      INSERT INTO Tipo_Producto (
        nombre_producto,
        descripcion_producto

      )
      VALUES (?, ?)
      `,
      [
        nombre_producto,
        descripcion_producto ?? null,
      ],
    );

    return this.getById(result.insertId);
  }

  async getByName(nombreProducto) {
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM Tipo_Producto
      WHERE LOWER(nombre_producto) = LOWER(?)
      LIMIT 1
      `,
      [nombreProducto],
    );

    return rows[0] || null;
  }
}

export default ProductTypeRepo;