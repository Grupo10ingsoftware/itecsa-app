import { PinDeliveryConfigurationError } from '../../../config/pinDelivery.js';

// Temporary, explicitly selected development delivery; never a fallback.
export class DevelopmentConsolePinDeliveryProvider {
    constructor({ env = process.env, logger = console } = {}) {
        if (env.NODE_ENV !== 'development') throw new PinDeliveryConfigurationError();
        this.env = env;
        this.logger = logger;
    }

    async sendCode({ code, expiresAt }) {
        if (this.env.NODE_ENV !== 'development') throw new PinDeliveryConfigurationError();
        if (!/^\d{6}$/.test(code)) throw new Error('Codigo de desarrollo invalido.');
        this.logger.log('[SOLO DESARROLLO] Recuperacion de PIN', {
            code,
            expiresAt: new Date(expiresAt).toISOString(),
        });
    }
}
