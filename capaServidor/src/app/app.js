import { config } from "dotenv";
import Server from "../server.js";
import pinService from "../modules/auth/service/pin.service.js";

config();

const requiredEnvironmentVariables = [
    "AUTH0_DOMAIN",
    "AUTH0_AUDIENCE",
    "FRONTEND_ORIGIN",
    "PIN_SECRET",
];

function validateEnvironment() {
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
