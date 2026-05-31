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

import orderRepository from "../repo/orders.repo"



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

  async updateGeneralStep(orderId, stepId) {
    /* TODO:
        Definir origen exacto del estado de pago (NV o Pedido)
        Cuando el modelo DB este finalizado
        */
    const order = await repo.getOrderById(orderId); //Aca se entrega orderId

    if (!order) return;
    // Validaciones

    //  Rol cobranzas
    // validateRole( order )

    //  Rol pdf adjunto
    //  ! Esto quiza me tome más timepo
    // validatePdf(order)

    //  Se debiera validar tambien que, si el cambio es hacia
    //  listo para producción, el estado de pago esté en confirmado

    // validatePaymentStatus(order)

    // Actualizamos la orden y dentro de la misma lógica de repo se
    // deben guardar los cambios
    await repo.updOrderStep(orderId, stepId);
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
   * *Supondremos esto como estado de pago, no sabrremos hasta que la BD este lista :{
   *  ?'En espera': 0,
   *  *'Confirmado': 1,
   *  !'Rechazado': 2
   * }
   */

  /**
   * Actuaiza el estado de pago de un pedido
   * @param { number } orderId  - ID del pedido
   * @param { number } newPaymentStatusId - Id del estado de pago nuevo
   */
  async updPaymentState(orderId, newPaymentStatusId) {

    let order = await this.repo.get( orderId )
    if ( !order ) return null

    if  ( newPaymentStatusId === 2 ) {
      const updateOrder = await this.repo.update( orderId, 
        { 
          'id_estado_pago': newPaymentStatusId,
          'id_etapa_general' : 1 
          //! el id de la etapa general se debe buscar en un repo de etapas generales, 
          //! pero por ahora no es necesario ya que no se sabe que id va a tener
        }
      )
    } else {
       const updateOrder = await this.repo.update( orderId, {'id_estado_pago': newPaymentStatusId})
      }
      
      return updateOrder || order;
  }
}

export default OrderService;