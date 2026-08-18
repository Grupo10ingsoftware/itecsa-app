import { response, request } from "express";
import path from "node:path";

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

    previewPaymentSignature = async (req = request, res = response) => {
        try {
            const { orderId } = req.params;

            const pdfBytes = await this.service.previewPaymentSignature(orderId, {
                auth0UserId: req.auth?.payload?.sub,
            });

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", "inline");

            return res.send(Buffer.from(pdfBytes));
        } catch (error) {
            const statusCode = error.statusCode ?? 500;

            return res.status(statusCode).json({
                message: error.message || "Error al generar vista previa firmada",
            });
        }
    }

    getPaymentSignatureEvidence = async (req = request, res = response) => {
        try {
            const { orderId } = req.params;
            const evidence = await this.service.getPaymentSignatureEvidence(orderId);
            const fileExtension = path.extname(evidence.filePath).toLowerCase();
            const contentTypes = {
                ".pdf": "application/pdf",
                ".xml": "application/xml",
                ".cms": "application/cms",
                ".p7s": "application/pkcs7-signature",
                ".p7m": "application/pkcs7-mime",
            };

            return res.sendFile(evidence.filePath, {
                headers: {
                    "Content-Disposition": `inline; filename="${path.basename(evidence.filePath)}"`,
                    "Content-Type": contentTypes[fileExtension] ?? "application/octet-stream",
                },
            });
        } catch (error) {
            const statusCode = error.statusCode ?? 500;

            return res.status(statusCode).json({
                message: error.message || "Error al obtener evidencia de firma",
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
            const { observacion } = req.body ?? {};

            const result = await this.service.updPaymentState(
                orderId,
                paymentStatusId,
                {
                    auth0UserId: req.auth?.payload?.sub,
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

    assignTag = async (req = request, res = response) => {
        try {
            const { orderId, tagId } = req.params;
            const result = await this.service.assignTag(orderId, tagId, {
                auth0UserId: req.auth?.payload?.sub,
            });

            res.status(200).json(result);
        } catch (error) {
            const statusCode = error.statusCode ?? 500;

            res.status(statusCode).json({
                message: error.message || "Error al asignar etiqueta al pedido",
            });
        }
    }

    removeTag = async (req = request, res = response) => {
        try {
            const { orderId, tagId } = req.params;
            const result = await this.service.removeTag(orderId, tagId);

            res.status(200).json(result);
        } catch (error) {
            const statusCode = error.statusCode ?? 500;

            res.status(statusCode).json({
                message: error.message || "Error al quitar etiqueta del pedido",
            });
        }
    }



}


export default OrderController;
