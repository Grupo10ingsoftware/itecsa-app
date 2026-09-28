import { request, response } from "express";
import OrderDetailService from "../service/orderDetail.service.js";
import { sendOrderOperationError } from "../service/salesOrder.errors.js";

class OrderDetailController {
  constructor() {
    this.service = new OrderDetailService();
  }

  postOrderDetail = async (req = request, res = response) => {
    try {
      const { orderId } = req.params;

      const detail = await this.service.createOrderDetail(orderId, req.body ?? {});

      res.status(201).json(detail);
    } catch (error) {
      return sendOrderOperationError(res, error, undefined, { requestId: req.requestId, actorId: req.currentUser?.idUsuario });
    }
  };

  getOrderDetail = async (req = request, res = response) => {
    try {
      const { orderId, detailId } = req.params;

      const detail = await this.service.getOrderDetail(orderId, detailId);

      res.status(200).json(detail);
    } catch (error) {
      return sendOrderOperationError(res, error, undefined, { requestId: req.requestId, actorId: req.currentUser?.idUsuario });
    }
  };

  getDetailsByOrderId = async (req = request, res = response) => {
    try {
      const { orderId } = req.params;

      const details = await this.service.getDetailsByOrderId(orderId);

      res.status(200).json(details);
    } catch (error) {
      return sendOrderOperationError(res, error, undefined, { requestId: req.requestId, actorId: req.currentUser?.idUsuario });
    }
  };
}

export default OrderDetailController;
