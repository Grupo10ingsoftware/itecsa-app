import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const REQUIRED_DATABASE_VARIABLES = [
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "DB_SSL_CA_PATH",
];

let pool;

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const serverRootDirectory = path.resolve(currentDirectory, "../..");

function readDatabaseConfiguration() {
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
    host: process.env.DB_HOST.trim(),
    port,
    user: process.env.DB_USER.trim(),
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME.trim(),
    ssl: {
      ca: fs.readFileSync(sslCaPath),
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

export function getPool() {
  if (!pool) {
    pool = mysql.createPool(readDatabaseConfiguration());
  }

  return pool;
}

export async function checkDatabaseConnection() {
  const [rows] = await getPool().execute("SELECT 1 AS ok");

  return rows?.[0]?.ok === 1;
}

export default {
  execute(...args) {
    return getPool().execute(...args);
  },
  query(...args) {
    return getPool().query(...args);
  },
};
