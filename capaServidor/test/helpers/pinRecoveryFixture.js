import { PinService } from '../../src/modules/auth/service/pin.service.js';
import { createPinDeliveryFake } from './pinDeliveryFake.js';

export function pinRecoveryFixture({ delivery, env, logger = { error() {} } } = {}) {
    let clock = new Date('2026-09-26T12:00:00Z');
    const user = { id_usuario: 1, id_auth0: 'auth0|test', correo_usuario: 'synthetic@example.invalid', estado_usuario: 'Activo' };
    const challenges = [];
    const fake = createPinDeliveryFake();
    let failStatus = false;
    const prisma = {
        usuario: {
            findUnique: async () => ({ ...user }),
            update: async ({ data }) => Object.assign(user, data),
        },
        pinRecoveryChallenge: {
            create: async ({ data }) => {
                const challenge = { ...data, id_pin_recovery_challenge: challenges.length + 1, used_at: null, failed_attempts: 0, created_at: clock };
                challenges.push(challenge);
                return { ...challenge };
            },
            update: async ({ where, data }) => {
                if (failStatus) throw Error('private database failure');
                return Object.assign(challenges.find(c => c.id_pin_recovery_challenge === where.id_pin_recovery_challenge), data);
            },
            updateMany: async ({ data }) => {
                for (const c of challenges.filter(c => c.used_at === null)) Object.assign(c, data);
            },
            findFirst: async () => {
                const c = challenges.findLast(c => c.used_at === null && c.delivery_status === 'delivered');
                return c ? { ...c } : null;
            },
        },
        $transaction: async operations => Promise.all(operations),
    };
    const service = new PinService({ prisma, secret: Buffer.alloc(32, 7).toString('base64'),
        now: () => clock, delivery: delivery ?? fake.provider,
        deliveryEnvironment: env ?? { NODE_ENV: 'test', PIN_DELIVERY_PROVIDER: 'test' }, logger });
    return { service, user, challenges, takeDelivery: fake.takeDelivery,
        expire: () => { clock = new Date(+clock + 15 * 60 * 1000); },
        failStatus: () => { failStatus = true; } };
}
