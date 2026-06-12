import pool from '../../../database/connection.js';
class PaymentStatusRepo {
  async create( data ) {
    try {
      const { nombre_estado_pago, descripcion_estado_pago } = data;
      const [result] = await pool.execute(
        `INSERT INTO Estado_Pago (
                            nombre_estado_pago,
                            descripcion_estado_pago
                        )
                        VALUES (?, ?)
                        `,
        [nombre_estado_pago, descripcion_estado_pago],
      );

      return {
        id_estado_pedido: result.insertId,
        nombre_estado_pago,
        descripcion_estado_pago,
      };
    } catch (err) {
      console.log(err);
    }
  }

  async get( id ) {
        try {
            const [rows] = await pool.execute(
                `SELECT * FROM Estado_Pago WHERE id_estado_pago = ?`,
                [id]
            )
            return rows[0] || null;
        } catch ( error ) {
            console.log( error );
            return null;
            
        }
    }

    async getAll(  ) {
        try {
            const [rows] = await pool.execute(
                `SELECT * FROM Estado_Pago`,
                
            )
            return rows;
        } catch ( error ) {
            console.log( error );
            return null;
            
        }
    }

}

export default PaymentStatusRepo;
