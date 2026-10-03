import { Router } from 'express';
import checkJwt from '../../../middlewares/checkJwt.js';
import { createThrottleMiddleware } from '../../../middlewares/rateLimit.js';
import PrivacyController from '../controller/privacy.controller.js';

export function createPrivacyRouter({ authenticate = checkJwt, controller = new PrivacyController(), throttle } = {}) {
    const router = Router();
    router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
    router.get('/documents', controller.documents);
    const requestLimit = createThrottleMiddleware({ ...(throttle ? { throttle } : {}), rules: req => [{
        scope: 'privacy-request', subject: req.auth?.payload?.sub, limit: 5, windowMs: 15 * 60_000,
    }] });
    router.post('/requests', authenticate, requestLimit, controller.submit);
    return router;
}
