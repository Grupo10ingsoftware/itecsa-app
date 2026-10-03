import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const REQUIRED_DATABASE_VARIABLES = [
    "DB_HOST",
    "DB_PORT",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
];

let prisma;

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const serverRootDirectory = path.resolve(currentDirectory, "../..");
const require = createRequire(import.meta.url);

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
    const connectTimeout = Number(process.env.DB_CONNECT_TIMEOUT_MS ?? 8000);
    const socketTimeout = Number(process.env.DB_QUERY_TIMEOUT_MS ?? 15000);

    if (!Number.isInteger(port) || port <= 0) {
        throw new Error("La variable de entorno DB_PORT debe ser un puerto valido.");
    }
    if (!Number.isInteger(connectTimeout) || connectTimeout < 1000 || !Number.isInteger(socketTimeout) || socketTimeout < 1000) {
        throw new Error("Los timeouts de base de datos deben ser enteros de al menos 1000 ms.");
    }

    const sslMode = process.env.DB_SSL_MODE ?? "required";
    if (sslMode === "disabled" && process.env.APP_ENV !== "test") {
        throw new Error("DB_SSL_MODE=disabled sólo se permite en APP_ENV=test.");
    }
    if (!new Set(["required", "disabled"]).has(sslMode)) {
        throw new Error("DB_SSL_MODE debe ser required o disabled.");
    }
    if (sslMode === "required" && !process.env.DB_SSL_CA_PATH?.trim()) {
        throw new Error("DB_SSL_CA_PATH es obligatorio cuando TLS está habilitado.");
    }
    const sslCaPath = sslMode === "required" && (path.isAbsolute(process.env.DB_SSL_CA_PATH)
        ? process.env.DB_SSL_CA_PATH
        : path.resolve(serverRootDirectory, process.env.DB_SSL_CA_PATH));

    return {
        host: process.env.DB_HOST.trim(),
        port,
        user: process.env.DB_USER.trim(),
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME.trim(),
        connectTimeout,
        socketTimeout,
        ...(sslMode === "required" ? { ssl: { ca: fs.readFileSync(sslCaPath, "utf8") } } : {}),
        connectionLimit: 10,
    };
}

export function getPrismaClient() {
    if (!prisma) {
        const adapter = new PrismaMariaDb(readPrismaConfiguration());
        const { PrismaClient } = require("@prisma/client");
        prisma = new PrismaClient({ adapter });
    }

    return prisma;
}

export async function checkDatabaseConnection() {
    const rows = await getPrismaClient().$queryRaw`SELECT 1 AS ok`;

    return rows?.[0]?.ok === 1 || rows?.[0]?.ok === 1n;
}

export async function disconnectPrismaClient() {
    if (!prisma) return;

    await prisma.$disconnect();
    prisma = undefined;
}

export default getPrismaClient;
