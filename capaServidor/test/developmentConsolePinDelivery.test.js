import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPinRecoveryDelivery } from '../src/modules/auth/service/pinDelivery.service.js';
import { DevelopmentConsolePinDeliveryProvider } from '../src/modules/auth/service/developmentConsolePinDelivery.js';
import { pinRecoveryFixture } from './helpers/pinRecoveryFixture.js';

test('console explicita de desarrollo entrega OTP valido sin correo ni secretos adicionales', async () => {
    const logs = [];
    const delivery = createPinRecoveryDelivery({
        env: { NODE_ENV: 'development', PIN_DELIVERY_PROVIDER: 'console' },
        consoleLogger: { log: (...args) => logs.push(args) },
    });
    const fixture = pinRecoveryFixture({ delivery });
    assert.equal(await fixture.service.requestRecovery('auth0|test'), undefined);
    assert.equal(logs.length, 1);
    assert.match(logs[0][0], /SOLO DESARROLLO/);
    const message = logs[0][1];
    assert.deepEqual(Object.keys(message).sort(), ['code', 'expiresAt']);
    assert.match(message.code, /^\d{6}$/);
    assert.equal(message.expiresAt, fixture.challenges[0].expires_at.toISOString());
    assert.equal(JSON.stringify(logs).includes(fixture.user.correo_usuario), false);
    await fixture.service.confirmRecovery('auth0|test', message.code);
    await assert.rejects(fixture.service.confirmRecovery('auth0|test', message.code), { code: 'PIN_RECOVERY_CODE_EXPIRED' });
});

for (const NODE_ENV of ['production', 'test', undefined]) {
    test(`console rechazada fuera de development: ${NODE_ENV}`, () => {
        const env = { NODE_ENV, PIN_DELIVERY_PROVIDER: 'console' };
        assert.throws(() => createPinRecoveryDelivery({ env }), { code: 'PIN_DELIVERY_CONFIGURATION_INVALID' });
        assert.throws(() => new DevelopmentConsolePinDeliveryProvider({ env }), { code: 'PIN_DELIVERY_CONFIGURATION_INVALID' });
    });
}

test('development sin seleccion no activa consola como fallback', async () => {
    const logs = [];
    const provider = createPinRecoveryDelivery({ env: { NODE_ENV: 'development' }, consoleLogger: { log: (...args) => logs.push(args) } });
    await assert.rejects(provider.sendCode({ code: '123456', expiresAt: new Date() }), { code: 'PIN_RECOVERY_DELIVERY_UNAVAILABLE' });
    assert.deepEqual(logs, []);
});
