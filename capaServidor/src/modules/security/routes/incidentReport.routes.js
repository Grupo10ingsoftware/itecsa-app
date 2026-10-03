import { Router } from 'express';
import checkJwt from '../../../middlewares/checkJwt.js';
import { createThrottleMiddleware } from '../../../middlewares/rateLimit.js';
import IncidentReportController from '../controller/incidentReport.controller.js';

export function createIncidentReportRouter({ authenticate = checkJwt, controller = new IncidentReportController(), throttle } = {}) {
    const router = Router();
    router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
    router.use(authenticate);
    router.get('/config', controller.configuration);
    router.post('/', createThrottleMiddleware({ ...(throttle ? { throttle } : {}), rules: req => [{ scope: 'incident-report', subject: req.auth?.payload?.sub, limit: 5, windowMs: 15 * 60_000 }] }), controller.submit);
    return router;
}
