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

    getSalesNote = async (req = request, res = response) => {
        try {
            const { numeroNota } = req.params;
            const salesNote = await this.service.getSalesNoteByNumber(numeroNota);

            res.status(200).json(salesNote);
        } catch (error) {
            const statusCode = error.statusCode ?? 500;

            res.status(statusCode).json({
                message: error.message || 'Error al consultar Nota de Venta',
            });
        }
    }

    createOrder = async (req = request, res = response) => {
        try {
            const order = await this.service.createOrder(req.body ?? {}, {
                auth0UserId: req.auth?.payload?.sub,
            });

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
            const { observacion } = req.body ?? {};

            const result = await this.service.updPaymentState(
                orderId,
                paymentStatusId,
                {
                    auth0UserId: req.auth?.payload?.sub,
                    actor: req.pinActor,
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
                    actor: req.pinActor,
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

    updateDeliveryDate = async (req = request, res = response) => {
        try {
            const { orderId } = req.params;
            const { dueDate } = req.body ?? {};

            const updatedOrder = await this.service.updateDeliveryDate(orderId, dueDate, {
                actor: req.pinActor,
            });

            res.status(200).json(updatedOrder);
        } catch (error) {
            const statusCode = error.statusCode ?? 500;

            res.status(statusCode).json({
                message: error.message || 'Error al actualizar fecha de entrega',
            });
        }
    }

    completeSubprocess = async (req = request, res = response) => {
        try {
            const { orderId, detailId, subprocessId } = req.params;
            const { comment } = req.body ?? {};

            const updatedOrder = await this.service.completeSubprocess(
                orderId,
                detailId,
                subprocessId,
                {
                    actor: req.pinActor,
                    comment,
                },
            );

            res.status(200).json(updatedOrder);
        } catch (error) {
            const statusCode = error.statusCode ?? 500;

            res.status(statusCode).json({
                message: error.message || 'Error al completar subproceso',
            });
        }
    }



}


export default OrderController;
