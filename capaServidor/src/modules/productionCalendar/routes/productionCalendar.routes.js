import { Router } from "express";

import checkJwt from "../../../middlewares/checkJwt.js";
import ProductionCalendarController from "../controller/productionCalendar.controller.js";

export function createProductionCalendarRouter({
  authenticate = checkJwt,
  controller = new ProductionCalendarController(),
} = {}) {
  const router = Router();

  // Calcula la carga operativa diaria de lanyards repartiendo cada pedido en los dias habiles previos a su entrega.
  // Hoy recibe pedidos desde el cliente para soportar mocks; luego puede leerlos directo desde Prisma/MySQL.
  router.post("/operational-load", authenticate, controller.calculateOperationalLoad);

  return router;
}

export default createProductionCalendarRouter();
