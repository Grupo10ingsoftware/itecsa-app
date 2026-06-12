import { Router } from "express";

import checkJwt from "../../../middlewares/checkJwt.js";
import OrderStatusController from "../controller/orderStatus.controller.js";


export function createOrderStatusRouter({
    authenticate = checkJwt,
    controller = new OrderStatusController(),
} = {}) {
    const router = Router();

    router.get("/", authenticate, controller.getOrderStatuses);
    router.post("/", authenticate, controller.postOrderStatus);

    return router;
}

export default createOrderStatusRouter();