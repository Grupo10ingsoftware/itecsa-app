import { Router } from "express";
import { checkDatabaseConnection } from "../../../database/prisma.js";
import { timingSafeEqual } from "node:crypto";

export function createHealthRouter({ version = process.env.APP_VERSION || "development" } = {}) {
  const router = Router();

  router.get("/live", (_req, res) => {
    res.set("Cache-Control", "no-store");
    return res.status(200).json({ status: "ok", version });
  });

  return router;
}

function tokenMatches(received, expected) {
  const receivedBuffer = Buffer.from(String(received ?? ""));
  const expectedBuffer = Buffer.from(String(expected ?? ""));
  return receivedBuffer.length === expectedBuffer.length &&
    receivedBuffer.length > 0 && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function createInternalHealthRouter({
  enabled = process.env.ENABLE_INTERNAL_READINESS === "true",
  token = process.env.INTERNAL_HEALTH_TOKEN,
  checkDatabase = checkDatabaseConnection,
  logger = { error() {} },
} = {}) {
  const router = Router();

  router.get("/ready", async (req, res) => {
    if (!enabled || !tokenMatches(req.get("X-Health-Token"), token)) {
      return res.status(404).json({ message: "Recurso no encontrado." });
    }

    try {
      const isConnected = await checkDatabase();

      if (!isConnected) {
        return res.status(500).json({
          code: "INTERNAL_ERROR",
          message: "No fue posible conectar con la base de datos.",
          requestId: req.requestId,
        });
      }

      return res.status(200).json({
        status: "ok",
        database: "mysql",
      });
    } catch (error) {
      logger.error?.("health.database_unavailable", {
        requestId: req.requestId,
        code: error?.code ?? "DATABASE_HEALTHCHECK_ERROR",
        outcome: "error",
      });

      return res.status(500).json({
        code: "INTERNAL_ERROR",
        message: "No fue posible conectar con la base de datos.",
        requestId: req.requestId,
      });
    }
  });

  return router;
}

export default createHealthRouter();
