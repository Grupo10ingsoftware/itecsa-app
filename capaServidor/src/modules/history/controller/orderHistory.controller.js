import OrderHistoryService from "../service/orderHistory.service.js";

export default class OrderHistoryController {
    constructor({ service } = {}) {
        this.service = service ?? new OrderHistoryService();
    }

    listOrders = async (req, res) => {
        try {
            return res.status(200).json(await this.service.listOrders(req.query));
        } catch (error) {
            return res.status(error.statusCode ?? 500).json({
                message: error.message || "Error al obtener el historial de pedidos.",
            });
        }
    };

    getOrderHistory = async (req, res) => {
        try {
            return res.status(200).json(
                await this.service.getOrderHistory(req.params.orderId, req.query),
            );
        } catch (error) {
            return res.status(error.statusCode ?? 500).json({
                message: error.message || "Error al obtener el historial del pedido.",
            });
        }
    };
}
