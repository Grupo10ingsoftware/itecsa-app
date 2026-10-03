import assert from "node:assert/strict";
import { test } from "node:test";

import { createRequestPinRecoveryHandler } from "../src/modules/auth/controller/auth.controller.js";
import { PinService } from "../src/modules/auth/service/pin.service.js";
import {
    createPinRecoveryDelivery,
    PinDeliveryUnavailableError,
    unavailablePinRecoveryDelivery,
} from "../src/modules/auth/service/pinDelivery.service.js";

const TEST_EMAIL = "pin-recovery@example.invalid";
const TEST_SECRET = Buffer.alloc(32, 19).toString("base64");
const TEST_NOW = new Date("2026-09-27T12:00:00.000Z");

function createRecoveryFixture(delivery) {
    const user = {
        id_usuario: 41,
        id_auth0: "auth0|pin-recovery-test",
        estado_usuario: "Activo",
        correo_usuario: TEST_EMAIL,
    };
    const challenge = {
        id_pin_recovery_challenge: 73,
        id_usuario: user.id_usuario,
        expires_at: new Date(TEST_NOW.getTime() + 15 * 60 * 1000),
        delivery_status: null,
        used_at: null,
    };
    const writes = [];
    const prisma = {
        $queryRaw: async () => [{ ...user }],
        $transaction: async callback => callback(prisma),
        usuario: {
            async findUnique({ where }) {
                return where.id_auth0 === user.id_auth0 ? { ...user } : null;
            },
        },
        pinRecoveryChallenge: {
            async updateMany({ where, data }) {
                if (!where.id_pin_recovery_challenge) return { count: 0 };
                Object.assign(challenge, data);
                writes.push({ operation: "update", data: { ...data } });
                return { count: 1 };
            },
            async create({ data }) {
                Object.assign(challenge, data);
                writes.push({ operation: "create", data: { ...data } });
                return { ...challenge };
            },
            async update({ where, data }) {
                assert.equal(
                    where.id_pin_recovery_challenge,
                    challenge.id_pin_recovery_challenge,
                );
                Object.assign(challenge, data);
                writes.push({ operation: "update", data: { ...data } });
                return { ...challenge };
            },
        },
    };

    return {
        challenge,
        service: new PinService({
            prisma,
            secret: TEST_SECRET,
            delivery,
            deliveryEnvironment: { NODE_ENV: "test", PIN_DELIVERY_PROVIDER: delivery === unavailablePinRecoveryDelivery ? "disabled" : "fake" },
            now: () => TEST_NOW,
        }),
        user,
        writes,
    };
}

function responseDouble() {
    return {
        status(value) {
            this.statusCode = value;
            return this;
        },
        json(value) {
            this.body = value;
            return this;
        },
    };
}

test("default PIN recovery delivery fails closed in every application environment", async () => {
    const originalConsoleInfo = console.info;
    let consoleCalls = 0;
    console.info = () => {
        consoleCalls += 1;
    };

    try {
        for (const environment of ["development", "test", "production"]) {
            const delivery = createPinRecoveryDelivery({ env: { NODE_ENV: environment } });
            assert.equal(delivery, unavailablePinRecoveryDelivery);
            await assert.rejects(
                delivery.sendCode({
                    to: TEST_EMAIL,
                    code: "123456",
                    expiresAt: TEST_NOW,
                }),
                {
                    name: "PinDeliveryUnavailableError",
                    code: "PIN_RECOVERY_DELIVERY_UNAVAILABLE",
                },
            );
        }
    } finally {
        console.info = originalConsoleInfo;
    }

    assert.equal(consoleCalls, 0);
    assert.throws(
        () => createPinRecoveryDelivery({ env: { NODE_ENV: "", PIN_DELIVERY_PROVIDER: "fake" } }),
        /Configuracion de entrega de PIN invalida/,
    );
    assert.throws(
        () => createPinRecoveryDelivery({ env: { NODE_ENV: "preview" } }),
        /Configuracion de entrega de PIN invalida/,
    );
});

test("PIN recovery uses only an injected fake delivery and marks the challenge delivered", async () => {
    const sent = [];
    const fixture = createRecoveryFixture({
        async sendCode(payload) {
            sent.push(payload);
        },
    });

    await fixture.service.requestRecovery(fixture.user.id_auth0);

    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, TEST_EMAIL);
    assert.match(sent[0].code, /^\d{6}$/);
    assert.equal(sent[0].expiresAt.toISOString(), "2026-09-27T12:15:00.000Z");
    assert.equal(fixture.challenge.delivery_status, "delivered");
    assert.equal(fixture.challenge.used_at, null);
    assert.deepEqual(
        fixture.writes.map(({ operation, data }) => [operation, data.delivery_status]),
        [
            ["create", "pending"],
            ["update", "delivered"],
        ],
    );
});

test("unavailable PIN delivery consumes the synthetic challenge and maps to HTTP 503", async () => {
    const fixture = createRecoveryFixture(unavailablePinRecoveryDelivery);

    await assert.rejects(
        fixture.service.requestRecovery(fixture.user.id_auth0),
        {
            name: "PinDeliveryUnavailableError",
            code: "PIN_RECOVERY_DELIVERY_UNAVAILABLE",
        },
    );
    assert.equal(fixture.challenge.delivery_status, "failed");
    assert.equal(fixture.challenge.used_at, TEST_NOW);

    const handler = createRequestPinRecoveryHandler({
        pins: {
            async requestRecovery() {
                throw new PinDeliveryUnavailableError();
            },
        },
    });
    const response = responseDouble();
    await handler({ auth: { payload: { sub: fixture.user.id_auth0 } } }, response);

    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.body, {
        code: "PIN_RECOVERY_DELIVERY_UNAVAILABLE",
        message: "La entrega del codigo de recuperacion de PIN no esta configurada.",
        requestId: response.body.requestId,
    });
});
