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
      const statusCode = error.statusCode ?? 500;

      res.status(statusCode).json({
        message: error.message || "Error al crear detalle de pedido",
      });
    }
  };

  getOrderDetail = async (req = request, res = response) => {
    try {
      const { orderId, detailId } = req.params;

      const detail = await this.service.getOrderDetail(orderId, detailId);

      res.status(200).json(detail);
    } catch (error) {
      const statusCode = error.statusCode ?? 500;

      res.status(statusCode).json({
        message: error.message || "Error al obtener detalle de pedido",
      });
    }
  };

  getDetailsByOrderId = async (req = request, res = response) => {
    try {
      const { orderId } = req.params;

      const details = await this.service.getDetailsByOrderId(orderId);

      res.status(200).json(details);
    } catch (error) {
      const statusCode = error.statusCode ?? 500;

      res.status(statusCode).json({
        message: error.message || "Error al obtener detalles del pedido",
      });
    }
  };
}

export default OrderDetailController;