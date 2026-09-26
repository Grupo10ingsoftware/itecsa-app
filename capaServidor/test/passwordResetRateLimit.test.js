import assert from "node:assert/strict";
import { test } from "node:test";

import {
    createPasswordResetRateLimit,
    purgeExpiredPasswordResetAttempts,
} from "../src/modules/auth/routes/auth.routes.js";

function invokeLimiter(limiter, { ip, email }) {
    let nextCalls = 0;
    const response = {
        statusCode: 200,
        body: null,
        status(statusCode) {
            this.statusCode = statusCode;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
    };

    limiter(
        { ip, socket: { remoteAddress: ip }, body: { email } },
        response,
        () => {
            nextCalls += 1;
        },
    );

    return { ...response, nextCalls };
}

test("limita correos diferentes que comparten una IP", () => {
    const limiter = createPasswordResetRateLimit({
        attempts: new Map(),
        maxAttemptsPerIp: 2,
        maxAttemptsPerEmail: 5,
        now: () => 1000,
    });

    assert.equal(
        invokeLimiter(limiter, { ip: "192.0.2.10", email: "uno@example.cl" }).statusCode,
        200,
    );
    assert.equal(
        invokeLimiter(limiter, { ip: "192.0.2.10", email: "dos@example.cl" }).statusCode,
        200,
    );
    assert.equal(
        invokeLimiter(limiter, { ip: "192.0.2.10", email: "tres@example.cl" }).statusCode,
        429,
    );
});

test("limita un correo normalizado entre IPs distintas", () => {
    const limiter = createPasswordResetRateLimit({
        attempts: new Map(),
        maxAttemptsPerIp: 5,
        maxAttemptsPerEmail: 2,
        now: () => 1000,
    });

    assert.equal(
        invokeLimiter(limiter, { ip: "192.0.2.11", email: " Persona@Example.cl " }).statusCode,
        200,
    );
    assert.equal(
        invokeLimiter(limiter, { ip: "192.0.2.12", email: "persona@example.cl" }).statusCode,
        200,
    );
    assert.equal(
        invokeLimiter(limiter, { ip: "192.0.2.13", email: "PERSONA@example.cl" }).statusCode,
        429,
    );
});

test("expira cuota tras la ventana y purga claves vencidas", () => {
    const attempts = new Map();
    let currentTime = 1000;
    const limiter = createPasswordResetRateLimit({
        attempts,
        windowMs: 100,
        maxAttemptsPerIp: 1,
        maxAttemptsPerEmail: 1,
        now: () => currentTime,
    });

    assert.equal(
        invokeLimiter(limiter, { ip: "192.0.2.14", email: "persona@example.cl" }).statusCode,
        200,
    );
    assert.equal(attempts.size, 2);
    currentTime = 1100;
    assert.equal(
        invokeLimiter(limiter, { ip: "192.0.2.14", email: "persona@example.cl" }).statusCode,
        200,
    );
    assert.equal(attempts.size, 2);
    assert.equal([...attempts.values()].every((attempt) => attempt.expiresAt === 1200), true);
});

test("purga claves vencidas aunque no llegue otra solicitud", () => {
    const attempts = new Map([
        ["expired", { count: 1, expiresAt: 999 }],
        ["active", { count: 1, expiresAt: 1001 }],
    ]);

    purgeExpiredPasswordResetAttempts(attempts, 1000);

    assert.deepEqual([...attempts.keys()], ["active"]);
});

test("rechaza nuevas claves cuando alcanza el límite de memoria", () => {
    const attempts = new Map();
    const limiter = createPasswordResetRateLimit({
        attempts,
        maxAttemptsPerIp: 5,
        maxAttemptsPerEmail: 5,
        maxEntries: 2,
        now: () => 1000,
    });

    assert.equal(
        invokeLimiter(limiter, { ip: "192.0.2.15", email: "uno@example.cl" }).statusCode,
        200,
    );
    assert.equal(attempts.size, 2);
    assert.equal(
        invokeLimiter(limiter, { ip: "192.0.2.16", email: "dos@example.cl" }).statusCode,
        429,
    );
    assert.equal(attempts.size, 2);
});

test("no confía en X-Forwarded-For y aplica el límite a req.ip", () => {
    const attempts = new Map();
    const limiter = createPasswordResetRateLimit({
        attempts,
        maxAttemptsPerIp: 1,
        maxAttemptsPerEmail: 5,
        now: () => 1000,
    });

    const invokeWithForwardedHeader = (ip) => {
        let nextCalls = 0;
        const response = {
            status(statusCode) {
                this.statusCode = statusCode;
                return this;
            },
            json() {
                return this;
            },
        };
        limiter(
            {
                ip,
                socket: { remoteAddress: ip },
                headers: { "x-forwarded-for": "198.51.100.100" },
                body: { email: "same@example.cl" },
            },
            response,
            () => {
                nextCalls += 1;
            },
        );
        return { statusCode: response.statusCode ?? 200, nextCalls };
    };

    assert.equal(invokeWithForwardedHeader("192.0.2.17").statusCode, 200);
    assert.equal(invokeWithForwardedHeader("192.0.2.17").statusCode, 429);
});
