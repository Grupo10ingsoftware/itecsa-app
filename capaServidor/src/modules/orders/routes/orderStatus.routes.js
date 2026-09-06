import requireCapability, { PERMISSIONS as P } from "../../../middlewares/requireCapability.js";
import { Router } from "express";

import checkJwt from "../../../middlewares/checkJwt.js";
import OrderStatusController from "../controller/orderStatus.controller.js";


export function createOrderStatusRouter({
    authenticate = checkJwt,
    controller = new OrderStatusController(),
} = {}) {
    const router = Router();

    router.get("/", authenticate, requireCapability(P.READ_ORDERS), controller.getOrderStatuses);
    router.post("/", authenticate, (_req,res) => res.status(403).json({message:"Operacion interna; utiliza el flujo de negocio autorizado."}));

    return router;
}

export default createOrderStatusRouter();