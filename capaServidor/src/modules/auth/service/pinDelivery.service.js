import { parseAppEnvironment } from "../../../config/environment.js";

export class PinDeliveryUnavailableError extends Error {
    constructor() {
        super("La entrega automatica de PIN no esta configurada.");
        this.name = "PinDeliveryUnavailableError";
        this.code = "PIN_RECOVERY_DELIVERY_UNAVAILABLE";
    }
}

export const unavailablePinRecoveryDelivery = {
    async sendCode() {
        throw new PinDeliveryUnavailableError();
    },
};

/**
 * Recovery stays fail-closed until an approved provider is wired explicitly.
 * Tests must inject a fake delivery into PinService; no environment may use a
 * console adapter because recovery codes and email addresses are secrets/PII.
 */
export function createDefaultPinRecoveryDelivery(
    appEnvironment = process.env.APP_ENV,
) {
    parseAppEnvironment(appEnvironment, { required: true });
    return unavailablePinRecoveryDelivery;
}

// Resolve APP_ENV only when delivery is attempted. This keeps application
// bootstrap responsible for reporting configuration errors consistently.
export const defaultPinRecoveryDelivery = {
    async sendCode(payload) {
        return createDefaultPinRecoveryDelivery().sendCode(payload);
    },
};
