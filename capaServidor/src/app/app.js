import { config } from "dotenv";
import Server from "../server.js";

config();

(async () => {
    try {
        const server = new Server();
        await server.listen()
    } catch ( err ){
        console.log(' Fallo al iniciar la app:', err);
        process.exit(1);
        
    }
})();