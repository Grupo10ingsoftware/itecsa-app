import { Router } from "express";

import checkJwt from "../../../middlewares/checkJwt.js";
import PaymentRecordController from "../controller/paymentRecord.controller.js";

export function createPaymentRecordRouter({
  authenticate = checkJwt,
  controller = new PaymentRecordController(),
} = {}) {
  const router = Router({ mergeParams: true });

  router.get("/", authenticate, controller.getPaymentRecordsByOrderId);
  router.get("/:paymentRecordId", authenticate, controller.getPaymentRecord);
  router.post("/", authenticate, controller.postPaymentRecord);

  return router;
}

export default createPaymentRecordRouter();