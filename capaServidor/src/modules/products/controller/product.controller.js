import { request, response } from "express";
import ProductTypeService from "../service/product.service.js";
import { sendControllerError } from "../../../shared/httpResponse.js";

class ProductTypeController {
  constructor() {
    this.service = new ProductTypeService();
  }

  getProductTypes = async (req = request, res = response) => {
    try {
      const productTypes = await this.service.getProductTypes();

      res.status(200).json(productTypes);
    } catch (error) {
      return sendControllerError(req, res, error, "Error al obtener tipos de producto");
    }
  };

  getProductTypeById = async (req = request, res = response) => {
    try {
      const { productTypeId } = req.params;

      const productType = await this.service.getProductTypeById(productTypeId);

      res.status(200).json(productType);
    } catch (error) {
      return sendControllerError(req, res, error, "Error al obtener tipo de producto");
    }
  };

  postProductType = async (req = request, res = response) => {
    try {
      const productType = await this.service.createProductType(req.body ?? {});

      res.status(201).json(productType);
    } catch (error) {
      return sendControllerError(req, res, error, "Error al crear tipo de producto");
    }
  };



  getProductTypeByName = async (req = request, res = response) => {
    try {
      const { nombreProducto } = req.params;

      const productType = await this.service.getProductTypeByName(nombreProducto);

      res.status(200).json(productType);
    } catch (error) {
      return sendControllerError(req, res, error, "Error al obtener tipo de producto por nombre");
    }
  };
}

export default ProductTypeController;
