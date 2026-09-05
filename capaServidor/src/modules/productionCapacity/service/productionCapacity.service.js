import ProductionCapacityRepository from "../repo/productionCapacity.repo.js";

const map = (item) => ({ id: item.id_tipo_producto, productType: item.nombre_producto, capacity: item.capacidad_diaria ?? 0 });

export default class ProductionCapacityService {
  constructor({ repo } = {}) { this.repo = repo ?? new ProductionCapacityRepository(); }
  async list() { return (await this.repo.list()).map(map); }
  async update(capacities) {
    if (!Array.isArray(capacities) || capacities.length === 0) {
      const error = new Error("Debe ingresar capacidades productivas."); error.statusCode = 400; throw error;
    }
    const values = capacities.map(({ id, capacity }) => ({ id: Number(id), capacity: Number(capacity) }));
    if (values.length !== 1 || values.some(({ id, capacity }) => !Number.isInteger(id) || !Number.isInteger(capacity) || capacity <= 0 || capacity > 10000)) {
      const error = new Error("La capacidad de Lanyard debe ser un entero entre 1 y 10000."); error.statusCode = 400; throw error;
    }
    return (await this.repo.updateMany(values)).map(map);
  }
}
