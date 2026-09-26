import { createHash } from "node:crypto";
import requireCapability, { PERMISSIONS as P } from "../../../middlewares/requireCapability.js";
import { Router } from "express";
import checkJwt from "../../../middlewares/checkJwt.js";
import pinService from "../service/pin.service.js";
import {
    createGetProfileHandler,
    createDebugResetPinHandler,
    createAcknowledgePinHandler,
    createConfirmPinRecoveryHandler,
    createPasswordResetRequestHandler,
    createRequestPinRecoveryHandler,
    createRevealPinHandler,
    createVerifyAuthSessionHandler,
} from "../controller/auth.controller.js";

const PASSWORD_RESET_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const PASSWORD_RESET_RATE_LIMIT_MAX_ATTEMPTS_PER_IP = 20;
const PASSWORD_RESET_RATE_LIMIT_MAX_ATTEMPTS_PER_EMAIL = 5;
const PASSWORD_RESET_RATE_LIMIT_MAX_ENTRIES = 10000;
const PASSWORD_RESET_EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordResetAttempts = new Map();

export function purgeExpiredPasswordResetAttempts(attempts, currentTime = Date.now()) {
    for (const [key, attempt] of attempts) {
        if (attempt.expiresAt <= currentTime) attempts.delete(key);
    }
}

const passwordResetAttemptsCleanup = setInterval(
    () => purgeExpiredPasswordResetAttempts(passwordResetAttempts),
    60 * 1000,
);
passwordResetAttemptsCleanup.unref();

function getRateLimitKey(scope, value) {
    const digest = createHash("sha256").update(value).digest("hex");
    return `${scope}:${digest}`;
}

export function createPasswordResetRateLimit({
    attempts = passwordResetAttempts,
    windowMs = PASSWORD_RESET_RATE_LIMIT_WINDOW_MS,
    maxAttemptsPerIp = PASSWORD_RESET_RATE_LIMIT_MAX_ATTEMPTS_PER_IP,
    maxAttemptsPerEmail = PASSWORD_RESET_RATE_LIMIT_MAX_ATTEMPTS_PER_EMAIL,
    maxEntries = PASSWORD_RESET_RATE_LIMIT_MAX_ENTRIES,
    now = Date.now,
} = {}) {
    return function passwordResetRateLimit(req, res, next) {
        const currentTime = now();
        purgeExpiredPasswordResetAttempts(attempts, currentTime);

        const clientIp = req.ip ?? req.socket?.remoteAddress ?? "unknown";
        const keys = [
            {
                key: getRateLimitKey("ip", clientIp),
                limit: maxAttemptsPerIp,
            },
        ];
        const email =
            typeof req.body?.email === "string"
                ? req.body.email.trim().toLowerCase()
                : "";

        if (PASSWORD_RESET_EMAIL_FORMAT.test(email)) {
            keys.push({
                key: getRateLimitKey("email", email),
                limit: maxAttemptsPerEmail,
            });
        }

        if (keys.some(({ key, limit }) => (attempts.get(key)?.count ?? 0) >= limit)) {
            return res.status(429).json({
                message:
                    "Demasiados intentos de recuperación. Intenta nuevamente más tarde.",
            });
        }

        const newKeys = keys.filter(({ key }) => !attempts.has(key)).length;
        if (attempts.size + newKeys > maxEntries) {
            return res.status(429).json({
                message:
                    "Demasiados intentos de recuperación. Intenta nuevamente más tarde.",
            });
        }

        for (const { key } of keys) {
            const currentAttempt = attempts.get(key);
            attempts.set(key, {
                count: (currentAttempt?.count ?? 0) + 1,
                expiresAt: currentAttempt?.expiresAt ?? currentTime + windowMs,
            });
        }

        return next();
    };
}

export function createAuthRouter({
    authenticate = checkJwt,
    passwordResetRateLimit = createPasswordResetRateLimit(),
    users,
    requestPasswordEmail,
    logger,
    pins = pinService,
    includeDebugRoutes = false,
} = {}) {
    const router = Router();

    router.get("/profile", authenticate, requireCapability(P.READ_PROFILE), createGetProfileHandler({ users }));

    router.get(
        "/verify",
        authenticate,
        requireCapability(P.READ_PROFILE),
        createVerifyAuthSessionHandler({ users, pins, logger }),
    );
    if (includeDebugRoutes) {
        router.post("/pin/debug-reset", authenticate, requireCapability(P.MANAGE_PIN), createDebugResetPinHandler({ pins }));
    }
    router.post("/pin/reveal", authenticate, requireCapability(P.MANAGE_PIN), createRevealPinHandler({ pins }));
    router.post("/pin/acknowledge", authenticate, requireCapability(P.MANAGE_PIN), createAcknowledgePinHandler({ pins }));
    router.post(
        "/pin-recovery/request",
        authenticate,
        requireCapability(P.MANAGE_PIN),
        createRequestPinRecoveryHandler({ pins }),
    );
    router.post(
        "/pin-recovery/confirm",
        authenticate,
        requireCapability(P.MANAGE_PIN),
        createConfirmPinRecoveryHandler({ pins }),
    );
    router.post(
        "/password-reset/request",
        passwordResetRateLimit,
        createPasswordResetRequestHandler({ users, requestPasswordEmail, logger }),
    );

    return router;
}

export default createAuthRouter();
