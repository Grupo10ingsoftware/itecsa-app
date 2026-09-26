import { respondError } from "../../../errors/httpErrors.js";
import { request, response } from "express";
import OrderDetailService from "../service/orderDetail.service.js";

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
        return respondError(error, req, res);
    }
  };

  getOrderDetail = async (req = request, res = response) => {
    try {
      const { orderId, detailId } = req.params;

      const detail = await this.service.getOrderDetail(orderId, detailId);

      res.status(200).json(detail);
    } catch (error) {
        return respondError(error, req, res);
    }
  };

  getDetailsByOrderId = async (req = request, res = response) => {
    try {
      const { orderId } = req.params;

      const details = await this.service.getDetailsByOrderId(orderId);

      res.status(200).json(details);
    } catch (error) {
        return respondError(error, req, res);
    }
  };
}

export default OrderDetailController;