import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readPinDeliveryConfiguration } from '../src/config/pinDelivery.js';
import { createPinRecoveryDelivery } from '../src/modules/auth/service/pinDelivery.service.js';
import { createRequestPinRecoveryHandler, createConfirmPinRecoveryHandler } from '../src/modules/auth/controller/auth.controller.js';
import { createPinDeliveryFake } from './helpers/pinDeliveryFake.js';
import { pinRecoveryFixture } from './helpers/pinRecoveryFixture.js';

const response = () => ({ status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; } });

for (const env of [
    { NODE_ENV: 'production', PIN_DELIVERY_PROVIDER: 'fake' },
    { NODE_ENV: 'development', PIN_DELIVERY_PROVIDER: 'fake' },
    { PIN_DELIVERY_PROVIDER: 'fake' },
    { NODE_ENV: 'production', PIN_DELIVERY_PROVIDER: 'resend' },
    { NODE_ENV: 'production', PIN_DELIVERY_PROVIDER: 'resend', RESEND_API_KEY: 'synthetic' },
    { NODE_ENV: 'production', PIN_DELIVERY_PROVIDER: 'resend', PIN_EMAIL_FROM: 'test@example.invalid' },
    { NODE_ENV: 'production', PIN_DELIVERY_PROVIDER: 'unknown' },
    { NODE_ENV: 'production', PIN_DELIVERY_PROVIDER: 'console' },
]) {
    test(`rejects invalid delivery configuration ${JSON.stringify(env)}`, () => {
        assert.throws(() => createPinRecoveryDelivery({ env }), { code: 'PIN_DELIVERY_CONFIGURATION_INVALID' });
    });
}

test('missing provider remains disabled without an insecure fallback', async () => {
    assert.deepEqual(readPinDeliveryConfiguration({}), { environment: null, provider: 'disabled' });
    await assert.rejects(createPinRecoveryDelivery({ env: {} }).sendCode({}), { code: 'PIN_RECOVERY_DELIVERY_UNAVAILABLE' });
});

test('fake accepts only minimal fields, sends once and stores in process memory', async () => {
    const fake = createPinDeliveryFake();
    const input = { to: 'synthetic@example.invalid', code: '123456', expiresAt: new Date() };
    const provider = createPinRecoveryDelivery({ env: { NODE_ENV: 'test', PIN_DELIVERY_PROVIDER: 'fake' }, testDelivery: fake.provider });
    assert.equal(await provider.sendCode({ ...input, extra: 'discard' }), undefined);
    assert.equal(fake.provider.messages.length, 1);
    assert.deepEqual(fake.takeDelivery(), input);
    assert.equal(fake.takeDelivery(), undefined);
    await createPinRecoveryDelivery({ env: { NODE_ENV: 'test', PIN_DELIVERY_PROVIDER: 'fake' } }).sendCode(input);
});

test('RF07 creates challenge, passes existing expiry, rejects invalid code, generates new PIN, rejects sequential reuse', async () => {
    const f = pinRecoveryFixture();
    await f.service.requestRecovery('auth0|test');
    const delivered = f.takeDelivery();
    assert.match(delivered.code, /^\d{6}$/);
    assert.equal(+delivered.expiresAt, +f.challenges[0].expires_at);
    assert.equal(f.challenges[0].delivery_status, 'delivered');
    assert.notEqual(f.challenges[0].code_hash, delivered.code);
    assert.equal('code' in f.challenges[0], false);
    const wrong = delivered.code === '000000' ? '000001' : '000000';
    await assert.rejects(f.service.confirmRecovery('auth0|test', wrong), { code: 'PIN_RECOVERY_CODE_INVALID' });
    const res = response();
    await createConfirmPinRecoveryHandler({ pins: f.service })({ auth: { payload: { sub: 'auth0|test' } }, body: { code: delivered.code } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { pinStatus: 'pending_acknowledgement' });
    const newPin = await f.service.reveal('auth0|test');
    assert.match(newPin, /^\d{6}$/);
    await f.service.acknowledge('auth0|test');
    await f.service.validate('auth0|test', newPin);
    await assert.rejects(f.service.confirmRecovery('auth0|test', delivered.code), { code: 'PIN_RECOVERY_CODE_EXPIRED' });
});

test('expired challenge rejects valid code at exact expiry boundary', async () => {
    const f = pinRecoveryFixture();
    await f.service.requestRecovery('auth0|test');
    const { code } = f.takeDelivery();
    f.expire();
    await assert.rejects(f.service.confirmRecovery('auth0|test', code), { code: 'PIN_RECOVERY_CODE_EXPIRED' });
});

test('request HTTP response never returns OTP or recipient', async () => {
    const f = pinRecoveryFixture();
    const res = response();
    await createRequestPinRecoveryHandler({ pins: f.service })({ auth: { payload: { sub: 'auth0|test' } } }, res);
    assert.equal(res.statusCode, 202);
    assert.deepEqual(res.body, { status: 'sent' });
});

for (const failStatus of [false, true]) {
    test(`provider exceptions, including failed status writes, are sanitized (${failStatus})`, async () => {
        const logs = [];
        let otp;
        const f = pinRecoveryFixture({ logger: { error: (...args) => logs.push(args) }, delivery: {
            async sendCode({ code, to }) { otp = code; throw Error(`${code} ${to} private-provider-response`); },
        } });
        if (failStatus) f.failStatus();
        await assert.rejects(f.service.requestRecovery('auth0|test'), error => {
            assert.equal(error.code, 'PIN_RECOVERY_DELIVERY_FAILED');
            assert.equal(error.message.includes(otp), false);
            assert.equal(error.message.includes(f.user.correo_usuario), false);
            assert.equal(error.cause, undefined);
            return true;
        });
        assert.equal(JSON.stringify(logs).includes(otp), false);
        assert.equal(JSON.stringify(logs).includes(f.user.correo_usuario), false);
        assert.equal(f.challenges[0].delivery_status, failStatus ? 'pending' : 'failed');
        await assert.rejects(f.service.confirmRecovery('auth0|test', otp), { code: 'PIN_RECOVERY_CODE_EXPIRED' });
    });
}

test('provider failure HTTP response is safe and missing provider returns unavailable', async () => {
    for (const f of [pinRecoveryFixture({ delivery: { async sendCode({ code }) { throw Error(code); } } }),
        pinRecoveryFixture({ env: { NODE_ENV: 'production' } })]) {
        const res = response();
        await createRequestPinRecoveryHandler({ pins: f.service })({ auth: { payload: { sub: 'auth0|test' } } }, res);
        assert.equal(res.statusCode, 503);
        assert.deepEqual(Object.keys(res.body).sort(), ['code', 'message', 'requestId']);
        assert.match(res.body.requestId, /^[0-9a-f-]{36}$/);
        assert.match(res.body.code, /^PIN_RECOVERY_DELIVERY_(FAILED|UNAVAILABLE)$/);
    }
});

test('stdout and stderr contain neither OTP nor recipient on successful/failed recovery', async () => {
    const fixtureUrl = new URL('./helpers/pinRecoveryFixture.js', import.meta.url).href;
    const script = `
        import { pinRecoveryFixture } from ${JSON.stringify(fixtureUrl)};
        const success = pinRecoveryFixture({ logger: console });
        await success.service.requestRecovery('auth0|test');
        success.takeDelivery();
        const failed = pinRecoveryFixture({ logger: console, delivery: { async sendCode({code, to}) { throw Error(code + to); } } });
        try { await failed.service.requestRecovery('auth0|test'); } catch (error) {
            if (error.code !== 'PIN_RECOVERY_DELIVERY_FAILED') throw Error('Unexpected recovery error');
        }
    `;
    const childEnv = { ...process.env };
    delete childEnv.NODE_TEST_CONTEXT;
    const { stdout, stderr } = await promisify(execFile)(process.execPath, ['--input-type=module', '-e', script], { env: childEnv });
    assert.equal(stdout, '');
    assert.equal(stderr, 'pin_recovery_delivery_failure\n');
});

// Concurrent single-use and rollback are covered in pinConcurrency.test.js.

for (const provider of ['fake', 'console']) {
    test(`application startup rejects production with ${provider} before opening server`, async () => {
        const childEnv = { ...process.env, NODE_ENV: 'production', APP_ENV: 'production', ENABLE_DEMO_ROUTES: 'false', PIN_DELIVERY_PROVIDER: provider, RATE_LIMIT_SECRET: Buffer.alloc(32, 8).toString('base64'), SECURITY_LOG_HMAC_KEY: 'synthetic',
            AUTH0_DOMAIN: 'synthetic.invalid', AUTH0_AUDIENCE: 'https://api.synthetic.invalid',
            FRONTEND_ORIGIN: 'https://frontend.synthetic.invalid', PIN_SECRET: Buffer.alloc(32, 7).toString('base64') };
        delete childEnv.NODE_TEST_CONTEXT;
        const application = new URL('../src/app/app.js', import.meta.url);
        await assert.rejects(promisify(execFile)(process.execPath, [fileURLToPath(application)], { env: childEnv, cwd: tmpdir(), timeout: 10000 }), error => {
            assert.equal(error.code, 1);
            assert.match(error.stdout + error.stderr, /PIN_DELIVERY_CONFIGURATION_INVALID/);
            assert.equal((error.stdout + error.stderr).includes('Servidor corriendo'), false);
            return true;
        });
    });
}
