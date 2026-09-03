import { Router } from "express";
import checkJwt from "../../../middlewares/checkJwt.js";
import pinService from "../service/pin.service.js";
import {
    createAcknowledgePinHandler,
    createConfirmPinRecoveryHandler,
    createPasswordResetRequestHandler,
    createRequestPinRecoveryHandler,
    createRevealPinHandler,
    createVerifyAuthSessionHandler,
} from "../controller/auth.controller.js";

const PASSWORD_RESET_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const PASSWORD_RESET_RATE_LIMIT_MAX_ATTEMPTS = 5;
const passwordResetAttempts = new Map();

function getPasswordResetRateLimitKey(req) {
    const email =
        typeof req.body?.email === "string"
            ? req.body.email.trim().toLowerCase()
            : "";

    return `${req.ip ?? "unknown"}:${email}`;
}

export function createPasswordResetRateLimit({
    attempts = passwordResetAttempts,
    windowMs = PASSWORD_RESET_RATE_LIMIT_WINDOW_MS,
    maxAttempts = PASSWORD_RESET_RATE_LIMIT_MAX_ATTEMPTS,
    now = Date.now,
} = {}) {
    return function passwordResetRateLimit(req, res, next) {
        const currentTime = now();
        const key = getPasswordResetRateLimitKey(req);
        const currentAttempt = attempts.get(key);

        if (!currentAttempt || currentAttempt.expiresAt <= currentTime) {
            attempts.set(key, {
                count: 1,
                expiresAt: currentTime + windowMs,
            });
            return next();
        }

        if (currentAttempt.count >= maxAttempts) {
            return res.status(429).json({
                message:
                    "Demasiados intentos de recuperación. Intenta nuevamente más tarde.",
            });
        }

        currentAttempt.count += 1;
        attempts.set(key, currentAttempt);
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
} = {}) {
    const router = Router();

    router.get(
        "/verify",
        authenticate,
        createVerifyAuthSessionHandler({ users, pins, logger }),
    );
    router.post("/pin/reveal", authenticate, createRevealPinHandler({ pins }));
    router.post("/pin/acknowledge", authenticate, createAcknowledgePinHandler({ pins }));
    router.post(
        "/pin-recovery/request",
        authenticate,
        createRequestPinRecoveryHandler({ pins }),
    );
    router.post(
        "/pin-recovery/confirm",
        authenticate,
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
