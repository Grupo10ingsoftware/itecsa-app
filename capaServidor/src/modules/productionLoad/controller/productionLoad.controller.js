import ProductionLoadService from "../service/productionLoad.service.js";

export default class ProductionLoadController {
  constructor({ service } = {}) {
    this.service = service ?? new ProductionLoadService();
  }

  getToday = async (req, res) => {
    try {
      return res.status(200).json(await this.service.getDailyLoad({ date: req.query?.date }));
    } catch (error) {
      return res.status(error.statusCode ?? 500).json({
        message: error.message || "Error al consultar carga operativa.",
      });
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
      return res.status(error.statusCode ?? 500).json({
        message: error.message || "Error al guardar carga operativa.",
      });
    }
  };
}
