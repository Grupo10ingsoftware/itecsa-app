import { respondError } from "../../../errors/httpErrors.js";
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
            return respondError(error, req, res);
        }
    };

    getNotifications = async (req = request, res = response) => {
        try {
            const result = await this.service.getNotifications(req.auth?.payload?.sub, req.query);

            return res.status(200).json(result);
        } catch (error) {
            return respondError(error, req, res);
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
            return respondError(error, req, res);
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
            return respondError(error, req, res);
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
            return respondError(error, req, res);
        }
    };

    clearNotifications = async (req = request, res = response) => {
        try {
            const result = await this.service.clearNotifications(req.auth?.payload?.sub);

            return res.status(200).json(result);
        } catch (error) {
            return respondError(error, req, res);
        }
    };
}

export default MessageController;
