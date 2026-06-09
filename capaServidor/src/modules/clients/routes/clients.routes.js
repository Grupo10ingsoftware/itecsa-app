import { Router } from "express";

import checkJwt from "../../../middlewares/checkJwt.js";
import ClientController from "../controller/clients.controller.js";


export function createPaymentStatusRouter({
    authenticate = checkJwt,
    controller = new ClientController(),
} = {}) {
    const router = Router();

    router.post("/", authenticate, controller.postClient);
    router.get("/rut/:rutCliente", authenticate, controller.getClientByRut);
    router.get("/:clientId", authenticate, controller.getClient);
    
    return router;
}

export default createPaymentStatusRouter();