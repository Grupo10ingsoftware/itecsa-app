import { respondError } from "../../../errors/httpErrors.js";
import { roleFromPayload } from "../../../../../shared/authorization.js";
import { response, request } from "express";

import OrderService from "../service/order.service.js";



class OrderController {

    constructor({ service } = {}) {
        this.service = service ?? new OrderService()
    }

    getOrders = async ( req = request, res = response) => {
        try {
            const orders = await this.service.getAllOrders(req.query)
            res.status( 200 ).json( orders );
        } catch ( error ) {
            return respondError(error, req, res);
        }
    }

    getCalendarOrders = async (req = request, res = response) => {
        try { return res.status(200).json(await this.service.getOrderViews(req.query, 'calendar')); }
        catch (error) { return respondError(error, req, res); }
    }

    getKanbanDetail = async (req = request, res = response) => {
        try { return res.status(200).json(await this.service.getOrderViewById(req.params.orderId, 'kanban')); }
        catch (error) { return respondError(error, req, res); }
    }

    getCalendarDetail = async (req = request, res = response) => {
        try { return res.status(200).json(await this.service.getOrderViewById(req.params.orderId, 'calendar')); }
        catch (error) { return respondError(error, req, res); }
    }

    getPaymentWorkspace = async (req = request, res = response) => {
        try {
            const workspace = await this.service.getPagedPaymentWorkspace(req.query);
            res.status(200).json(workspace);
        } catch (error) {
            return respondError(error, req, res);
        }
    }

    getOrder = async ( req = request, res = response) => {
        try {
            const { orderId } = req.params;
            const order = await this.service.getOrderViewById(orderId, 'kanban');

            if (!order) return res.status(404).json({ code: 'ORDER_NOT_FOUND', message: 'Pedido no encontrado' });

            res.status(200).json(order);
        } catch ( error ) {
            return respondError(error, req, res);
        }
    }

    getSalesNote = async (req = request, res = response) => {
        try {
            const { numeroNota } = req.params;
            const salesNote = await this.service.getSalesNoteByNumber(numeroNota);

            res.status(200).json(salesNote);
        } catch (error) {
            return respondError(error, req, res);
        }
    }

    createOrder = async (req = request, res = response) => {
        try {
            const order = await this.service.createOrder(req.body ?? {}, {
                auth0UserId: req.auth?.payload?.sub,
                actorId: req.currentUser?.idUsuario,
                requestId: req.requestId,
            });

            res.status(201).json(order);
        } catch (error) {
            return respondError(error, req, res);
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
            return respondError(error, req, res);
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
            return respondError(error, req, res);
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
            return respondError(error, req, res);
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
            return respondError(error, req, res);
        }
    }

    reevaluate = async (req = request, res = response) => {
        try {
            const result = await this.service.reevaluateOrder(req.params.orderId, {
                auth0UserId: req.auth?.payload?.sub,
            });
            return res.status(200).json(result);
        } catch (error) {
            return respondError(error, req, res);
        }
    }

    setLabel = async (req = request, res = response) => {
        try {
            return res.status(200).json(await this.service.setOrderLabel(req.params.orderId, req.body, {
                auth0UserId: req.auth?.payload?.sub,
            }));
        } catch (error) {
            return respondError(error, req, res);
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
            return respondError(error, req, res);
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
            return respondError(error, req, res);
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
            return respondError(error, req, res);
        }
    }



}


export default OrderController;
