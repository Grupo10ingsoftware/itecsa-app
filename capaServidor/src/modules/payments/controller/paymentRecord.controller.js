import { request, response } from "express";
import PaymentRecordService from "../service/paymentRecord.service.js";

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
      res.status(error.statusCode ?? 500).json({
        message: error.message || "Error al obtener registro de pago",
      });
    }
  };

  getPaymentRecordsByOrderId = async (req = request, res = response) => {
    try {
      const { orderId } = req.params;
      const records = await this.service.getPaymentRecordsByOrderId(orderId);

      res.status(200).json(records);
    } catch (error) {
      res.status(error.statusCode ?? 500).json({
        message: error.message || "Error al obtener registros de pago",
      });
    }
  };

  getConfirmationDetails = async (req = request, res = response) => {
    try {
      const { orderId } = req.params;
      const details = await this.service.getConfirmationDetails(orderId);

      res.status(200).json(details);
    } catch (error) {
      res.status(error.statusCode ?? 500).json({
        message: error.message || "Error al obtener el detalle de confirmacion",
      });
    }
  };
}

export default PaymentRecordController;
