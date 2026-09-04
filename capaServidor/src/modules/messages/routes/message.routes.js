import { Router } from "express";
import checkJwt from "../../../middlewares/checkJwt.js";
import MessageController from "../controller/message.controller.js";

export function createMessageRouter({
    authenticate = checkJwt,
    controller = new MessageController(),
} = {}) {
    const router = Router();

    router.get("/", authenticate, controller.getInbox);
    router.get("/notifications", authenticate, controller.getNotifications);
    router.patch("/notifications", authenticate, controller.clearNotifications);
    router.patch("/notifications/:messageId", authenticate, controller.hideNotification);
    router.patch("/:messageId/read", authenticate, controller.markAsRead);
    router.get("/:messageId", authenticate, controller.getMessage);

    return router;
}

export default createMessageRouter();
