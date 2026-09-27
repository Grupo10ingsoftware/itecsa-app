import { createHmac, timingSafeEqual } from "node:crypto";
import getPrismaClient from "../../../database/prisma.js";
import { AppError } from "../../../shared/appError.js";

function decodeKey(value) {
    const normalized = String(value ?? "").trim();
    const decoded = Buffer.from(normalized, "base64");
    const canonical = decoded.toString("base64").replace(/=+$/, "");
    const supplied = normalized.replace(/=+$/, "");
    const canonicalBuffer = Buffer.from(canonical);
    const suppliedBuffer = Buffer.from(supplied);

    if (!normalized || decoded.length !== 32 || canonicalBuffer.length !== suppliedBuffer.length || !timingSafeEqual(
        canonicalBuffer,
        suppliedBuffer,
    )) {
        throw new Error("RATE_LIMIT_SECRET debe contener 32 bytes en base64.");
    }

    return decoded;
}

export class RateLimitExceededError extends AppError {
    constructor(retryAfterSeconds) {
        super(
            "RATE_LIMITED",
            "Demasiadas solicitudes. Intenta nuevamente más tarde.",
            { status: 429, details: { retryAfterSeconds } },
        );
        this.retryAfterSeconds = retryAfterSeconds;
    }
}

export class SecurityThrottleService {
    constructor({ prisma, secret, now = () => new Date() } = {}) {
        this.prisma = prisma;
        this.secret = secret;
        this.now = now;
    }

    get client() {
        return this.prisma ?? getPrismaClient();
    }

    hash(scope, subject) {
        const key = decodeKey(this.secret ?? process.env.RATE_LIMIT_SECRET);
        return createHmac("sha256", key)
            .update(`${scope}\0${String(subject ?? "unknown")}`)
            .digest("hex");
    }

    async consume({ scope, subject, limit, windowMs }) {
        const now = this.now();
        const expiresAt = new Date(now.getTime() + windowMs);
        const subjectHash = this.hash(scope, subject);

        const state = await this.client.$transaction(async (tx) => {
            await tx.$executeRaw`
                INSERT INTO SecurityThrottle
                    (scope, subject_hash, window_started_at, request_count, expires_at, updated_at)
                VALUES
                    (${scope}, ${subjectHash}, ${now}, 1, ${expiresAt}, ${now})
                ON DUPLICATE KEY UPDATE
                    request_count = IF(expires_at <= ${now}, 1, request_count + 1),
                    window_started_at = IF(expires_at <= ${now}, ${now}, window_started_at),
                    expires_at = IF(expires_at <= ${now}, ${expiresAt}, expires_at),
                    updated_at = ${now}
            `;

            return tx.securityThrottle.findUnique({
                where: { scope_subject_hash: { scope, subject_hash: subjectHash } },
                select: { request_count: true, expires_at: true },
            });
        });

        if (Number(state?.request_count ?? 0) > limit) {
            const retryAfterSeconds = Math.max(
                1,
                Math.ceil((new Date(state.expires_at).getTime() - now.getTime()) / 1000),
            );
            throw new RateLimitExceededError(retryAfterSeconds);
        }

        return state;
    }

    async purgeExpired() {
        return this.client.securityThrottle.deleteMany({
            where: { expires_at: { lte: this.now() } },
        });
    }
}

export class MemoryThrottleService {
    constructor({ now = () => new Date(), entries = new Map() } = {}) {
        this.now = now;
        this.entries = entries;
    }

    async consume({ scope, subject, limit, windowMs }) {
        const now = this.now();
        const key = `${scope}:${subject}`;
        let state = this.entries.get(key);
        if (!state || state.expiresAt <= now.getTime()) {
            state = { count: 0, expiresAt: now.getTime() + windowMs };
        }
        state.count += 1;
        this.entries.set(key, state);
        if (state.count > limit) {
            throw new RateLimitExceededError(Math.max(1, Math.ceil((state.expiresAt - now.getTime()) / 1000)));
        }
        return state;
    }

    async purgeExpired() {
        const now = this.now().getTime();
        for (const [key, value] of this.entries) {
            if (value.expiresAt <= now) this.entries.delete(key);
        }
    }
}

export function createDefaultThrottle(appEnvironment = process.env.APP_ENV) {
    // La cuota compartida es obligatoria en producción. Desarrollo y pruebas no
    // deben depender de migraciones que deliberadamente aún no se aplican a la
    // base compartida.
    return appEnvironment === "production"
        ? new SecurityThrottleService()
        : new MemoryThrottleService();
}

const defaultThrottle = createDefaultThrottle();

export default defaultThrottle;
