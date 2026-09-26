const ENVIRONMENTS = new Set(['test', 'development', 'production']);
const PROVIDERS = new Set(['disabled', 'test', 'email']);

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
        (provider === 'test' && environment !== 'test')) {
        throw new PinDeliveryConfigurationError();
    }
    return Object.freeze({ environment, provider });
}
