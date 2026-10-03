import assert from "node:assert/strict";
import { test } from "node:test";
import { PinService } from "../src/modules/auth/service/pin.service.js";

const AUTH0_USER_ID = "auth0|pin-concurrency";
const SECRET = Buffer.alloc(32, 9).toString("base64");

function matchesWhere(record, where) {
    return Object.entries(where).every(([key, expected]) => {
        const actual = record[key];
        if (expected && typeof expected === "object" && !(expected instanceof Date)) {
            if ("gt" in expected) return actual > expected.gt;
            if ("lt" in expected) return actual < expected.lt;
            if ("in" in expected) return expected.in.includes(actual);
        }
        return actual === expected;
    });
}

function applyData(record, data) {
    for (const [key, value] of Object.entries(data)) {
        record[key] =
            value && typeof value === "object" && "increment" in value
                ? record[key] + value.increment
                : value;
    }
}

async function createFixture() {
    let now = new Date();
    let user = {
        id_usuario: 17,
        id_auth0: AUTH0_USER_ID,
        correo_usuario: "pin@example.cl",
        nombre_usuario: "PIN",
        apellido_usuario: "Test",
        estado_usuario: "Activo",
        pin_hash: null,
        pin_salt: null,
        pin_accepted_at: null,
        pin_failed_attempts: 0,
        pin_locked_until: null,
    };
    let challenges = [];
    let nextChallengeId = 1;
    let transactionTail = Promise.resolve();
    let failPinUpdate = false;
    const deliveredCodes = [];

    function updateUser({ where, data }) {
        if (user.id_usuario !== where.id_usuario) {
            throw new Error("Unexpected user in test persistence");
        }
        if (failPinUpdate) throw new Error("Injected PIN update failure");
        applyData(user, data);
        return { ...user };
    }

    function updateChallenges({ where, data }) {
        let count = 0;
        for (const challenge of challenges) {
            if (!matchesWhere(challenge, where)) continue;
            applyData(challenge, data);
            count += 1;
        }
        return { count };
    }

    const client = {
        usuario: {
            async findUnique({ where }) {
                if (
                    where.id_auth0 !== undefined &&
                    where.id_auth0 !== user.id_auth0
                ) {
                    return null;
                }
                return { ...user };
            },
        },
        pinRecoveryChallenge: {
            async findFirst({ where }) {
                return (
                    challenges
                        .filter((challenge) => matchesWhere(challenge, where))
                        .sort((left, right) => right.id_pin_recovery_challenge - left.id_pin_recovery_challenge)[0] ??
                    null
                );
            },
            async findUnique({ where }) {
                return (
                    challenges.find(
                        (challenge) =>
                            challenge.id_pin_recovery_challenge ===
                            where.id_pin_recovery_challenge,
                    ) ?? null
                );
            },
            async updateMany(args) {
                return updateChallenges(args);
            },
        },
        async $transaction(callback) {
            const previousTransaction = transactionTail;
            let release;
            transactionTail = new Promise((resolve) => {
                release = resolve;
            });
            await previousTransaction;

            const previousUser = structuredClone(user);
            const previousChallenges = structuredClone(challenges);
            const transaction = {
                async $queryRaw(_strings, auth0UserId) {
                    return auth0UserId === user.id_auth0 ? [{ ...user }] : [];
                },
                usuario: {
                    async update(args) {
                        return updateUser(args);
                    },
                },
                pinRecoveryChallenge: {
                    async create({ data }) {
                        const challenge = {
                            id_pin_recovery_challenge: nextChallengeId++,
                            failed_attempts: 0,
                            used_at: null,
                            created_at: new Date(now),
                            ...data,
                        };
                        challenges.push(challenge);
                        return { ...challenge };
                    },
                    async updateMany(args) {
                        return updateChallenges(args);
                    },
                },
            };

            try {
                return await callback(transaction);
            } catch (error) {
                user = previousUser;
                challenges = previousChallenges;
                throw error;
            } finally {
                release();
            }
        },
    };

    const service = new PinService({
        prisma: client,
        secret: SECRET,
        now: () => new Date(now),
        deliveryEnvironment: { NODE_ENV: "test", PIN_DELIVERY_PROVIDER: "fake" },
        delivery: {
            async sendCode({ code }) {
                deliveredCodes.push(code);
            },
        },
    });
    const initialCredential = await service.buildCredential();
    Object.assign(user, initialCredential.data, {
        pin_accepted_at: new Date(now),
        pin_pending_ciphertext: null,
        pin_pending_iv: null,
        pin_pending_tag: null,
    });

    return {
        service,
        user: () => user,
        challenges: () => challenges,
        initialPin: initialCredential.pin,
        deliveredCodes,
        setNow(value) {
            now = new Date(value);
        },
        failPinUpdate() {
            failPinUpdate = true;
        },
        clearPinUpdateFailure() {
            failPinUpdate = false;
        },
    };
}

function wrongPinFor(pin) {
    return pin === "999999" ? "888888" : "999999";
}

test("los intentos incorrectos concurrentes contabilizan cinco y bloquean el PIN", async () => {
    const fixture = await createFixture();
    const wrongPin = wrongPinFor(fixture.initialPin);
    const attempts = await Promise.allSettled(
        Array.from({ length: 6 }, () =>
            fixture.service.validate(AUTH0_USER_ID, wrongPin),
        ),
    );

    assert.equal(
        attempts.filter(
            (attempt) =>
                attempt.status === "rejected" &&
                attempt.reason.code === "PIN_INVALID",
        ).length,
        5,
    );
    assert.equal(
        attempts.filter(
            (attempt) =>
                attempt.status === "rejected" &&
                attempt.reason.code === "PIN_LOCKED",
        ).length,
        1,
    );
    assert.equal(fixture.user().pin_failed_attempts, 0);
    assert.ok(fixture.user().pin_locked_until > new Date());
    await assert.rejects(
        fixture.service.validate(AUTH0_USER_ID, fixture.initialPin),
        { code: "PIN_LOCKED" },
    );
});

test("un PIN correcto limpia contador y bloqueo vencido", async () => {
    const fixture = await createFixture();
    fixture.user().pin_failed_attempts = 3;
    fixture.user().pin_locked_until = new Date("2026-09-26T11:59:00.000Z");

    await fixture.service.validate(AUTH0_USER_ID, fixture.initialPin);

    assert.equal(fixture.user().pin_failed_attempts, 0);
    assert.equal(fixture.user().pin_locked_until, null);
});

test("PIN correcto e incorrecto concurrentes respetan el orden de serialización", async () => {
    const correctFirst = await createFixture();
    correctFirst.user().pin_failed_attempts = 2;
    const validPin = correctFirst.initialPin;
    await Promise.allSettled([
        correctFirst.service.validate(AUTH0_USER_ID, validPin),
        correctFirst.service.validate(AUTH0_USER_ID, wrongPinFor(validPin)),
    ]);
    assert.equal(correctFirst.user().pin_failed_attempts, 1);
    assert.equal(correctFirst.user().pin_locked_until, null);

    const incorrectFirst = await createFixture();
    incorrectFirst.user().pin_failed_attempts = 2;
    const otherValidPin = incorrectFirst.initialPin;
    await Promise.allSettled([
        incorrectFirst.service.validate(
            AUTH0_USER_ID,
            wrongPinFor(otherValidPin),
        ),
        incorrectFirst.service.validate(AUTH0_USER_ID, otherValidPin),
    ]);
    assert.equal(incorrectFirst.user().pin_failed_attempts, 0);
    assert.equal(incorrectFirst.user().pin_locked_until, null);
});

test("solo una confirmación concurrente consume el mismo reto y cambia el PIN", async () => {
    const fixture = await createFixture();
    const previousHash = fixture.user().pin_hash;
    await fixture.service.requestRecovery(AUTH0_USER_ID);
    const [code] = fixture.deliveredCodes;

    const confirmations = await Promise.allSettled(
        Array.from({ length: 2 }, () =>
            fixture.service.confirmRecovery(AUTH0_USER_ID, code),
        ),
    );

    assert.equal(
        confirmations.filter((result) => result.status === "fulfilled").length,
        1,
    );
    assert.equal(
        confirmations.filter((result) => result.status === "rejected").length,
        1,
    );
    assert.notEqual(fixture.user().pin_hash, previousHash);
    assert.equal(fixture.user().pin_accepted_at, null);
    assert.ok(fixture.challenges()[0].used_at);
});

test("un fallo al guardar el nuevo PIN revierte el consumo del reto", async () => {
    const fixture = await createFixture();
    await fixture.service.requestRecovery(AUTH0_USER_ID);
    const [code] = fixture.deliveredCodes;
    const previousHash = fixture.user().pin_hash;
    fixture.failPinUpdate();

    await assert.rejects(
        fixture.service.confirmRecovery(AUTH0_USER_ID, code),
        /Injected PIN update failure/,
    );
    assert.equal(fixture.user().pin_hash, previousHash);
    assert.equal(fixture.challenges()[0].used_at, null);

    fixture.clearPinUpdateFailure();
    assert.equal(
        await fixture.service.confirmRecovery(AUTH0_USER_ID, code),
        "pending_acknowledgement",
    );
});

test("solicitar un reto nuevo invalida el anterior", async () => {
    const fixture = await createFixture();
    await fixture.service.requestRecovery(AUTH0_USER_ID);
    await fixture.service.requestRecovery(AUTH0_USER_ID);
    const [firstCode, secondCode] = fixture.deliveredCodes;

    assert.ok(fixture.challenges()[0].used_at);
    assert.equal(fixture.challenges()[1].used_at, null);
    await assert.rejects(
        fixture.service.confirmRecovery(AUTH0_USER_ID, firstCode),
        { code: "PIN_RECOVERY_CODE_INVALID" },
    );
    assert.equal(
        await fixture.service.confirmRecovery(AUTH0_USER_ID, secondCode),
        "pending_acknowledgement",
    );
});

test("intentos incorrectos concurrentes agotan el reto sin perder incrementos", async () => {
    const fixture = await createFixture();
    await fixture.service.requestRecovery(AUTH0_USER_ID);
    const wrongCode =
        fixture.deliveredCodes[0] === "999999" ? "888888" : "999999";
    const attempts = await Promise.allSettled(
        Array.from({ length: 6 }, () =>
            fixture.service.confirmRecovery(AUTH0_USER_ID, wrongCode),
        ),
    );

    assert.equal(attempts.every((attempt) => attempt.status === "rejected"), true);
    assert.equal(fixture.challenges()[0].failed_attempts, 5);
    assert.ok(fixture.challenges()[0].used_at);
    assert.equal(fixture.user().pin_accepted_at instanceof Date, true);
});
