import { respondError } from "../../../errors/httpErrors.js";
import OrderHistoryService from "../service/orderHistory.service.js";

export default class OrderHistoryController {
    constructor({ service } = {}) {
        this.service = service ?? new OrderHistoryService();
    }

    listOrders = async (req, res) => {
        try {
            return res.status(200).json(await this.service.listOrders(req.query));
        } catch (error) {
            return respondError(error, req, res);
        }
    };

    getOrderHistory = async (req, res) => {
        try {
            return res.status(200).json(
                await this.service.getOrderHistory(req.params.orderId, req.query),
            );
        } catch (error) {
            return respondError(error, req, res);
        }
    };
}
