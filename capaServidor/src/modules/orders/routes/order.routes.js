import { Router } from "express";
const router = Router();

import OrderController from "../controller/orders.controller";
const controller = new OrderController()

router.get('/', controller.getOrders);

router.get('/:orderId', );

router.post('/', );


/**
 * CDU-28 Actualizar automáticamente etapa kanban al 
 * confirmar pago del pedido
 * 
*/
router.patch('/:orderId/payment-status', controller.updatePaymentStatus);

router.patch('/:orderId/general-step',);

router.delete('/:orderId')

export default router