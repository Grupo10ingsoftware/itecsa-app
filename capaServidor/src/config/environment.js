const VALID_NODE_ENVIRONMENTS = new Set(["development", "test", "production"]);
const VALID_DEMO_FLAGS = new Set(["true", "false"]);

export function resolveEnvironmentConfig(env = process.env) {
    const nodeEnv = env.NODE_ENV?.trim();

    if (!VALID_NODE_ENVIRONMENTS.has(nodeEnv)) {
        throw new Error(
            "NODE_ENV debe definirse explícitamente como development, test o production.",
        );
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
