import {
  KANBAN_EN_PRODUCCION_STEP,
  KANBAN_MOVE_TO_PRODUCTION_PERMISSION_MESSAGE,
  MOVE_KANBAN_TO_PRODUCTION_PERMISSION,
  PAYMENT_CONFIRMATION_REQUIRED_MESSAGE,
  PAYMENT_STATUS,
} from "../../../config/status.js";


import OrderRepository from "../repo/orders.repo.js";
import ClientRepo from "../../clients/repo/clients.repo.js";
import ClientService from "../../clients/service/clients.service.js";
import OrderDetailRepo from "../repo/orderDetail.repo.js";
import OrderDetailService from "./orderDetail.service.js";
import ProductTypeRepo from "../../products/repo/product.repo.js";
import ProductTypeService from "../../products/service/product.service.js";
import PaymentRecordRepo from "../../payments/repo/paymentRecord.repo.js";
import PaymentRecordService from "../../payments/service/paymentRecord.service.js";
import PaymentStatusRepo from "../../payments/repo/paymentStatus.repo.js";
import defaultUserRepository from "../../users/repo/users.repo.js";
import getPrismaClient from "../../../database/prisma.js";

class OrderService {

  constructor({
    repo,
    clientService,
    orderDetailService,
    productTypeService,
    paymentRecordService,
    paymentRepo,
    userRepo,
    prisma,
  } = {}) {
    this.repo = repo ?? new OrderRepository();
    this.clientService = clientService ?? new ClientService();
    this.orderDetailService = orderDetailService ?? new OrderDetailService();
    this.productTypeService = productTypeService ?? new ProductTypeService();
    this.paymentRecordService = paymentRecordService ?? new PaymentRecordService();
    this.paymentRepo = paymentRepo ?? new PaymentStatusRepo();
    this.userRepo = userRepo ?? defaultUserRepository;
    this.prisma = prisma;
    this.hasInjectedDependencies = Boolean(
      repo ||
      clientService ||
      orderDetailService ||
      productTypeService ||
      paymentRecordService ||
      paymentRepo
    );
  }

  get client() {
    if (!this.prisma) {
      this.prisma = getPrismaClient();
    }

    return this.prisma;
  }

  async runInTransaction(callback) {
    if (this.hasInjectedDependencies) {
      return callback({
        repo: this.repo,
        clientService: this.clientService,
        orderDetailService: this.orderDetailService,
        productTypeService: this.productTypeService,
        paymentRecordService: this.paymentRecordService,
        paymentRepo: this.paymentRepo,
      });
    }

    return this.client.$transaction((tx) => callback({
      repo: new OrderRepository({ prisma: tx }),
      clientService: new ClientService({
        repo: new ClientRepo({ prisma: tx }),
      }),
      orderDetailService: new OrderDetailService({
        repo: new OrderDetailRepo({ prisma: tx }),
      }),
      productTypeService: new ProductTypeService({
        repo: new ProductTypeRepo({ prisma: tx }),
      }),
      paymentRecordService: new PaymentRecordService({
        repo: new PaymentRecordRepo({ prisma: tx }),
      }),
      paymentRepo: new PaymentStatusRepo({ prisma: tx }),
    }));
  }
  async updGeneralStep(orderId, stepId, options = {}) {
    if (!orderId) {
      const error = new Error("El ID del pedido es obligatorio");
      error.statusCode = 400;
      throw error;
    }

    if (stepId === undefined || stepId === null) {
      const error = new Error("La etapa destino es obligatoria");
      error.statusCode = 400;
      throw error;
    }

    const order = await this.repo.get(orderId);

    if (!order) {
      const error = new Error("Pedido no encontrado");
      error.statusCode = 404;
      throw error;
    }

    const currentStep = Number(order.id_etapa_general);
    const nextStep = Number(stepId);

    if (!Number.isInteger(nextStep)) {
      const error = new Error("Etapa no valida");
      error.statusCode = 400;
      throw error;
    }

    if (nextStep < currentStep) {
      const error = new Error("No puedes retroceder en las etapas del pedido");
      error.statusCode = 409;
      throw error;
    }

    const isMoveToProduction =
      currentStep < nextStep && nextStep === KANBAN_EN_PRODUCCION_STEP;
    const permissions = options.permissions;

    if (
      isMoveToProduction &&
      (!Array.isArray(permissions) ||
        !permissions.includes(MOVE_KANBAN_TO_PRODUCTION_PERMISSION))
    ) {
      const error = new Error(KANBAN_MOVE_TO_PRODUCTION_PERMISSION_MESSAGE);
      error.statusCode = 403;
      throw error;
    }

    if (order.estado_pago !== PAYMENT_STATUS.CONFIRMADO) {
      throw new Error(PAYMENT_CONFIRMATION_REQUIRED_MESSAGE);
    }

    return this.repo.updateGeneralStep(orderId, nextStep);
  }

  async getAllOrders() {
    return this.repo.getAllOrders();
  }

  async resolveInternalUserId({ auth0UserId, id_usuario } = {}) {
    if (auth0UserId) {
      const user = await this.userRepo.findByAuth0Id(auth0UserId);

      if (!user?.idUsuario) {
        const error = new Error("No existe un usuario interno vinculado a la sesion.");
        error.statusCode = 403;
        throw error;
      }

      return user.idUsuario;
    }

    if (id_usuario) {
      return id_usuario;
    }

    const error = new Error("El usuario autenticado es obligatorio para registrar el pago.");
    error.statusCode = 400;
    throw error;
  }

 async updPaymentState(orderId, newPaymentStatusId, data = {}) {
    const {
      auth0UserId,
      id_usuario,
      observacion,
    } = data;

    const paymentStatusId = Number(newPaymentStatusId);

    if (!Number.isInteger(paymentStatusId)) {
      const error = new Error("El estado de pago no es valido.");
      error.statusCode = 400;
      throw error;
    }

    const paymentStatus = await this.paymentRepo.get(paymentStatusId);

    if (!paymentStatus) {
      const error = new Error("Estado de pago no encontrado.");
      error.statusCode = 404;
      throw error;
    }

    const KANBAN_CONFIRMACION_PAGO = 0;
    const KANBAN_LISTO_PRODUCCION = 1;
    const resolvedUserId = await this.resolveInternalUserId({
      auth0UserId,
      id_usuario,
    });

    const nextKanbanOrder =
      paymentStatus.nombre_estado_pago === PAYMENT_STATUS.CONFIRMADO
        ? KANBAN_LISTO_PRODUCCION
        : KANBAN_CONFIRMACION_PAGO;

    return this.runInTransaction(async ({ repo, paymentRecordService }) => {
      const updatedOrder = await repo.updatePaymentStatus(
        orderId,
        paymentStatusId,
        nextKanbanOrder,
      );

      if (!updatedOrder) return null;

      await paymentRecordService.createPaymentRecord(orderId, {
        id_usuario: resolvedUserId,
        id_estado_pago: paymentStatusId,
        observacion,
      });

      return updatedOrder;
    });
  }






  async createOrder(data) {
    const {
      rut_cliente,
      nombre_cliente,
      razon_social,
      estado_cliente,
      id_usuario,
      id_etiqueta,
      productos,
    } = data;

    if (
      !id_usuario ||
      !rut_cliente ||
      !Array.isArray(productos) ||
      productos.length === 0
    ) {
      const error = new Error("Faltan datos obligatorios para crear el pedido.");
      error.statusCode = 400;
      throw error;
    }

    return this.runInTransaction(async ({
      repo,
      clientService,
      orderDetailService,
      productTypeService,
    }) => {
      const client = await clientService.findOrCreateClient({
        rut_cliente,
        nombre_cliente,
        razon_social,
        estado_cliente,
      });

      if (!client?.id_cliente) {
        const error = new Error("No se pudo resolver el cliente del pedido.");
        error.statusCode = 500;
        throw error;
      }

      const id_estado_pago = 1;
      const id_estado_pedido = 1;

      const fecha_estimada_termino = productos.reduce((latestDate, product) => {
        if (!product.fecha_estimada_termino) return latestDate;
        if (!latestDate) return product.fecha_estimada_termino;

        return new Date(product.fecha_estimada_termino) > new Date(latestDate)
          ? product.fecha_estimada_termino
          : latestDate;
      }, null);

      const order = await repo.create({
        id_cliente: client.id_cliente,
        id_usuario,
        id_estado_pedido,
        id_estado_pago,
        id_etiqueta,
        fecha_estimada_termino,
      });

      if (!order?.id_pedido) {
        const error = new Error("No se pudo crear el pedido.");
        error.statusCode = 500;
        throw error;
      }

      const details = [];

      for (const product of productos) {
        const { nombre_producto, cantidad, fecha_estimada_termino } = product;

        if (!nombre_producto || cantidad === undefined) {
          const error = new Error("Faltan datos obligatorios en un detalle del pedido.");
          error.statusCode = 400;
          throw error;
        }

        const productType = await productTypeService.getProductTypeByName(
          nombre_producto,
        );

        const detail = await orderDetailService.createOrderDetail(order.id_pedido, {
          id_tipo_producto: productType.id_tipo_producto,
          cantidad,
          fecha_estimada_termino: fecha_estimada_termino ?? null,
          fecha_real_termino: null,
        });

        details.push(detail);
      }

      return {
        ...order,
        detalles: details,
      };
    });
  }

  async getOrderById(orderId) {
    if (!orderId) {
      const error = new Error("El ID del pedido es obligatorio");
      error.statusCode = 400;
      throw error;
    }

    const order = await this.repo.get(orderId);

    if (!order) {
      const error = new Error("Pedido no encontrado");
      error.statusCode = 404;
      throw error;
    }

    return order;
  }

}

export default OrderService;
