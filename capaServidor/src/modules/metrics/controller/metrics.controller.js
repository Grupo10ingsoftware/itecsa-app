import MetricsService from "../service/metrics.service.js";

export default class MetricsController {
    constructor({ service } = {}) {
        this.service = service ?? new MetricsService();
    }

    summary = async (req, res) => {
        try {
            return res.status(200).json(await this.service.summary(req.query));
        } catch (error) {
            return res.status(error.statusCode ?? 500).json({
                message: error.message || "Error al consultar las metricas.",
            });
        }
    };
}