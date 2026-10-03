import { AppError } from "../../../errors/AppError.js";
import ProductTypeRepo from "../repo/product.repo.js";

class ProductTypeService {
  constructor({ repo } = {}) {
    this.repo = repo ?? new ProductTypeRepo();
  }

  async getProductTypes() {
    return this.repo.getAll();
  }

  async getProductTypeById(productTypeId) {
    if (!productTypeId) {
      const error = new AppError(400, "El ID del tipo de producto es obligatorio");
      throw error;
    }

    const productType = await this.repo.getById(productTypeId);

    if (!productType) {
      const error = new AppError(404, "Tipo de producto no encontrado");
      throw error;
    }

    return productType;
  }

  async createProductType(data) {
    const { nombre_producto } = data;

    if (!nombre_producto) {
      const error = new AppError(400, "El nombre del tipo de producto es obligatorio");
      throw error;
    }

    return this.repo.create(data);
  }

  async getProductTypeByName(nombreProducto) {
    if (!nombreProducto) {
      const error = new AppError(400, "El nombre del producto es obligatorio");
      throw error;
    }

    const productType = await this.repo.getByName(nombreProducto);

    if (!productType) {
      const error = new AppError(404, "Tipo de producto no encontrado");
      throw error;
    }

    return productType;
}

}

export default ProductTypeService;
