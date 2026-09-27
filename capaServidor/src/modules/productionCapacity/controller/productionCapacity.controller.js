import ProductionCapacityService from "../service/productionCapacity.service.js";
import { sendControllerError } from "../../../shared/httpResponse.js";

export default class ProductionCapacityController {
  constructor({ service } = {}) { this.service = service ?? new ProductionCapacityService(); }
  list = async (req, res) => {
    try { return res.status(200).json(await this.service.list()); }
    catch (error) { return sendControllerError(req, res, error, "No fue posible consultar las capacidades."); }
  };
  update = async (req, res) => {
    try { return res.status(200).json(await this.service.update(req.body?.capacities)); }
    catch (error) { return sendControllerError(req, res, error, "No fue posible guardar las capacidades."); }
  };
}
