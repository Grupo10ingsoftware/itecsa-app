import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPasswordResetRateLimit } from '../src/middlewares/rateLimit.js';
import { MemoryThrottleService } from '../src/modules/security/service/securityThrottle.service.js';

async function invoke(limiter, ip, email) {
    const res = { statusCode: 200, set() {}, status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; } };
    await limiter({ ip, headers: { 'x-forwarded-for': 'untrusted' }, body: { email } }, res, error => { if (error) throw error; });
    return res.statusCode;
}
test('password reset limits independent emails sharing one IP', async () => {
    const limiter = createPasswordResetRateLimit({ throttle: new MemoryThrottleService() });
    for (let i = 0; i < 10; i++) assert.equal(await invoke(limiter, '192.0.2.1', `user${i}@example.invalid`), 200);
    assert.equal(await invoke(limiter, '192.0.2.1', 'extra@example.invalid'), 429);
});
test('password reset normalizes email across IPs and expires the quota', async () => {
    let now = new Date(1000);
    const entries = new Map();
    const throttle = new MemoryThrottleService({ now: () => now, entries });
    const limiter = createPasswordResetRateLimit({ throttle });
    for (let i = 0; i < 3; i++) assert.equal(await invoke(limiter, `192.0.2.${i}`, ' Person@Example.invalid '), 200);
    assert.equal(await invoke(limiter, '192.0.2.4', 'person@example.invalid'), 429);
    assert.equal(JSON.stringify([...entries]).includes('example.invalid'), false);
    now = new Date(1000 + 15 * 60_000);
    await throttle.purgeExpired();
    assert.equal(entries.size, 0);
    assert.equal(await invoke(limiter, '192.0.2.4', 'person@example.invalid'), 200);
});
test('memory quota fails closed at capacity and purges expired entries', async () => {
    let now = new Date(1000);
    const entries = new Map();
    const throttle = new MemoryThrottleService({ now: () => now, entries, maxEntries: 2 });
    const limiter = createPasswordResetRateLimit({ throttle });
    assert.equal(await invoke(limiter, '192.0.2.1', 'one@example.invalid'), 200);
    assert.equal(await invoke(limiter, '192.0.2.2', 'two@example.invalid'), 429);
    assert.equal(entries.size, 2);
    now = new Date(1000 + 15 * 60_000);
    assert.equal(await invoke(limiter, '192.0.2.2', 'two@example.invalid'), 200);
    assert.equal(entries.size, 2);
});
