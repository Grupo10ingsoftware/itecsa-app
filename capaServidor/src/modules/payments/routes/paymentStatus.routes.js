import requireCapability, { PERMISSIONS as P } from "../../../middlewares/requireCapability.js";
import { Router } from "express";

import checkJwt from "../../../middlewares/checkJwt.js";
import PaymentStatusController from "../controller/paymentStatus.controller.js";


export function createPaymentStatusRouter({
    authenticate = checkJwt,
    controller = new PaymentStatusController(),
} = {}) {
    const router = Router();

    router.get("/", authenticate, requireCapability(P.READ_PAYMENTS), controller.getPaymentStatuses);
    router.get("/:id", authenticate, requireCapability(P.READ_PAYMENTS), controller.getPaymentStatus);
    router.post("/", authenticate, (_req,res) => res.status(403).json({message:"Operacion interna; utiliza el flujo de negocio autorizado."}));

    return router;
}

export default createPaymentStatusRouter();
