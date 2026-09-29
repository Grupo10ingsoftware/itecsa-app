import { respondError } from "../../../errors/httpErrors.js";
import { request, response } from "express";

import { calculateOperationalLoadByDate } from "../service/operationalLoad.service.js";

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
        return respondError(error, req, res);
    }
  };
}

export default ProductionCalendarController;
