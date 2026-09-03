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

export const developmentPinRecoveryDelivery = {
    async sendCode({ to, code, expiresAt }) {
        if (process.env.NODE_ENV === "production") {
            throw new PinDeliveryUnavailableError();
        }

        console.info("[PIN_RECOVERY_DEV]", {
            to,
            code,
            expiresAt,
        });
    },
};
