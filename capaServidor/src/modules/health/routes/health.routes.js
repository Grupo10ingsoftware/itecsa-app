import { respondError } from "../../../errors/httpErrors.js";
import { Router } from "express";
import { checkDatabaseConnection } from "../../../database/prisma.js";

export function createHealthRouter({
  checkDatabase = checkDatabaseConnection,
  logError = console.error,
} = {}) {
  const router = Router();

  router.get("/db", async (req, res) => {
    try {
      const isConnected = await checkDatabase();

      if (!isConnected) {
        return respondError(new Error(), req, res, { logger: { error: logError } });
      }

      return res.status(200).json({
        status: "ok",
        database: "mysql",
      });
    } catch (error) {
      return respondError(error, req, res, { logger: { error: logError } });
    }
  });

  return router;
}

export default createHealthRouter();
