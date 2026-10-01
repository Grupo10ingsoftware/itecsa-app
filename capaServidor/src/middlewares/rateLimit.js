import securityThrottle, { RateLimitExceededError } from "../modules/security/service/securityThrottle.service.js";

function clientAddress(req) {
    return req.ip || req.socket?.remoteAddress || "unknown";
}

function respondRateLimit(req, res, error) {
    res.set("Retry-After", String(error.retryAfterSeconds));
    return res.status(429).json({
        code: error.code,
        message: error.message,
        retryAfterSeconds: error.retryAfterSeconds,
        requestId: req.requestId,
    });
}

export function createThrottleMiddleware({ throttle = securityThrottle, rules }) {
    return async function throttleMiddleware(req, res, next) {
        try {
            for (const rule of rules(req)) {
                await throttle.consume(rule);
            }
            return next();
        } catch (error) {
            if (error instanceof RateLimitExceededError) return respondRateLimit(req, res, error);
            return next(error);
        }
    };
}

export const authenticatedRateLimit = createThrottleMiddleware({
    rules(req) {
        const isRead = req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS";
        return [{
            scope: isRead ? "authenticated-read" : "authenticated-write",
            subject: req.currentUser?.idUsuario ?? req.auth?.payload?.sub ?? clientAddress(req),
            limit: isRead ? 120 : 30,
            windowMs: 60_000,
        }];
    },
});

export function createPasswordResetRateLimit({ throttle = securityThrottle } = {}) {
    return createThrottleMiddleware({
        throttle,
        rules(req) {
            const email = typeof req.body?.email === "string"
                ? req.body.email.trim().toLowerCase()
                : "invalid";
            return [
                { scope: "password-reset-ip", subject: clientAddress(req), limit: 10, windowMs: 15 * 60_000 },
                { scope: "password-reset-account", subject: email, limit: 3, windowMs: 15 * 60_000 },
            ];
        },
    });
}

export function createPinRecoveryRateLimit({ event, throttle = securityThrottle } = {}) {
    if (event !== "request" && event !== "confirm") {
        throw new TypeError("Evento de recuperacion PIN desconocido.");
    }
    return createThrottleMiddleware({
        throttle,
        rules(req) {
            // Run only after authentication. Never take the account from the body.
            const subject = req.auth?.payload?.sub;
            if (!subject) throw new Error("La cuota PIN requiere una identidad autenticada.");
            const scope = `pin-recovery-${event}`;
            // Check IP first so rotating accounts cannot create unlimited quota rows.
            const rules = [{
                scope: `${scope}-ip`, subject: clientAddress(req),
                limit: event === "request" ? 10 : 50, windowMs: 15 * 60_000,
            }];
            if (event === "request") {
                rules.push({
                    scope: `${scope}-cooldown`, subject, limit: 1, windowMs: 60_000,
                });
            }
            rules.push({
                scope: `${scope}-account`, subject,
                limit: event === "request" ? 3 : 15, windowMs: 15 * 60_000,
            });
            return rules;
        },
    });
}
