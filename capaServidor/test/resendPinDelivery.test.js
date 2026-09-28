import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPinRecoveryDelivery } from '../src/modules/auth/service/pinDelivery.service.js';
import { FakePinDeliveryProvider } from '../src/modules/auth/service/fakePinDelivery.js';
import { pinRecoveryFixture } from './helpers/pinRecoveryFixture.js';
import { createRequestPinRecoveryHandler } from '../src/modules/auth/controller/auth.controller.js';

const env = { NODE_ENV: 'production', PIN_DELIVERY_PROVIDER: 'resend', RESEND_API_KEY: 'synthetic-api-key', PIN_EMAIL_FROM: 'Sistema <test@example.invalid>' };
const input = { to: 'recipient@example.invalid', code: '123456', expiresAt: new Date('2026-10-01T00:00:00Z') };

test('Resend sends exactly one minimal HTTPS request and does not return provider payload', async () => {
    let count = 0;
    const provider = createPinRecoveryDelivery({ env, fetchImpl: async (url, options) => {
        count++;
        assert.equal(url, 'https://api.resend.com/emails');
        assert.equal(options.method, 'POST');
        assert.equal(options.redirect, 'error');
        assert.ok(options.signal instanceof AbortSignal);
        assert.equal(options.headers.Authorization, 'Bearer synthetic-api-key');
        const body = JSON.parse(options.body);
        assert.deepEqual(Object.keys(body).sort(), ['from', 'subject', 'text', 'to']);
        assert.equal(body.from, env.PIN_EMAIL_FROM);
        assert.deepEqual(body.to, [input.to]);
        assert.match(body.text, /123456/);
        assert.match(body.text, /2026-10-01T00:00:00.000Z/);
        assert.match(body.text, /ignorar/);
        return { ok: true, json: async () => ({ id: 'synthetic-message-id' }) };
    } });
    assert.equal(await provider.sendCode({ ...input, pin: 'SECRET-PIN' }), undefined);
    assert.equal(count, 1);
});

for (const failure of ['http', 'network', 'timeout', 'badJson', 'missingId']) {
    test(`Resend ${failure} invalidates challenge and redacts response/logs`, async () => {
        const logs = []; let otp; let calls = 0;
        const delivery = createPinRecoveryDelivery({ env, fetchImpl: async (url, options) => {
            calls++;
            otp = JSON.parse(options.body).text.match(/verificación es: (\d{6})/)[1];
            const secretError = new Error(`${otp} ${env.RESEND_API_KEY} recipient@example.invalid`);
            if (failure === 'network' || failure === 'timeout') throw secretError;
            if (failure === 'http') return { ok: false, body: { cancel: async () => {} } };
            return { ok: true, json: async () => { if (failure === 'badJson') throw secretError; return {}; } };
        } });
        const f = pinRecoveryFixture({ delivery, logger: { error: (...args) => logs.push(args) } });
        const res = { status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; } };
        await createRequestPinRecoveryHandler({ pins: f.service })({ auth: { payload: { sub: 'auth0|test' } } }, res);
        assert.equal(calls, 1);
        assert.equal(res.statusCode, 503);
        assert.equal(f.challenges[0].delivery_status, 'failed');
        assert.ok(f.challenges[0].used_at);
        await assert.rejects(f.service.confirmRecovery('auth0|test', otp), { code: 'PIN_RECOVERY_CODE_EXPIRED' });
        const serialized = JSON.stringify([res.body, logs]);
        for (const secret of [otp, env.RESEND_API_KEY, f.user.correo_usuario]) assert.equal(serialized.includes(secret), false);
    });
}

test('fake constructor rejects real environments', () => {
    for (const NODE_ENV of ['production', 'development', undefined]) {
        assert.throws(() => new FakePinDeliveryProvider({ env: { NODE_ENV } }), { code: 'PIN_DELIVERY_CONFIGURATION_INVALID' });
    }
});
