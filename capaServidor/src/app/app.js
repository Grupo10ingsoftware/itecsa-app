import { config } from "dotenv";
import Server from "../server.js";

config();

const requiredEnvironmentVariables = [
    "AUTH0_DOMAIN",
    "AUTH0_AUDIENCE",
    "FRONTEND_ORIGIN",
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
        const server = new Server();
        await server.listen()
    } catch ( err ){
        console.log(' Fallo al iniciar la app:', err);
        process.exit(1);
        
    }
})();
