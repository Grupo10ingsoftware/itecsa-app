import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

const REQUIRED_DATABASE_VARIABLES = [
    "DB_HOST",
    "DB_PORT",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
    "DB_SSL_CA_PATH",
];

let prisma;

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const serverRootDirectory = path.resolve(currentDirectory, "../..");

function readPrismaConfiguration() {
    const missingVariables = REQUIRED_DATABASE_VARIABLES.filter(
        (variable) => !process.env[variable]?.trim(),
    );

    if (missingVariables.length > 0) {
        throw new Error(
            `Faltan variables de entorno de base de datos: ${missingVariables.join(", ")}`,
        );
    }

    const port = Number(process.env.DB_PORT);

    if (!Number.isInteger(port) || port <= 0) {
        throw new Error("La variable de entorno DB_PORT debe ser un puerto valido.");
    }

    const sslCaPath = path.isAbsolute(process.env.DB_SSL_CA_PATH)
        ? process.env.DB_SSL_CA_PATH
        : path.resolve(serverRootDirectory, process.env.DB_SSL_CA_PATH);

    return {
        poolConfig: {
            host: process.env.DB_HOST.trim(),
            port,
            user: process.env.DB_USER.trim(),
            password: process.env.DB_PASSWORD,
            connectTimeout: 8000,
            ssl: {
                ca: fs.readFileSync(sslCaPath, "utf8"),
            },
            connectionLimit: 10,
        },
        options: {
            database: process.env.DB_NAME.trim(),
        },
    };
}

export function getPrismaClient() {
    if (!prisma) {
        const { poolConfig, options } = readPrismaConfiguration();
        const adapter = new PrismaMariaDb(poolConfig, options);
        prisma = new PrismaClient({ adapter });
    }

    return prisma;
}

export default getPrismaClient;
