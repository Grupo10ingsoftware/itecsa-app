import { config } from "dotenv";
import Server from "../server.js";
<<<<<<< HEAD
import pinService from "../modules/auth/service/pin.service.js";
=======
import { resolveEnvironmentConfig } from "../config/environment.js";
>>>>>>> 98444449 (Se solucionan los hallazgos H03, H04 y H05)

config();

const requiredEnvironmentVariables = [
    "AUTH0_DOMAIN",
    "AUTH0_AUDIENCE",
    "FRONTEND_ORIGIN",
    "PIN_SECRET",
];

function validateEnvironment() {
    resolveEnvironmentConfig(process.env);

    const missingVariables = requiredEnvironmentVariables.filter(
        (variable) => !process.env[variable]?.trim(),
    );

    if (missingVariables.length > 0) {
        throw new Error(
            `Faltan variables de entorno obligatorias: ${missingVariables.join(", ")}`,
        );
    }
}

(async () => {
    try {
        validateEnvironment();
        void pinService.delivery; // Validate explicit provider/environment before listening.
        const server = new Server();
        await server.listen()
    } catch ( err ){
        console.log(' Fallo al iniciar la app:', err);
        process.exit(1);
        
    }
})();
