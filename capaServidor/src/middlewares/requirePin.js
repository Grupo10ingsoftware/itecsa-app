import pinService, { PinServiceError } from "../modules/auth/service/pin.service.js";

export function createRequirePin({ pins = pinService } = {}) {
    return async function requirePin(req, res, next) {
        try {
            req.pinActor = await pins.validate(req.auth?.payload?.sub, req.body?.pin);

            if (req.body && Object.prototype.hasOwnProperty.call(req.body, "pin")) {
                delete req.body.pin;
            }

            return next();
        } catch (error) {
            if (error instanceof PinServiceError) {
                return res.status(error.status).json({
                    code: error.code,
                    message: error.message,
                    ...(error.details ?? {}),
                });
            }

            return res.status(500).json({
                code: "PIN_VALIDATION_FAILED",
                message: "No fue posible validar el PIN.",
            });
        }
    };
}

export default createRequirePin();
