import { PinDeliveryConfigurationError } from '../../../config/pinDelivery.js';

export class FakePinDeliveryProvider {
    constructor({ env = process.env } = {}) {
        if (env.NODE_ENV !== 'test') throw new PinDeliveryConfigurationError();
        this.messages = [];
    }

    async sendCode({ to, code, expiresAt }) {
        this.messages.push({ to, code, expiresAt: new Date(expiresAt) });
    }
}
