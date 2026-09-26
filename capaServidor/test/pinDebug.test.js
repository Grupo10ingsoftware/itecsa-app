import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDebugResetPinHandler, createRevealPinHandler } from '../src/modules/auth/controller/auth.controller.js';
import { PinService } from '../src/modules/auth/service/pin.service.js';
import { ROLES, ROLES_CLAIM, PERMISSIONS } from '../../shared/authorization.js';

const payload = { sub: 'auth0|support', [ROLES_CLAIM]: [ROLES.SOPORTE], permissions: [PERMISSIONS.MANAGE_PIN] };

async function fixture() {
    let user = { id_usuario: 1, id_auth0: payload.sub, estado_usuario: 'Activo', rol_usuario: ROLES.SOPORTE };
    let challenges = [{ id_usuario: 1, used_at: null }];
    let fail = false;
    const client = {
        usuario: {
            findUnique: async ({ where }) => where.id_auth0 === user.id_auth0 ? { ...user } : null,
            update: async ({ data }) => { Object.assign(user, data); },
        },
        $transaction: async (callback) => {
            const before = { ...user };
            const previousChallenges = structuredClone(challenges);
            try {
                return await callback({
                    $queryRaw: async (_strings, auth0UserId) =>
                        auth0UserId === user.id_auth0 ? [{ ...user }] : [],
                    usuario: {
                        update: async ({ data }) => {
                            Object.assign(user, data);
                            return { ...user };
                        },
                        updateMany: async ({ where, data }) => {
                            if (user.pin_hash !== where.pin_hash || user.rol_usuario !== where.rol_usuario || !where.estado_usuario.in.includes(user.estado_usuario)) return { count: 0 };
                            Object.assign(user, data);
                            return { count: 1 };
                        },
                    },
                    pinRecoveryChallenge: { updateMany: async ({ data }) => {
                        if (fail) throw new Error('database failure');
                        challenges = challenges.map(c => ({ ...c, ...data }));
                    } },
                });
            } catch (error) { user = before; challenges = previousChallenges; throw error; }
        },
    };
    const service = new PinService({ prisma: client, secret: Buffer.alloc(32, 7).toString('base64') });
    const initial = await service.buildCredential();
    Object.assign(user, initial.data, { pin_accepted_at: new Date(), pin_pending_ciphertext: null, pin_pending_iv: null, pin_pending_tag: null });
    return { service, initial, user: () => user, challenges: () => challenges, fail: () => { fail = true; } };
}

test('debug PIN: environment, authorization, rotation and transaction', async (t) => {
    const previous = process.env.NODE_ENV;
    t.after(() => { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; });
    const f = await fixture();
    for (const env of ['production', 'test', '', undefined]) {
        if (env === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = env;
        await assert.rejects(f.service.debugReset(payload), { code: 'PIN_DEBUG_DISABLED' });
    }
    process.env.NODE_ENV = 'development';
    for (const role of Object.values(ROLES).filter(r => r !== ROLES.SOPORTE)) {
        await assert.rejects(f.service.debugReset({ ...payload, [ROLES_CLAIM]: [role] }), { code: 'PIN_DEBUG_FORBIDDEN' });
    }
    await assert.rejects(f.service.debugReset({ ...payload, permissions: [] }), { code: 'PIN_DEBUG_FORBIDDEN' });
    await assert.rejects(f.service.debugReset({ ...payload, sub: '' }), { code: 'PIN_DEBUG_FORBIDDEN' });
    f.user().rol_usuario = ROLES.GERENCIA;
    await assert.rejects(f.service.debugReset(payload), { code: 'PIN_DEBUG_FORBIDDEN' });
    f.user().rol_usuario = ROLES.SOPORTE;
    f.user().estado_usuario = 'Desvinculado';
    await assert.rejects(f.service.debugReset(payload), { code: 'PIN_USER_UNAVAILABLE' });
    f.user().estado_usuario = 'Activo';
    f.user().pin_locked_until = new Date(Date.now() + 100000);
    f.user().pin_failed_attempts = 4;
    assert.equal(await f.service.debugReset(payload), 'pending_acknowledgement');
    const pin = await f.service.reveal(payload.sub);
    assert.match(pin, /^\d{6}$/);
    assert.notEqual(pin, f.initial.pin);
    assert.equal(f.user().pin_locked_until, null);
    assert.equal(f.user().pin_failed_attempts, 0);
    assert.ok(f.challenges()[0].used_at);
    await f.service.acknowledge(payload.sub);
    await assert.rejects(f.service.reveal(payload.sub), { code: 'PIN_NOT_REVEALABLE' });
    await f.service.validate(payload.sub, pin);
    await assert.rejects(f.service.validate(payload.sub, f.initial.pin), { code: 'PIN_INVALID' });
    const before = structuredClone(f.user());
    f.fail();
    await assert.rejects(f.service.debugReset(payload), /database failure/);
    assert.deepEqual(f.user(), before);
});


test('debug controller uses authenticated identity, returns status only and disables caching', async () => {
    const res = {
        headers: {},
        set(key, value) { this.headers[key] = value; return this; },
        status(value) { this.statusCode = value; return this; },
        json(value) { this.body = value; return this; },
    };
    const handler = createDebugResetPinHandler({ pins: { debugReset: async (actor) => {
        assert.deepEqual(actor, payload);
        return 'pending_acknowledgement';
    } } });
    await handler({ auth: { payload }, body: { idUsuario: 999, sub: 'another-user' } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { pinStatus: 'pending_acknowledgement' });
    assert.equal(res.headers['Cache-Control'], 'no-store');
    await createRevealPinHandler({ pins: { reveal: async (sub) => {
        assert.equal(sub, payload.sub);
        return '123456';
    } } })({ auth: { payload } }, res);
    assert.deepEqual(res.body, { pin: '123456' });
    assert.equal(res.headers['Cache-Control'], 'no-store');
});
