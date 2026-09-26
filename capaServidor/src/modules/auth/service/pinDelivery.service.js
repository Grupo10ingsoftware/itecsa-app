import { readPinDeliveryConfiguration, PinDeliveryConfigurationError } from '../../../config/pinDelivery.js';

export class PinDeliveryUnavailableError extends Error {
    constructor() {
        super('La entrega del codigo de recuperacion de PIN no esta configurada.');
        this.name = 'PinDeliveryUnavailableError';
        this.code = 'PIN_RECOVERY_DELIVERY_UNAVAILABLE';
    }
}

export class PinDeliveryFailedError extends Error {
    constructor() {
        super('No fue posible enviar el codigo de recuperacion.');
        this.name = 'PinDeliveryFailedError';
        this.code = 'PIN_RECOVERY_DELIVERY_FAILED';
    }
}

export const unavailablePinRecoveryDelivery = {
    async sendCode() { throw new PinDeliveryUnavailableError(); },
};

/**
 * Delivery contract: sendCode({ to, code, expiresAt }): Promise<void>.
 * An email adapter must use only these values in the RF07 email, respect expiresAt,
 * and never log message bodies, recipients or provider responses.
 * PROVEEDOR DE CORREO PENDIENTE: no concrete email adapter is configured here.
 */
export function createPinRecoveryDelivery({ env = process.env, testDelivery, emailDelivery } = {}) {
    const { provider } = readPinDeliveryConfiguration(env);
    if (provider === 'disabled') return unavailablePinRecoveryDelivery;
    const adapter = provider === 'test' ? testDelivery : emailDelivery;
    if (!adapter) {
        if (provider === 'test') throw new PinDeliveryConfigurationError();
        return unavailablePinRecoveryDelivery;
    }
    if (typeof adapter.sendCode !== 'function') throw new PinDeliveryConfigurationError();
    return {
        async sendCode({ to, code, expiresAt }) {
            try {
                // Do not return adapter payloads or propagate its exception/cause.
                await adapter.sendCode({ to, code, expiresAt });
            } catch {
                throw new PinDeliveryFailedError();
            }
        },
    };
}
