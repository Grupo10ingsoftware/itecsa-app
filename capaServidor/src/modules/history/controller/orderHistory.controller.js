import { respondError } from "../../../errors/httpErrors.js";
import OrderHistoryService from "../service/orderHistory.service.js";
import { can, PERMISSIONS, roleFromPayload } from "../../../../../shared/authorization.js";

function mayReadPayments(req) {
    const payload = req.auth?.payload;
    return can(roleFromPayload(payload), payload?.permissions, PERMISSIONS.READ_PAYMENTS);
}

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
                await this.service.getOrderHistory(req.params.orderId, req.query, {
                    includePaymentDetails: mayReadPayments(req),
                }),
            );
        } catch (error) {
            return respondError(error, req, res);
        }
    };

    listOrderEvents = async (req, res) => {
        try {
            return res.status(200).json(
                await this.service.listOrderEvents(req.params.orderId, req.query, {
                    includePaymentDetails: mayReadPayments(req),
                }),
            );
        } catch (error) {
            return respondError(error, req, res);
        }
    };
}
