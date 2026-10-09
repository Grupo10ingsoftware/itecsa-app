import { respondError } from '../../../errors/httpErrors.js';
import IncidentReportService, { IncidentChannelError } from '../service/incidentReport.service.js';

export default class IncidentReportController {
    constructor({ service = new IncidentReportService() } = {}) { this.service = service; }
    configuration = (req, res, next) => {
        try { return res.json(this.service.configuration(req.currentUser)); } catch (error) { return next(error); }
    };
    submit = async (req, res) => {
        try { return res.json(await this.service.submit(req.body, req.currentUser, req.auth?.payload?.sub)); }
        catch (error) {
            if (error instanceof IncidentChannelError) return res.status(503).json({ code: error.code, message: error.message, ...(error.reference ? { reportId: error.reference } : {}) });
            return respondError(error, req, res);
        }
    };
}
