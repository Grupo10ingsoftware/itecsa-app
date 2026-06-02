import mysql from 'mysql2/promise'

class orderRepository {

    constructor() {

    }

    /**
     * Obtiene todos los pedidos de la base de datos
     * @returns { Promise<Array> } Array de pedidos
     * @throws { Error } si la querry falla
     */
     
    async getAllOrders() {
        
        try {
            const [rows, fields] = await pool.execute(
                'SELECT * FROM Pedido'
            )
            return rows;
            
        } catch ( err ) {
            console.log(err);
        }
        
        
    }

    /**
     * Obtiene todos los pedidos de la base de datos
     * @param { * } params 
     * @returns { Promise<Array> } Array de pedidos
     * @throws { Error } si la querry falla
     */

    /**
     * 
     * @param { int } id - ID del pedido
     * @param { object } data - Objeto con datos para actualizar
     * @returns { object } pedido actualizado
     * @throws { Error } si la querry falla
     */
    async update ( id , data ) {
    //    let pay = {
    //     'id_estado_pago' : 2,
    //     'id_etapa_general':  1
    //    }

        const fields = Object.keys( data ).map( key => `${ key } = ?`).join(', ');
        
        const values = Object.values( data );

        try {

            const updatedOrder = await pool.execute(
                `UPDATE Pedido SET ${ fields } WHERE id = ?`, 
                [ ...values, id ]
            )   

            //esto se hace ya que el querry de arriba solo devuelve metadata, por lo cual buscamos order por id

            return await this.get( id ) //esto se hace ya que el querry de arriba solo devuelve metadata
        
        } catch ( error ) {

            console.log( error );

        }
    }

    /**
     * 
     * @param { int } id - ID del pedido
     * @returns { object } Pedido con el ID solicitado
     * @throws { Error } si la querry falla
     */
    async get( id ) {
        try {
            const [rows] = await pool.execute(
                `SELECT * FROM Pedido WHERE id = ?`,
                [id]
            )
            return rows[0] || null;
        } catch ( error ) {
            console.log( error );
            return null;
            
        }
    }

}

export default orderRepository;