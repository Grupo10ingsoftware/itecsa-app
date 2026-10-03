import { respondError } from "../../../errors/httpErrors.js";
import MetricsService from "../service/metrics.service.js";

export default class MetricsController {
    constructor({ service } = {}) {
        this.service = service ?? new MetricsService();
    }

    summary = async (req, res) => {
        try {
            return res.status(200).json(await this.service.summary(req.query));
        } catch (error) {
            return respondError(error, req, res);
        }
    };

    productionPerformance = async (req, res) => {
        try {
            res.set("Cache-Control", "no-store");
            return res.status(200).json(await this.service.productionPerformance(req.query));
        } catch (error) {
            return respondError(error, req, res);
        }
    };
}
