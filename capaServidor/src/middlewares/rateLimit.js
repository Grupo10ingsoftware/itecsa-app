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
                { scope: "password-reset-account", subject: email, limit: 3, windowMs: 15 * 60_000 },
                { scope: "password-reset-ip", subject: clientAddress(req), limit: 10, windowMs: 15 * 60_000 },
            ];
        },
    });
}
