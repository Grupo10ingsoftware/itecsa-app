import ProductionCapacityService from "../service/productionCapacity.service.js";

export default class ProductionCapacityController {
  constructor({ service } = {}) { this.service = service ?? new ProductionCapacityService(); }
  list = async (req, res) => {
    try { return res.status(200).json(await this.service.list()); }
    catch (error) { return res.status(error.statusCode ?? 500).json({ message: error.message || "Error al consultar capacidades." }); }
  };
  update = async (req, res) => {
    try { return res.status(200).json(await this.service.update(req.body?.capacities)); }
    catch (error) { return res.status(error.statusCode ?? 500).json({ message: error.message || "Error al guardar capacidades." }); }
  };
}
