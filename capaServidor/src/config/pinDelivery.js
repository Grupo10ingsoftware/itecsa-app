const ENVIRONMENTS = new Set(['test', 'development', 'production']);
const PROVIDERS = new Set(['disabled', 'fake', 'resend', 'console']);

export class PinDeliveryConfigurationError extends Error {
    constructor() {
        super('Configuracion de entrega de PIN invalida. Revisa NODE_ENV y PIN_DELIVERY_PROVIDER.');
        this.name = 'PinDeliveryConfigurationError';
        this.code = 'PIN_DELIVERY_CONFIGURATION_INVALID';
    }
}

// Missing configuration disables recovery only; it never enables a test provider.
export function readPinDeliveryConfiguration(env = process.env) {
    const environment = env.NODE_ENV?.trim() || null;
    const provider = env.PIN_DELIVERY_PROVIDER?.trim() || 'disabled';
    if ((environment !== null && !ENVIRONMENTS.has(environment)) || !PROVIDERS.has(provider) ||
        (provider !== 'disabled' && environment === null) ||
        (provider === 'fake' && environment !== 'test') ||
        (provider === 'console' && environment !== 'development')) {
        throw new PinDeliveryConfigurationError();
    }
    if (provider === 'resend' && (!env.RESEND_API_KEY?.trim() || !env.PIN_EMAIL_FROM?.trim() ||
        /[\r\n]/.test(env.RESEND_API_KEY) || /[\r\n]/.test(env.PIN_EMAIL_FROM))) {
        throw new PinDeliveryConfigurationError();
    }
    return Object.freeze({ environment, provider });
}
