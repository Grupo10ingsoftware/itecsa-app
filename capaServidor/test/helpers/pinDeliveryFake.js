import { FakePinDeliveryProvider } from '../../src/modules/auth/service/fakePinDelivery.js';

export function createPinDeliveryFake() {
    const provider = new FakePinDeliveryProvider({ env: { NODE_ENV: 'test' } });
    return { provider, takeDelivery: () => provider.messages.shift() };
}
