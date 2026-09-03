import { request, response } from "express";
import MessageService from "../service/message.service.js";

class MessageController {
    constructor({ service } = {}) {
        this.service = service ?? new MessageService();
    }

    getInbox = async (req = request, res = response) => {
        try {
            const result = await this.service.getInbox(req.auth?.payload?.sub, req.query);

            return res.status(200).json(result);
        } catch (error) {
            return res.status(error.statusCode ?? 500).json({
                message: error.message || "Error al obtener los mensajes.",
            });
        }
    };

    getNotifications = async (req = request, res = response) => {
        try {
            const result = await this.service.getNotifications(req.auth?.payload?.sub, req.query);

            return res.status(200).json(result);
        } catch (error) {
            return res.status(error.statusCode ?? 500).json({
                message: error.message || "Error al obtener las notificaciones.",
            });
        }
    };

    getMessage = async (req = request, res = response) => {
        try {
            const result = await this.service.getMessage(
                req.auth?.payload?.sub,
                req.params.messageId,
            );

            return res.status(200).json(result);
        } catch (error) {
            return res.status(error.statusCode ?? 500).json({
                message: error.message || "Error al obtener el mensaje.",
            });
        }
    };

    markAsRead = async (req = request, res = response) => {
        try {
            const result = await this.service.markAsRead(
                req.auth?.payload?.sub,
                req.params.messageId,
            );

            return res.status(200).json(result);
        } catch (error) {
            return res.status(error.statusCode ?? 500).json({
                message: error.message || "Error al marcar el mensaje como leido.",
            });
        }
    };

    hideNotification = async (req = request, res = response) => {
        try {
            const result = await this.service.hideNotification(
                req.auth?.payload?.sub,
                req.params.messageId,
            );

            return res.status(200).json(result);
        } catch (error) {
            return res.status(error.statusCode ?? 500).json({
                message: error.message || "Error al ocultar la notificacion.",
            });
        }
    };

    clearNotifications = async (req = request, res = response) => {
        try {
            const result = await this.service.clearNotifications(req.auth?.payload?.sub);

            return res.status(200).json(result);
        } catch (error) {
            return res.status(error.statusCode ?? 500).json({
                message: error.message || "Error al limpiar las notificaciones.",
            });
        }
    };
}

export default MessageController;
