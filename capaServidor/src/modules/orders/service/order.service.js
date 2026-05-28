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
let repo = {
  getOrderById,
  updOrderStep,
};

class Service {
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

    // validatePdf(order)

    //  Se debiera validar tambien que, si el cambio es hacia
    //  listo para producción, el estado de pago esté en confirmado

    // validatePaymentStatus(order)

    // Actualizamos la orden y dentro de la misma lógica de repo se
    // deben guardar los cambios
    await repo.updOrderStep(orderId, stepId);
  }
}
