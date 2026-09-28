import ProductionLoadService from "../service/productionLoad.service.js";
import { sendControllerError } from "../../../shared/httpResponse.js";

export default class ProductionLoadController {
  constructor({ service } = {}) {
    this.service = service ?? new ProductionLoadService();
  }

  getToday = async (req, res) => {
    try {
      return res.status(200).json(await this.service.getDailyLoad({ date: req.query?.date }));
    } catch (error) {
      return sendControllerError(req, res, error, "No fue posible consultar la carga operativa.");
    }
  };

  saveToday = async (req, res) => {
    try {
      return res.status(200).json(await this.service.saveDailyLoad({
        date: req.body?.date,
        entries: req.body?.entries,
        auth0UserId: req.auth?.payload?.sub,
      }));
    } catch (error) {
      return sendControllerError(req, res, error, "No fue posible guardar la carga operativa.");
    }
  };
}
