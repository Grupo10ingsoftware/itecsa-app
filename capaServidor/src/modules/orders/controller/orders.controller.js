import { response, request } from "express";

import OrderService from "../service/order.service.js";
import { PAYMENT_CONFIRMATION_REQUIRED_MESSAGE } from "../../../config/status.js";


class OrderController {

    constructor({ service } = {}) {
        this.service = service ?? new OrderService()
    }

    getOrders = async ( req = request, res = response) => {
        try {
            const orders = await this.service.getAllOrders()
            res.status( 200 ).json( orders );
        } catch ( error ) {
            res.status(500).json({ message: 'Error al obtener pedidos' });
        }
    }

    getOrder = async ( req = request, res = response) => {
        try {
            const { orderId } = req.params;
            const order = await this.service.getOrderById(orderId);

            if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });

            res.status(200).json(order);
        } catch ( error ) {
            const statusCode = error.statusCode ?? 500;
            res.status(statusCode).json({
                message: error.message || 'Error al obtener pedido',
            });
        }
    }

    createOrder = async (req = request, res = response) => {
        try {
            const order = await this.service.createOrder(req.body ?? {});

            res.status(201).json(order);
        } catch (error) {
            const statusCode = error.statusCode ?? 500;

            res.status(statusCode).json({
                message: error.message || 'Error al crear pedido',
            });
        }
}

    updatePaymentStatus = async (req = request, res = response) => {
        try {
            const { orderId } = req.params;

            if (!orderId) {
                return res.status(400).json({ msg: 'Missing ID' });
            }

            const paymentStatusId = req.body?.paymentStatusId ?? req.body?.paymentStatus;
            const { id_usuario, observacion } = req.body ?? {};

            const result = await this.service.updPaymentState(
                orderId,
                paymentStatusId,
                {
                    id_usuario,
                    observacion,
                },
            );

            if (!result) {
                return res.status(404).json({
                    message: 'Pedido no encontrado',
                });
            }

            res.status(200).json(result);
        } catch (error) {
            const statusCode = error.statusCode ?? 500;

            res.status(statusCode).json({
                message: error.message || 'Error al actualizar el pedido',
            });
        }
    }

    updateGeneralStep = async ( req = request, res = response) => {

        try {
            const { orderId } = req.params;
            if ( !orderId ) return res.status(400).json({ msg: 'Missing ID' });
            const { generalStepId } = req.body ?? {};
            const result = await
            this.service.updGeneralStep(
                orderId,
                generalStepId,
                {
                    permissions: req.auth?.payload?.permissions,
                },
            );

            if ( !result ) return res.status(404).json({
                message: 'Pedido no encontrado'
            })

            res.status( 200 ).json(result);
        } catch ( error ) {
            const statusCode =
                error.message === PAYMENT_CONFIRMATION_REQUIRED_MESSAGE
                    ? 409
                    : error.statusCode ?? 500;
            res.status( statusCode ).json({
                message: error.message || 'Error al actualizar el pedido',
            })
        }
    }



}


export default OrderController;
