import requireCapability, { PERMISSIONS as P } from "../../../middlewares/requireCapability.js";
import { Router } from "express";
import checkJwt from "../../../middlewares/checkJwt.js";
import OrderHistoryController from "../controller/orderHistory.controller.js";

export function createOrderHistoryRouter({
    authenticate = checkJwt,
    controller = new OrderHistoryController(),
} = {}) {
    const router = Router();
    router.get("/orders", authenticate, requireCapability(P.READ_ORDERS), controller.listOrders);
    router.get("/orders/:orderId/events", authenticate, requireCapability(P.READ_ORDERS), controller.listOrderEvents);
    router.get("/orders/:orderId", authenticate, requireCapability(P.READ_ORDERS), controller.getOrderHistory);
    return router;
}

export default createOrderHistoryRouter();
