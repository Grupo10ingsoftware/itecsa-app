import { request, response } from "express";

import { calculateOperationalLoadByDate } from "../service/operationalLoad.service.js";
import { sendControllerError } from "../../../shared/httpResponse.js";

class ProductionCalendarController {
  calculateOperationalLoad = (req = request, res = response) => {
    try {
      const result = calculateOperationalLoadByDate({
        from: req.body?.from,
        items: req.body?.items,
        to: req.body?.to,
      });

      return res.status(200).json(result);
    } catch (error) {
      return sendControllerError(req, res, error, "No fue posible calcular la carga operativa.");
    }
  };
}

export default ProductionCalendarController;
