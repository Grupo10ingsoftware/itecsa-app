import { DevelopmentConsolePinDeliveryProvider } from './developmentConsolePinDelivery.js';
import { FakePinDeliveryProvider } from './fakePinDelivery.js';
import { ResendPinDeliveryProvider } from './resendPinDelivery.js';
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

/** Delivery contract: sendCode({ to, code, expiresAt }): Promise<void>. */
export function createPinRecoveryDelivery({ env = process.env, testDelivery, fetchImpl, consoleLogger = console } = {}) {
    const { provider } = readPinDeliveryConfiguration(env);
    if (provider === 'disabled') return unavailablePinRecoveryDelivery;
    const adapter = provider === 'fake'
        ? (testDelivery ?? new FakePinDeliveryProvider({ env }))
        : provider === 'console'
          ? new DevelopmentConsolePinDeliveryProvider({ env, logger: consoleLogger })
          : new ResendPinDeliveryProvider({ apiKey: env.RESEND_API_KEY.trim(), from: env.PIN_EMAIL_FROM.trim(), fetchImpl });
    if (typeof adapter.sendCode !== 'function') throw new PinDeliveryConfigurationError();
    return {
        async sendCode({ to, code, expiresAt }) {
            try {
                await adapter.sendCode({ to, code, expiresAt });
            } catch {
                throw new PinDeliveryFailedError();
            }
        },
    };
}
