// Test-only closure. Never imported by application code, persisted or printed.
export function createPinDeliveryFake() {
    let lastDelivery;
    return {
        provider: {
            async sendCode({ to, code, expiresAt }) {
                lastDelivery = { to, code, expiresAt: new Date(expiresAt) };
            },
        },
        takeDelivery() {
            const delivery = lastDelivery;
            lastDelivery = undefined;
            return delivery;
        },
    };
}
