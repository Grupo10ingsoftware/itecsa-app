import { respondError } from '../../../errors/httpErrors.js';
import PrivacyRequestService, { PrivacyChannelError } from '../service/privacyRequest.service.js';

export default class PrivacyController {
    constructor({ service = new PrivacyRequestService() } = {}) { this.service = service; }
    documents = (_req, res, next) => {
        try { return res.json(this.service.documents()); } catch (error) { return next(error); }
    };
    submit = async (req, res) => {
        try { return res.status(200).json(await this.service.submit(req.body, req.currentUser, req.auth?.payload?.sub)); }
        catch (error) {
            if (error instanceof PrivacyChannelError) return res.status(503).json({ code: error.code, message: error.message, ...(error.reference ? { requestId: error.reference } : {}) });
            return respondError(error, req, res);
        }
    };
}
