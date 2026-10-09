import { respondError } from "../errors/httpErrors.js";
import pinService from "../modules/auth/service/pin.service.js";

export function createRequirePin({ pins = pinService } = {}) {
    return async function requirePin(req, res, next) {
        try {
            req.pinActor = await pins.validate(req.auth?.payload?.sub, req.body?.pin);

            if (req.body && Object.prototype.hasOwnProperty.call(req.body, "pin")) {
                delete req.body.pin;
            }

            return next();
        } catch (error) {
            return respondError(error, req, res);
        }
    };
}

export default createRequirePin();
