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



//!------------------------------MOCK

const GENERAL_STEPS = Object.freeze([
  {
    id: 0,
    orden_etapa:1,
    key: 'confirmacion-pago',
    title: 'Confirmación de pago',
  },
  {
    id: 1,
    orden_etapa:2,
    key: 'listo-produccion',
    title: 'Listo para producción',
  },
  {
    id: 2,
    orden_etapa:3,
    key: 'en-produccion',
    title: 'En producción',
  },
  {
    id: 3,
    orden_etapa:4,
    key: 'listo-entrega',
    title: 'Listo para entrega',
  },
]);



const mockOrders = [
  {
    id_pedido: 1,
    nombre_cliente: 'Colegio Andes',
    codigo_nota_venta: 'NV-6767',
    nombre_producto: 'Cordones',
    fecha_pedido: '21-05-2026',
    estado_pago: 'Pendiente',
    id_estado_pago: 0,
    id_etapa_general: 0,
  },
  {
    id_pedido: 2,
    nombre_cliente: 'Chile',
    codigo_nota_venta: 'NV-6768',
    nombre_producto: 'Lanyards',
    fecha_pedido: '21-05-2026',
    estado_pago: 'Pendiente',
    id_estado_pago: 0,
    id_etapa_general: 0,
  },
  {
    id_pedido: 3,
    nombre_cliente: 'Bulla de mi vida',
    codigo_nota_venta: 'NV-6769',
    nombre_producto: 'Cordones',
    fecha_pedido: '21-05-2026',
    estado_pago: 'Pendiente',
    id_estado_pago: 0,
    id_etapa_general: 0,
  },
  {
    id_pedido: 4,
    nombre_cliente: 'Bulla de mi amor',
    codigo_nota_venta: 'NV-6779',
    nombre_producto: 'Lanyards',
    fecha_pedido: '21-05-2026',
    estado_pago: 'Confirmado',
    id_estado_pago: 1,
    id_etapa_general: 3,
  },
  {
    id_pedido: 5,
    nombre_cliente: 'Puro sentimiento',
    codigo_nota_venta: 'NV-6777',
    nombre_producto: 'Lanyards',
    fecha_pedido: '21-05-2026',
    estado_pago: 'Confirmado',
    id_estado_pago: 1,
    id_etapa_general: 3,
  },
  {
    id_pedido: 6,
    nombre_cliente: 'Franco Parisi',
    codigo_nota_venta: 'NV-6778',
    nombre_producto: 'Lanyards',
    fecha_pedido: '21-05-2026',
    estado_pago: 'Confirmado',
    id_estado_pago: 1,
    id_etapa_general: 1,
  },
];

//!------------------------------

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



//* Esto deberia ser un servicio de la API de etapa_kanban, yo lo veré
function getStepById(stepId) {
  return GENERAL_STEPS.find((step) => Number(step.id) === Number(stepId));
}

class OrderService {
  constructor () {
    this.repo = new orderRepository();
  }
  
  
 
  async updGeneralStep(orderId, stepId) {
    console.log('actualizando');
    

    //!--MOCK--
    const orderIndex = mockOrders.findIndex((currentOrder) => Number(currentOrder.id_pedido) === Number(orderId));
    const order = mockOrders.find((currentOrder) => Number(currentOrder.id_pedido) === Number(orderId));

    //!--MOCK--

    //? Descomentar cuando haya BD
    // const order = await this.repo.get( orderId )
    if ( !order ) throw new Error('Pedido no encontrado')
    
    const currentStepOrder = getStepById(order.id_etapa_general)

    const newStep = getStepById( stepId )
    
    if (!newStep) throw new Error('Etapa no encontrada')

if (newStep.orden_etapa < currentStepOrder.orden_etapa) {
  throw new Error('No puedes retroceder en las etapas del pedido');
}
    // no devolverse en etapas
    //? Deberiamos revisar esto
    if ( newStep.orden_etapa < currentStepOrder.orden_etapa) {
      throw new Error('No puedes retroceder en las etapas del pedido');
    }

    if (order.id_estado_pago == 0 || order.id_estado_pago == 2) {
      throw new Error('El pedido no se encuentra con pago confirmado')
    }
    //!--MOCK-- Actualizar mock
      mockOrders[orderIndex].id_etapa_general = stepId
    //!--MOCK--

    // const updatedOrder = await this.repo.update( 
    //   orderId , 
    //   { id_etapa_general : stepId}
    // )

    // return updatedOrder

    return mockOrders[orderIndex]
  }

  async getAllOrders() {
    try {
      console.log(' en get all Orders')

      //!--Mock--
      const orders = mockOrders
      //!--Mock--

      //? Descomentar cuando haya BD
      // const orders = await this.repo.getAllOrders()
      // if ( !orders ) return null

      return orders
    } catch ( error ) {
      throw new Error('Error en getAllOrders')
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