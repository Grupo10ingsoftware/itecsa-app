import { Router } from "express";
import { checkDatabaseConnection } from "../../../database/prisma.js";

export function createHealthRouter({
  checkDatabase = checkDatabaseConnection,
  logError = console.error,
  version = process.env.APP_VERSION || 'development',
} = {}) {
  const router = Router();

  router.get('/live', (req, res) => {
    res.set('Cache-Control', 'no-store');
    return res.status(200).json({ status: 'ok', version });
  });

  router.get("/db", async (req, res) => {
    try {
      const isConnected = await checkDatabase();

      if (!isConnected) {
        return res.status(500).json({
          message: "No fue posible conectar con la base de datos.",
        });
      }

      return res.status(200).json({
        status: "ok",
        database: "mysql",
      });
    } catch (error) {
      logError(
        "Fallo healthcheck de base de datos:",
        error?.code ?? error?.name ?? "DATABASE_HEALTHCHECK_ERROR",
      );

      return res.status(500).json({
        message: "No fue posible conectar con la base de datos.",
      });
    }
  });

  return router;
}

export default createHealthRouter();
