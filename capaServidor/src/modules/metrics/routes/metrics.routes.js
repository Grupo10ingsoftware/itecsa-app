import { Router } from "express";
import checkJwt from "../../../middlewares/checkJwt.js";
import requireCapability, { PERMISSIONS as P } from "../../../middlewares/requireCapability.js";
import MetricsController from "../controller/metrics.controller.js";

export function createMetricsRouter({
    authenticate = checkJwt,
    authorize = requireCapability(P.VIEW_METRICS),
    controller = new MetricsController(),
} = {}) {
    const router = Router();
    router.get("/summary", authenticate, authorize, controller.summary);
    router.get("/production-performance", authenticate, authorize, controller.productionPerformance);
    return router;
}

export default createMetricsRouter();
