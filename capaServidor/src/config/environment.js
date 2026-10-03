const VALID_NODE_ENVIRONMENTS = new Set(["development", "test", "production"]);
const VALID_DEMO_FLAGS = new Set(["true", "false"]);

export function resolveEnvironmentConfig(env = process.env) {
    const nodeEnv = env.NODE_ENV?.trim();

    if (!VALID_NODE_ENVIRONMENTS.has(nodeEnv)) {
        throw new Error(
            "NODE_ENV debe definirse explícitamente como development, test o production.",
        );
    }

    if (env.APP_ENV !== undefined && parseAppEnvironment(env.APP_ENV, { required: true }) !== nodeEnv) {
        throw new Error("APP_ENV y NODE_ENV deben coincidir.");
    }

    const demoFlag = env.ENABLE_DEMO_ROUTES;
    if (demoFlag !== undefined && !VALID_DEMO_FLAGS.has(demoFlag)) {
        throw new Error("ENABLE_DEMO_ROUTES solo admite true o false.");
    }

    const demoFeaturesEnabled = demoFlag === "true";
    if (nodeEnv === "production" && demoFeaturesEnabled) {
        throw new Error("ENABLE_DEMO_ROUTES no puede habilitarse en production.");
    }

    return Object.freeze({
        nodeEnv,
        demoFeaturesEnabled,
    });
}

export function isDemoFeatureEnabled(env = process.env) {
    return (
        (env.NODE_ENV === "development" || env.NODE_ENV === "test") &&
        env.ENABLE_DEMO_ROUTES === "true"
    );
}
const APP_ENVIRONMENTS = new Set(["development", "test", "production"]);

export function parseAppEnvironment(value, { required = false } = {}) {
    const normalized = String(value ?? "").trim().toLowerCase();

    if (!normalized && !required) return null;
    if (!APP_ENVIRONMENTS.has(normalized)) {
        throw new Error(
            "APP_ENV debe ser development, test o production.",
        );
    }

    return normalized;
}

export function currentAppEnvironment({ required = false } = {}) {
    return parseAppEnvironment(process.env.APP_ENV, { required });
}

export function parseTrustedProxy(value) {
    const normalized = String(value ?? "").trim();
    if (!normalized) return false;
    if (normalized === "loopback") return "loopback";

    const hops = Number(normalized);
    if (Number.isInteger(hops) && hops >= 0 && hops <= 5) return hops;

    throw new Error("TRUST_PROXY debe ser loopback o un numero entre 0 y 5.");
}
