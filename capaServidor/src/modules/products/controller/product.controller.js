import { respondError } from "../../../errors/httpErrors.js";
import { request, response } from "express";
import ProductTypeService from "../service/product.service.js";

class ProductTypeController {
  constructor() {
    this.service = new ProductTypeService();
  }

  getProductTypes = async (req = request, res = response) => {
    try {
      const productTypes = await this.service.getProductTypes();

      res.status(200).json(productTypes);
    } catch (error) {
        return respondError(error, req, res);
    }
  };

  getProductTypeById = async (req = request, res = response) => {
    try {
      const { productTypeId } = req.params;

      const productType = await this.service.getProductTypeById(productTypeId);

      res.status(200).json(productType);
    } catch (error) {
        return respondError(error, req, res);
    }
  };

  postProductType = async (req = request, res = response) => {
    try {
      const productType = await this.service.createProductType(req.body ?? {});

      res.status(201).json(productType);
    } catch (error) {
        return respondError(error, req, res);
    }
  };



  getProductTypeByName = async (req = request, res = response) => {
    try {
      const { nombreProducto } = req.params;

      const productType = await this.service.getProductTypeByName(nombreProducto);

      res.status(200).json(productType);
    } catch (error) {
        return respondError(error, req, res);
    }
  };
}

export default ProductTypeController;