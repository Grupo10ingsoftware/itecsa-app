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

export function isNonProductionEnvironment() {
    const environment = currentAppEnvironment();
    return environment === "development" || environment === "test";
}

export function parseBooleanEnvironment(value, fallback = false) {
    if (value === undefined || value === null || value === "") return fallback;
    if (value === "true") return true;
    if (value === "false") return false;
    throw new Error("La variable booleana debe ser true o false.");
}

export function parseTrustedProxy(value) {
    const normalized = String(value ?? "").trim();
    if (!normalized) return false;
    if (normalized === "loopback") return "loopback";

    const hops = Number(normalized);
    if (Number.isInteger(hops) && hops >= 0 && hops <= 5) return hops;

    throw new Error("TRUST_PROXY debe ser loopback o un numero entre 0 y 5.");
}

export { APP_ENVIRONMENTS };
