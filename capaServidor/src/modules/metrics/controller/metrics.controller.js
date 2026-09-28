import MetricsService from "../service/metrics.service.js";
import { sendControllerError } from "../../../shared/httpResponse.js";

export default class MetricsController {
    constructor({ service } = {}) {
        this.service = service ?? new MetricsService();
    }

    summary = async (req, res) => {
        try {
            return res.status(200).json(await this.service.summary(req.query));
        } catch (error) {
            return sendControllerError(req, res, error, "No fue posible consultar las metricas.");
        }
    };
}
