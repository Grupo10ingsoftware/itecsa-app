/**
 * RF28
 * Actualiza automáticamente el estado del pedido
 * a "Listo para producción" cuando cobranzas
 * confirma el pago.
 * Temas a considerar:
 * - Estado es una tabla, por lo cual se debe definir el id de 'listo para producción'
 * Requiere:
 * - Estado nuevo de pago
 * id_etapa_actual_general
 * id_pedido
 * Flujo:
 * 1. buscar pedido
 * 2. validar rol de cobranzas
 * 3. validar pdf adjunto
 * 4. cambiar estado de pago a 'confirmado'
 * 5. cabmiar estado general de pedido a 'listo para producción'
 * 6. guardar cambios
 */
/*
Esto es un mock de un repo, ignorar hasta que tengamos la BD definida
*/

import orderRepository from "../repo/orders.repo.js"



class OrderService {
  constructor () {
    this.repo = new orderRepository();
  }
  /**
   * RF28
   * Actualiza automáticamente el estado del pedido
   * a "Listo para producción" cuando cobranzas
   * confirma el pago.
   * Temas a considerar:
   * - Estado es una tabla, por lo cual se debe definir el id de 'listo para producción'
   * Requiere:
   * - Estado nuevo de pago
   * id_etapa_actual_general
   * id_pedido
   * Flujo:
   * 1. buscar pedido
   * 2. validar rol de cobranzas
   * 3. validar pdf adjunto
   * 4. cambiar estado de pago a 'confirmado'
   * 5. cabmiar estado general de pedido a 'listo para producción'
   * 6. guardar cambios
   */
  
  /**
   * *Supondremos esto como estado de pago, no sabrremos hasta que la BD este lista :{
   *  ?'En espera': 0,
   *  *'Confirmado': 1,
   *  !'Rechazado': 2
   * }
   */
  
  /**
   * *Supondremos esto como estado general productivo, no sabrremos hasta que la BD este lista :{
   *  ?'Confirmación pago': 0,
   *  *'Listo para producción': 1,
   *  ?'En producción': 2
   *  *'Listo para entrega': 3
   * }
   */
  async updateGeneralStep(orderId, stepId) {

    const order = await this.repo.get( orderId )
    if ( !order ) return null
    
    


    if (order.id_estado_pago == 0 || id_estado_pago == 2) {

    }

    if (!order) return;
    
    
  }

  async getAllOrders() {
    try {
      const orders = await this.repo.getAllOrders()
      if ( !orders ) return null

      return orders
    } catch ( error ) {
      return error
    }  
  }



  /**
   * Actuaiza el estado de pago de un pedido
   * @param { number } orderId  - ID del pedido
   * @param { number } newPaymentStatusId - Id del estado de pago nuevo
   */
  async updPaymentState(orderId, newPaymentStatusId) {

    const order = await this.repo.get( orderId )
    if ( !order ) return null

    if  ( newPaymentStatusId === 1 ) {
      const updatedOrder = await this.repo.update( orderId, 
        { 
          'id_estado_pago': newPaymentStatusId,
          'id_etapa_general' : 1 
          //! el id de la etapa general se debe buscar en un repo de etapas generales, 
          //! pero por ahora no es necesario ya que no se sabe que id va a tener
        }
      )
    } else {
       const updatedOrder = await this.repo.update( orderId, {'id_estado_pago': newPaymentStatusId})
      }
      
      return updatedOrder || order;
  }
}

export default OrderService;