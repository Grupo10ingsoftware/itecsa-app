import requireCapability, { PERMISSIONS as P } from "../../../middlewares/requireCapability.js";
import { Router } from "express";
import checkJwt from "../../../middlewares/checkJwt.js";
import MessageController from "../controller/message.controller.js";

export function createMessageRouter({
    authenticate = checkJwt,
    controller = new MessageController(),
} = {}) {
    const router = Router();

    router.get("/", authenticate, requireCapability(P.READ_MESSAGES), controller.getInbox);
    router.get("/notifications", authenticate, requireCapability(P.READ_MESSAGES), controller.getNotifications);
    router.patch("/notifications", authenticate, requireCapability(P.UPDATE_MESSAGES), controller.clearNotifications);
    router.patch("/notifications/:messageId", authenticate, requireCapability(P.UPDATE_MESSAGES), controller.hideNotification);
    router.patch("/:messageId/read", authenticate, requireCapability(P.UPDATE_MESSAGES), controller.markAsRead);
    router.get("/:messageId", authenticate, requireCapability(P.READ_MESSAGES), controller.getMessage);

    return router;
}

export default createMessageRouter();
