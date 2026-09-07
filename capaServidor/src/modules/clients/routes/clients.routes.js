import requireCapability, { PERMISSIONS as P } from "../../../middlewares/requireCapability.js";
import { Router } from "express";

import checkJwt from "../../../middlewares/checkJwt.js";
import ClientController from "../controller/clients.controller.js";


export function createPaymentStatusRouter({
    authenticate = checkJwt,
    controller = new ClientController(),
} = {}) {
    const router = Router();

    router.post("/", authenticate, (_req,res) => res.status(403).json({message:"Operacion interna; utiliza el flujo de negocio autorizado."}));
    router.get("/rut/:rutCliente", authenticate, requireCapability(P.READ_SALES_NOTES), controller.getClientByRut);
    router.get("/:clientId", authenticate, requireCapability(P.READ_SALES_NOTES), controller.getClient);

    return router;
}

export default createPaymentStatusRouter();