import "dotenv/config";
import Server from "../server.js";
import { disconnectPrismaClient } from "../database/prisma.js";
import { registerShutdown } from './shutdown.js';
import pinService from "../modules/auth/service/pin.service.js";
import { resolveEnvironmentConfig } from "../config/environment.js";
import { currentAppEnvironment } from "../config/environment.js";
import { safeLogger } from "../shared/safeLogger.js";
import { startTemporaryDataCleanup } from "../modules/security/service/temporaryDataCleanup.service.js";

const requiredEnvironmentVariables = [
    "AUTH0_DOMAIN",
    "AUTH0_AUDIENCE",
    "FRONTEND_ORIGIN",
    "PIN_SECRET",
    "APP_ENV",
    "RATE_LIMIT_SECRET",
    "SECURITY_LOG_HMAC_KEY",
];

function validateEnvironment() {
    resolveEnvironmentConfig(process.env);

    const appEnvironment = currentAppEnvironment({ required: true });
    const missingVariables = requiredEnvironmentVariables.filter(
        (variable) => !process.env[variable]?.trim(),
    );

    if (missingVariables.length > 0) {
        throw new Error(
            `Faltan variables de entorno obligatorias: ${missingVariables.join(", ")}`,
        );
    }

    if (appEnvironment === "production" && process.env.ENABLE_INTERNAL_READINESS === "true" && !process.env.INTERNAL_HEALTH_TOKEN?.trim()) {
        throw new Error("INTERNAL_HEALTH_TOKEN es obligatorio al habilitar readiness.");
    }
}

(async () => {
    try {
        void pinService.delivery;
        validateEnvironment();
        const appEnvironment = currentAppEnvironment({ required: true });
        const server = new Server({ appEnvironment });
        const httpServer = await server.listen();
        const stopCleanup = appEnvironment === "production" ? startTemporaryDataCleanup() : () => {};
        registerShutdown(httpServer, async () => {
            stopCleanup();
            await disconnectPrismaClient();
        });
    } catch ( err ){
        safeLogger.error("server.start_failed", { code: err?.code ?? "START_FAILED", outcome: "error" });
        process.exit(1);
        
    }
})();
