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
      const error = new Error("El ID del tipo de producto es obligatorio");
      error.statusCode = 400;
      throw error;
    }

    const productType = await this.repo.getById(productTypeId);

    if (!productType) {
      const error = new Error("Tipo de producto no encontrado");
      error.statusCode = 404;
      throw error;
    }

    return productType;
  }

  async createProductType(data) {
    const { nombre_producto } = data;

    if (!nombre_producto) {
      const error = new Error("El nombre del tipo de producto es obligatorio");
      error.statusCode = 400;
      throw error;
    }

    return this.repo.create(data);
  }

  async getProductTypeByName(nombreProducto) {
    if (!nombreProducto) {
      const error = new Error("El nombre del producto es obligatorio");
      error.statusCode = 400;
      throw error;
    }

    const productType = await this.repo.getByName(nombreProducto);

    if (!productType) {
      return this.repo.create({ nombre_producto: nombreProducto });
    }

    return productType;
  }

}

export default ProductTypeService;
