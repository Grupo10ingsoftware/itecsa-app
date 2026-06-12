import { Router } from "express";

import checkJwt from "../../../middlewares/checkJwt.js";
import ProductTypeController from "../controller/product.controller.js";

export function createProductTypeRouter({
  authenticate = checkJwt,
  controller = new ProductTypeController(),
} = {}) {
  const router = Router();

  router.get("/", authenticate, controller.getProductTypes);
  router.get("/name/:nombreProducto", authenticate, controller.getProductTypeByName);
  router.get("/:productTypeId", authenticate, controller.getProductTypeById);
  router.post("/", authenticate, controller.postProductType);

  return router;
}

export default createProductTypeRouter();