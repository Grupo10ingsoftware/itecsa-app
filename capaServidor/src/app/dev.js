import { config } from "dotenv";

config();

if (!process.env.NODE_ENV?.trim()) {
    process.env.NODE_ENV = "development";
}

await import("./app.js");
