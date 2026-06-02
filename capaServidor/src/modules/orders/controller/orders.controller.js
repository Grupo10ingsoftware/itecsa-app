import { response, request } from "express";

import OrderService from "../service/order.service.js";
import { RF32_WAITING_PAYMENT_MESSAGE } from "../../../config/status.js";

// !Esto es MOCK






class OrderController {
    
    constructor() {
        this.service = new OrderService()
    }

    getOrders = async ( req = request, res = response) => {
        try {
            console.log('Hola');
            
            const orders = await this.service.getAllOrders()
            res.status( 200 ).json( orders );
            // -------------------
            // Aca va ir logica para MOCKS
            // -------------------
        } catch ( error ) {
            res.status(500).json({ message: 'Error al obtener pedidos' });
        }
    }
    
    updatePaymentStatus = async ( req = request, res = response) => {
        
        try {

            const { orderId } = req.params;
            if ( !orderId ) return res.status(400).json({ msg: 'Missing ID' });


            const paymentStatusId = req.body?.paymentStatusId ?? req.body?.paymentStatus;
            const result = await 
            this.service.updPaymentState( 
                orderId, 
                paymentStatusId
            );

            if ( !result ) return res.status(404).json({
                message: 'Pedido no encontrado'
            })

            res.status( 200 ).json(result);
        } catch ( error ) {
            const statusCode = error.statusCode ?? 500;
            res.status( statusCode ).json({
                message: error.message || 'Error al actualizar el pedido',
            })
        }
    }
    
    updateGeneralStep = async ( req = request, res = response) => {
        
        try {
            console.log('En updateGeneralStep')
            console.log('Params:', req.params)
            console.log('Body:', req.body)
            const { orderId } = req.params;
            if ( !orderId ) return res.status(400).json({ msg: 'Missing ID' });
            const { generalStepId } = req.body ?? {};
            const result = await 
            this.service.updGeneralStep( 
                orderId, 
                generalStepId
            );

            if ( !result ) return res.status(404).json({
                message: 'Pedido no encontrado'
            })

            res.status( 200 ).json(result);
        } catch ( error ) {
            const statusCode =
                error.message === RF32_WAITING_PAYMENT_MESSAGE
                    ? 409
                    : error.statusCode ?? 500;
            res.status( statusCode ).json({
                message: error.message || 'Error al actualizar el pedido',
            })
        }
    }



}


export default OrderController;
