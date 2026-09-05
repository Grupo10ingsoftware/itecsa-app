import { Router } from "express";
import checkJwt from "../../../middlewares/checkJwt.js";
import OrderHistoryController from "../controller/orderHistory.controller.js";

export function createOrderHistoryRouter({
    authenticate = checkJwt,
    controller = new OrderHistoryController(),
} = {}) {
    const router = Router();
    router.get("/orders", authenticate, controller.listOrders);
    router.get("/orders/:orderId", authenticate, controller.getOrderHistory);
    return router;
}

export default createOrderHistoryRouter();
