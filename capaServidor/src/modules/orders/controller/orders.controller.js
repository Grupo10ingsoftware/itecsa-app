import { sendOrderError, sendOrderOperationError } from "../service/salesOrder.errors.js";
import { roleFromPayload } from "../../../../../shared/authorization.js";
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

    getPaymentWorkspace = async (req = request, res = response) => {
        try {
            const workspace = await this.service.getPaymentWorkspace();
            res.status(200).json(workspace);
        } catch (error) {
            return sendOrderOperationError(res, error);
        }
    }

    getOrder = async ( req = request, res = response) => {
        try {
            const { orderId } = req.params;
            const order = await this.service.getOrderById(orderId);

            if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });

            res.status(200).json(order);
        } catch ( error ) {
            return sendOrderError(res, error);
        }
    }

    getSalesNote = async (req = request, res = response) => {
        try {
            const { numeroNota } = req.params;
            const salesNote = await this.service.getSalesNoteByNumber(numeroNota);

            res.status(200).json(salesNote);
        } catch (error) {
            return sendOrderError(res, error);
        }
    }

    createOrder = async (req = request, res = response) => {
        try {
            const order = await this.service.createOrder(req.body ?? {}, {
                auth0UserId: req.auth?.payload?.sub,
                actorId: req.currentUser?.idUsuario,
            });

            res.status(201).json(order);
        } catch (error) {
            return sendOrderError(res, error);
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
                    role: roleFromPayload(req.auth?.payload),
                    permissions: req.auth?.payload?.permissions,
                },
            );

            if (!result) {
                return res.status(404).json({
                    message: 'Pedido no encontrado',
                });
            }

            res.status(200).json(result);
        } catch (error) {
            return sendOrderOperationError(res, error);
        }
    }

    updateGeneralStep = async ( req = request, res = response) => {

        try {
            const { orderId } = req.params;
            if ( !orderId ) return res.status(400).json({ msg: 'Missing ID' });
            const { generalStepId, comment } = req.body ?? {};
            const result = await
            this.service.updGeneralStep(
                orderId,
                generalStepId,
                {
                    permissions: req.auth?.payload?.permissions,
                    role: roleFromPayload(req.auth?.payload),
                    actor: req.pinActor,
                    comment,
                },
            );

            if ( !result ) return res.status(404).json({
                message: 'Pedido no encontrado'
            })

            res.status( 200 ).json(result);
        } catch ( error ) {
            if (error.message === PAYMENT_CONFIRMATION_REQUIRED_MESSAGE) {
                return res.status(409).json({ message: error.message });
            }
            return sendOrderOperationError(res, error);
        }
    }

    sendToReview = async (req = request, res = response) => {
        try {
            const result = await this.service.sendToReview(
                req.params.orderId,
                req.body?.comment,
                { auth0UserId: req.auth?.payload?.sub },
            );
            return res.status(200).json(result);
        } catch (error) {
            return sendOrderOperationError(res, error);
        }
    }

    cancelProduction = async (req = request, res = response) => {
        try {
            const result = await this.service.cancelProduction(
                req.params.orderId,
                req.body?.comment,
                { actor: req.pinActor },
            );
            return res.status(200).json(result);
        } catch (error) {
            return sendOrderOperationError(res, error);
        }
    }

    reevaluate = async (req = request, res = response) => {
        try {
            const result = await this.service.reevaluateOrder(req.params.orderId, {
                auth0UserId: req.auth?.payload?.sub,
            });
            return res.status(200).json(result);
        } catch (error) {
            return sendOrderOperationError(res, error);
        }
    }

    setLabel = async (req = request, res = response) => {
        try {
            return res.status(200).json(await this.service.setOrderLabel(req.params.orderId, req.body, {
                auth0UserId: req.auth?.payload?.sub,
            }));
        } catch (error) {
            return sendOrderOperationError(res, error);
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
            return sendOrderOperationError(res, error);
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
            return sendOrderOperationError(res, error);
        }
    }

    rollbackSubprocess = async (req = request, res = response) => {
        try {
            const { orderId, detailId, subprocessId } = req.params;
            const result = await this.service.rollbackSubprocess(orderId, detailId, subprocessId, {
                actor: req.pinActor,
                comment: req.body?.comment,
            });
            return res.status(200).json(result);
        } catch (error) {
            return sendOrderOperationError(res, error);
        }
    }



}


export default OrderController;
