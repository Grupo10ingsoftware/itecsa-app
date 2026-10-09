import requireCapability, { PERMISSIONS as P } from "../../../middlewares/requireCapability.js";
import { Router } from "express";

import checkJwt from "../../../middlewares/checkJwt.js";
import PaymentRecordController from "../controller/paymentRecord.controller.js";

export function createPaymentRecordRouter({
  authenticate = checkJwt,
  controller = new PaymentRecordController(),
} = {}) {
  const router = Router({ mergeParams: true });

  router.get("/preview", authenticate, requireCapability(P.READ_PAYMENTS), controller.getConfirmationDetails);
  router.get("/", authenticate, requireCapability(P.READ_PAYMENTS), controller.getPaymentRecordsByOrderId);
  router.get("/:paymentRecordId", authenticate, requireCapability(P.READ_PAYMENTS), controller.getPaymentRecord);
  router.post("/", authenticate, (_req,res) => res.status(403).json({message:"Operacion interna; utiliza el flujo de negocio autorizado."}));

  return router;
}

export default createPaymentRecordRouter();
