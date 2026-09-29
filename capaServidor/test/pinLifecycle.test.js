import { matchesRow, applyRow } from './helpers/pinPersistenceFake.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scryptSync } from 'node:crypto';
import { PinService } from '../src/modules/auth/service/pin.service.js';
import { createRevealPinHandler } from '../src/modules/auth/controller/auth.controller.js';

function matches(row, where) {
    return Object.entries(where).every(([key, value]) => {
        if (key === 'OR') return value.some(w => matches(row, w));
        if (value && typeof value === 'object' && !(value instanceof Date)) {
            if ('gt' in value) return row[key] > value.gt;
            if ('lte' in value) return row[key] != null && row[key] <= value.lte;
            if ('not' in value) return row[key] != value.not;
        }
        return value instanceof Date ? +row[key] === +value : (row[key] ?? null) === value;
    });
}
async function fixture() {
    const now = new Date('2026-09-26T12:00:00Z');
    const user = { id_usuario: 1, id_auth0: 'test', estado_usuario: 'Activo' };
    let fail = false;
    let challenge;
    let delivered;
    const client = {
        usuario: {
            findUnique: async () => ({ ...user }),
            update: async ({ data }) => { if (fail) throw Error('write failed'); Object.assign(user, data); },
            updateMany: async ({ where, data }) => {
                if (fail) throw Error('write failed');
                if (!matches(user, where)) return { count: 0 };
                Object.assign(user, data); return { count: 1 };
            },
        },
        pinRecoveryChallenge: {
            create: async ({ data }) => (challenge = { ...data, id_pin_recovery_challenge: 1, failed_attempts: 0 }),
            update: async ({ data }) => Object.assign(challenge, data),
            updateMany: async ({ where, data }) => {
                if (!challenge || !matchesRow(challenge, where)) return { count: 0 };
                applyRow(challenge, data); return { count: 1 };
            },
            findUnique: async () => challenge,
            findFirst: async () => challenge?.used_at ? null : { ...challenge },
        },
        $queryRaw: async () => [{ ...user }],
        $transaction: async operations => typeof operations === "function" ? operations(client) : Promise.all(operations),
    };
    const service = new PinService({ prisma: client, secret: Buffer.alloc(32, 7).toString('base64'),
        now: () => now, deliveryEnvironment: { NODE_ENV: 'test', PIN_DELIVERY_PROVIDER: 'fake' }, delivery: { sendCode: async ({ code }) => { delivered = code; } } });
    const credential = await service.buildCredential();
    Object.assign(user, credential.data);
    return { service, user, credential, client,
        fail: value => { fail = value; }, code: () => delivered };
}
const assertCleared = user => {
    for (const key of ['pin_pending_ciphertext', 'pin_pending_iv', 'pin_pending_tag']) assert.equal(user[key], null);
};

test('RF06: reveal, atomic acknowledgement, no recovery of accepted PIN, valid/invalid verification', async () => {
    const f = await fixture();
    assert.match(f.user.pin_hash, /^scrypt\$v2\$N=32768,r=8,p=3\$/);
    assert.equal(await f.service.reveal('test'), f.credential.pin);
    f.fail(true);
    await assert.rejects(f.service.acknowledge('test'), /write failed/);
    assert.equal(f.user.pin_accepted_at, null);
    assert.ok(f.user.pin_pending_ciphertext);
    f.fail(false);
    await f.service.acknowledge('test');
    assertCleared(f.user);
    await f.service.acknowledge('test');
    await assert.rejects(f.service.reveal('test'), { code: 'PIN_NOT_REVEALABLE' });
    await f.service.validate('test', f.credential.pin);
    const wrong = f.credential.pin === '000000' ? '000001' : '000000';
    await assert.rejects(f.service.validate('test', wrong), { code: 'PIN_INVALID' });
});

test('legacy scrypt remains valid without touching H05 counters on successful clean validation', async () => {
    const f = await fixture();
    const salt = Buffer.alloc(16, 3);
    Object.assign(f.user, { pin_hash: scryptSync('123456', salt, 32, { N: 16384, r: 8, p: 1 }).toString('base64'),
        pin_salt: salt.toString('base64'), pin_accepted_at: new Date() });
    const previous = f.user.pin_hash;
    await f.service.validate('test', '123456');
    assert.equal(f.user.pin_hash, previous);
    await assert.rejects(f.service.validate('test', '654321'), { code: 'PIN_INVALID' });
    f.user.pin_locked_until = new Date('2026-09-26T12:01:00Z');
    await assert.rejects(f.service.validate('test', '123456'), { code: 'PIN_LOCKED' });
});

test('RF07 replaces accepted PIN with a different generated PIN using v2', async () => {
    const f = await fixture();
    await f.service.acknowledge('test');
    await f.service.requestRecovery('test');
    assert.equal(await f.service.confirmRecovery('test', f.code()), 'pending_acknowledgement');
    const pin = await f.service.reveal('test');
    assert.notEqual(pin, f.credential.pin);
    await f.service.acknowledge('test');
    await f.service.validate('test', pin);
    await assert.rejects(f.service.validate('test', f.credential.pin), { code: 'PIN_INVALID' });
    await assert.rejects(f.service.reveal('test'), { code: 'PIN_NOT_REVEALABLE' });
});

test('reveal API exposes only PIN; accepted PIN exposes only safe code/message', async () => {
    const f = await fixture();
    const res = { set() { return this; }, status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; } };
    const handler = createRevealPinHandler({ pins: f.service });
    await handler({ auth: { payload: { sub: 'test' } } }, res);
    assert.deepEqual(res.body, { pin: f.credential.pin });
    await f.service.acknowledge('test');
    await handler({ auth: { payload: { sub: 'test' } } }, res);
    assert.equal(res.statusCode, 409);
    assert.deepEqual(Object.keys(res.body).sort(), ['code', 'message']);
});

test('unknown hash versions fail closed', async () => {
    const f = await fixture();
    await f.service.acknowledge('test');
    f.user.pin_hash = f.user.pin_hash.replace('$v2$', '$v99$');
    await assert.rejects(f.service.validate('test', f.credential.pin), { code: 'PIN_INVALID' });
});
