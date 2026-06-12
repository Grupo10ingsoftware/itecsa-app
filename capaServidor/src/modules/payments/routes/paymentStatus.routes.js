import { Router } from "express";

import checkJwt from "../../../middlewares/checkJwt.js";
import PaymentStatusController from "../controller/paymentStatus.controller.js";


export function createPaymentStatusRouter({
    authenticate = checkJwt,
    controller = new PaymentStatusController(),
} = {}) {
    const router = Router();

    router.get("/", authenticate, controller.getPaymentStatus);
    router.get("/:id", authenticate, controller.getPaymentStatus);
    router.post("/", authenticate, controller.postPaymentStatus);

    return router;
}

export default createPaymentStatusRouter();