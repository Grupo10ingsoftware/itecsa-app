import OrderRepository from "../repo/orders.repo.js";
import ClientRepo from "../../clients/repo/clients.repo.js";
import ClientService from "../../clients/service/clients.service.js";
import OrderDetailRepo from "../repo/orderDetail.repo.js";
import OrderDetailService from "./orderDetail.service.js";
import ProductTypeRepo from "../../products/repo/product.repo.js";
import ProductTypeService from "../../products/service/product.service.js";

// La inyeccion de fuente/repositorios nunca desactiva esta transaccion.
// Los tests pueden proporcionar explicitamente otra unidad de trabajo.
export function createSalesOrderTransaction(getClient) {
  return (operation) => getClient().$transaction((tx) => operation({
    repo: new OrderRepository({ prisma: tx }),
    clientService: new ClientService({ repo: new ClientRepo({ prisma: tx }) }),
    orderDetailService: new OrderDetailService({ repo: new OrderDetailRepo({ prisma: tx }) }),
    productTypeService: new ProductTypeService({ repo: new ProductTypeRepo({ prisma: tx }) }),
    repoClient: tx,
  }), { timeout: 20000, maxWait: 10000 });
}
