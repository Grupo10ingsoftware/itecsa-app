import { request, response } from "express";
import PaymentRecordService from "../service/paymentRecord.service.js";
import { sendPaymentError } from "./paymentError.js";

class PaymentRecordController {
  constructor({ service } = {}) {
    this.service = service ?? new PaymentRecordService();
  }

  getPaymentRecord = async (req = request, res = response) => {
    try {
      const { orderId, paymentRecordId } = req.params;
      const record = await this.service.getPaymentRecord(orderId, paymentRecordId);

      res.status(200).json(record);
    } catch (error) {
      return sendPaymentError(res, error, undefined, { requestId: req.requestId, actorId: req.currentUser?.idUsuario });
    }
  };

  getPaymentRecordsByOrderId = async (req = request, res = response) => {
    try {
      const { orderId } = req.params;
      const records = await this.service.getPaymentRecordsByOrderId(orderId);

      res.status(200).json(records);
    } catch (error) {
      return sendPaymentError(res, error, undefined, { requestId: req.requestId, actorId: req.currentUser?.idUsuario });
    }
  };

  getConfirmationDetails = async (req = request, res = response) => {
    try {
      const { orderId } = req.params;
      const details = await this.service.getConfirmationDetails(orderId);

      res.status(200).json(details);
    } catch (error) {
      return sendPaymentError(res, error, undefined, { requestId: req.requestId, actorId: req.currentUser?.idUsuario });
    }
  };
}

export default PaymentRecordController;
