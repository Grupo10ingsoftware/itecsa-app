import {
  KANBAN_EN_PRODUCCION_STEP,
  KANBAN_MOVE_TO_PRODUCTION_PERMISSION_MESSAGE,
  KANBAN_STAGE_SKIP_MESSAGE,
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
import SalesNoteSourceService from "./salesNoteSource.service.js";

export const CONFIRMED_PAYMENT_STATUS_LOCKED_MESSAGE =
  "No se puede cambiar el estado de un pago confirmado.";

function toPrismaDate(value) {
  if (!value) return null;

  return new Date(`${value}T00:00:00.000Z`);
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeQuantity(value) {
  const quantity = Number(value);

  return Number.isFinite(quantity) ? quantity : null;
}

function normalizePriorityLabels(priority) {
  if (!priority) return [];

  const priorities = Array.isArray(priority) ? priority : [priority];
  const labelNames = new Set();

  for (const item of priorities) {
    if (item === "urgent") labelNames.add("Urgencia");
    if (item === "contract") labelNames.add("Prioridad por contrato");
  }

  return [...labelNames];
}

function normalizeProductionItems(items = []) {
  return items.map((item) => ({
    codigo: item.codigo ?? null,
    producto: item.producto ?? null,
    cantidad: normalizeQuantity(item.cantidad),
    familia: item.familia ?? null,
    subfamilia: item.subfamilia ?? null,
    tipoProducto: item.tipoProducto ?? item.nombre_producto ?? null,
  }));
}

function normalizeUntrackedItems(items = []) {
  return items
    .map((item) => ({
      codigo: item.codigo ?? null,
      producto: item.producto ?? null,
      cantidad: normalizeQuantity(item.cantidad),
      subfamilia: item.subfamilia ?? null,
    }))
    .filter((item) => normalizeText(item.producto));
}

class OrderService {
  constructor({
    repo,
    clientService,
    orderDetailService,
    productTypeService,
    paymentRecordService,
    paymentRepo,
    userRepo,
    salesNoteSourceService,
    repoClient,
    prisma,
  } = {}) {
    this.repo = repo ?? new OrderRepository();
    this.clientService = clientService ?? new ClientService();
    this.orderDetailService = orderDetailService ?? new OrderDetailService();
    this.productTypeService = productTypeService ?? new ProductTypeService();
    this.paymentRecordService = paymentRecordService ?? new PaymentRecordService();
    this.paymentRepo = paymentRepo ?? new PaymentStatusRepo();
    this.userRepo = userRepo ?? defaultUserRepository;
    this.salesNoteSourceService =
      salesNoteSourceService ?? new SalesNoteSourceService();
    this.repoClient = repoClient ?? null;
    this.prisma = prisma;
    this.hasInjectedDependencies = Boolean(
      repo ||
        clientService ||
        orderDetailService ||
        productTypeService ||
        paymentRecordService ||
        paymentRepo ||
        salesNoteSourceService,
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
        repoClient: this.repoClient,
      });
    }

    return this.client.$transaction(
      (tx) => callback({
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
        repoClient: tx,
      }),
      {
        timeout: 20000,
        maxWait: 10000,
      },
    );
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

    if (nextStep === currentStep) {
      return order;
    }

    if (nextStep !== currentStep + 1) {
      const error = new Error(KANBAN_STAGE_SKIP_MESSAGE);
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

    if (!options.actor?.idUsuario) {
      const error = new Error("El usuario validado por PIN es obligatorio.");
      error.statusCode = 403;
      throw error;
    }

    return this.runInTransaction(({ repo }) => repo.updateGeneralStep(
      orderId,
      nextStep,
      {
        userId: options.actor.idUsuario,
        comment: options.comment,
      },
    ));
  }

  async sendToReview(orderId, comment, { auth0UserId } = {}) {
    const normalizedComment = typeof comment === "string" ? comment.trim() : "";
    if (!normalizedComment) {
      const error = new Error("El comentario de revision es obligatorio.");
      error.statusCode = 400;
      throw error;
    }

    if (normalizedComment.length > 2000) {
      const error = new Error("El comentario de revision no puede superar 2000 caracteres.");
      error.statusCode = 400;
      throw error;
    }

    const currentOrder = await this.repo.get(orderId);
    if (!currentOrder) {
      const error = new Error("Pedido no encontrado.");
      error.statusCode = 404;
      throw error;
    }

    if (Number(currentOrder.id_etapa_general) !== 1) {
      const error = new Error("Solo se puede enviar a revision un pedido Listo para Produccion.");
      error.statusCode = 409;
      throw error;
    }

    const userId = await this.resolveInternalUserId({ auth0UserId });
    return this.runInTransaction(async ({ repo }) => {
      const updatedOrder = await repo.sendToReview(orderId, {
        userId,
        comment: normalizedComment,
      });
      if (!updatedOrder) {
        const error = new Error("Pedido o estado En revisión no encontrado.");
        error.statusCode = 404;
        throw error;
      }
      return updatedOrder;
    });
  }

  async cancelProduction(orderId, comment, { actor } = {}) {
    const normalizedComment = typeof comment === "string" ? comment.trim() : "";
    if (!normalizedComment) {
      const error = new Error("La observacion de cancelacion es obligatoria.");
      error.statusCode = 400;
      throw error;
    }

    if (normalizedComment.length > 2000) {
      const error = new Error("La observacion no puede superar 2000 caracteres.");
      error.statusCode = 400;
      throw error;
    }

    if (!actor?.idUsuario) {
      const error = new Error("El usuario validado por PIN es obligatorio.");
      error.statusCode = 403;
      throw error;
    }

    const currentOrder = await this.repo.get(orderId);
    if (!currentOrder) {
      const error = new Error("Pedido no encontrado.");
      error.statusCode = 404;
      throw error;
    }

    if (currentOrder.nombre_etapa_general === "Cancelado") {
      const error = new Error("El pedido ya se encuentra cancelado.");
      error.statusCode = 409;
      throw error;
    }

    return this.runInTransaction(async ({ repo }) => {
      const updatedOrder = await repo.cancelProduction(orderId, {
        userId: actor.idUsuario,
        comment: normalizedComment,
      });
      if (!updatedOrder) {
        const error = new Error("Pedido o estado Cancelado no encontrado.");
        error.statusCode = 404;
        throw error;
      }
      return updatedOrder;
    });
  }

  async updateDeliveryDate(orderId, dueDate) {
    if (!orderId) {
      const error = new Error("El ID del pedido es obligatorio");
      error.statusCode = 400;
      throw error;
    }

    if (!dueDate) {
      const error = new Error("La fecha de entrega es obligatoria.");
      error.statusCode = 400;
      throw error;
    }

    const parsedDate = toPrismaDate(dueDate);

    if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
      const error = new Error("La fecha de entrega no es valida.");
      error.statusCode = 400;
      throw error;
    }

    const updatedOrder = await this.repo.updateDeliveryDate(orderId, parsedDate);

    if (!updatedOrder) {
      const error = new Error("Pedido no encontrado");
      error.statusCode = 404;
      throw error;
    }

    return updatedOrder;
  }

  async completeSubprocess(orderId, detailId, subprocessId, { actor, comment } = {}) {
    if (!orderId || !detailId || !subprocessId) {
      const error = new Error("Faltan IDs obligatorios para completar el subproceso.");
      error.statusCode = 400;
      throw error;
    }

    if (!actor?.idUsuario) {
      const error = new Error("El usuario validado por PIN es obligatorio.");
      error.statusCode = 403;
      throw error;
    }

    return this.runInTransaction(async ({ repo }) => {
      const updatedOrder = await repo.completeSubprocess({
        orderId,
        detailId,
        subprocessId,
        userId: actor.idUsuario,
        comment,
      });

      if (!updatedOrder) {
        const error = new Error("Pedido o detalle de pedido no encontrado.");
        error.statusCode = 404;
        throw error;
      }

      return updatedOrder;
    });
  }

  async rollbackSubprocess(orderId, detailId, subprocessId, { actor, comment } = {}) {
    const observation = typeof comment === "string" ? comment.trim() : "";
    if (!actor?.idUsuario) {
      const error = new Error("El usuario validado por PIN es obligatorio.");
      error.statusCode = 403;
      throw error;
    }
    if (!observation) {
      const error = new Error("La observacion del retroceso es obligatoria.");
      error.statusCode = 400;
      throw error;
    }
    if (observation.length > 2000) {
      const error = new Error("La observacion no puede superar 2000 caracteres.");
      error.statusCode = 400;
      throw error;
    }

    return this.runInTransaction(async ({ repo }) => {
      const result = await repo.rollbackSubprocess({
        orderId, detailId, subprocessId, userId: actor.idUsuario, comment: observation,
      });
      if (!result) {
        const error = new Error("Pedido o subproceso no encontrado.");
        error.statusCode = 404;
        throw error;
      }
      return result;
    });
  }

  async getAllOrders() {
    return this.repo.getAllOrders();
  }

  async getSalesNoteByNumber(numeroNota) {
    return this.salesNoteSourceService.getByNumber(numeroNota);
  }

  async reevaluateOrder(orderId, { auth0UserId } = {}) {
    const order = await this.repo.get(orderId);
    if (!order) {
      const error = new Error("Pedido no encontrado."); error.statusCode = 404; throw error;
    }
    if (Number(order.id_etapa_general) !== 6) {
      const error = new Error("Solo se pueden reevaluar pedidos En revision."); error.statusCode = 409; throw error;
    }
    if (!order.numero_nota_venta) {
      const error = new Error("El pedido no tiene numero de Nota de Venta."); error.statusCode = 409; throw error;
    }
    const [salesNote, userId] = await Promise.all([
      this.salesNoteSourceService.getByNumber(order.numero_nota_venta),
      this.resolveInternalUserId({ auth0UserId }),
    ]);
    return this.runInTransaction(({ repo }) => repo.reevaluateFromSalesNote({
      orderId, salesNote, userId,
    }));
  }

  async setOrderLabel(orderId, { label, active }, { auth0UserId } = {}) {
    const allowed = new Set(["Urgencia", "Prioridad por contrato", "PRODUCIÉNDOSE"]);
    if (!allowed.has(label) || typeof active !== "boolean") {
      const error = new Error("Etiqueta o estado no valido."); error.statusCode = 400; throw error;
    }
    const userId = await this.resolveInternalUserId({ auth0UserId });
    return this.runInTransaction(async ({ repo }) => {
      const result = await repo.setOrderLabel({ orderId, label, active, userId });
      if (!result) { const error = new Error("Pedido no encontrado."); error.statusCode = 404; throw error; }
      return result;
    });
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
      actor,
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

    const currentOrder = await this.repo.get(orderId);

    if (!currentOrder) {
      const error = new Error("Pedido no encontrado");
      error.statusCode = 404;
      throw error;
    }

    const isConfirmedPayment = currentOrder.estado_pago === PAYMENT_STATUS.CONFIRMADO;
    const keepsConfirmedPayment =
      paymentStatus.nombre_estado_pago === PAYMENT_STATUS.CONFIRMADO;

    if (isConfirmedPayment && !keepsConfirmedPayment) {
      const error = new Error(CONFIRMED_PAYMENT_STATUS_LOCKED_MESSAGE);
      error.statusCode = 409;
      throw error;
    }

    if (isConfirmedPayment && keepsConfirmedPayment) {
      return currentOrder;
    }

    const KANBAN_CONFIRMACION_PAGO = 0;
    const KANBAN_LISTO_PRODUCCION = 1;
    const resolvedUserId =
      actor?.idUsuario ??
      await this.resolveInternalUserId({
        auth0UserId,
        id_usuario,
      });

    const nextKanbanOrder =
      paymentStatus.nombre_estado_pago === PAYMENT_STATUS.CONFIRMADO
        ? KANBAN_LISTO_PRODUCCION
        : KANBAN_CONFIRMACION_PAGO;

    // La transicion de pago es atomica: mueve Kanban y registra auditoria.
    return this.runInTransaction(async ({
      repo,
      paymentRecordService,
    }) => {
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

  async createOrder(data, options = {}) {
    if (data?.numeroNota || data?.cliente || data?.items) {
      return this.createOrderFromSalesNote(data, options);
    }

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
        fecha_estimada_termino: toPrismaDate(fecha_estimada_termino),
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
          fecha_estimada_termino: toPrismaDate(fecha_estimada_termino) ?? null,
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

  async createOrderFromSalesNote(data, options = {}) {
    const numeroNota = normalizeText(data.numeroNota);
    const cliente = data.cliente ?? {};
    const origen = data.origen ?? {};
    const productionItems = normalizeProductionItems(data.items ?? []);
    const untrackedItems = normalizeUntrackedItems(
      data.itemsSinSeguimientoProductivo ?? data.itemsNoSoportados ?? [],
    );

    if (!numeroNota || !cliente.rut || !cliente.nombre || productionItems.length === 0) {
      const error = new Error("Faltan datos obligatorios para registrar el pedido.");
      error.statusCode = 400;
      throw error;
    }

    const invalidItem = productionItems.find(
      (item) => !item.tipoProducto || !item.producto || item.cantidad === null,
    );

    if (invalidItem) {
      const error = new Error("Hay productos sin tipo productivo, nombre o cantidad valida.");
      error.statusCode = 400;
      throw error;
    }

    const existingOrder = await this.repo.getBySalesNoteNumber(numeroNota);

    if (existingOrder) {
      const error = new Error("Esta Nota de Venta ya fue registrada en el sistema.");
      error.statusCode = 409;
      throw error;
    }

    const resolvedUserId = await this.resolveInternalUserId({
      auth0UserId: options.auth0UserId,
      id_usuario: data.id_usuario,
    });

    return this.runInTransaction(async ({
      repo,
      clientService,
      orderDetailService,
      productTypeService,
      repoClient,
    }) => {
      const duplicateOrder = await repo.getBySalesNoteNumber(numeroNota);

      if (duplicateOrder) {
        const error = new Error("Esta Nota de Venta ya fue registrada en el sistema.");
        error.statusCode = 409;
        throw error;
      }

      const client = await clientService.findOrCreateClient({
        rut_cliente: cliente.rut,
        nombre_cliente: cliente.nombre,
        razon_social: cliente.nombre,
        estado_cliente: "ACTIVO",
      });

      if (!client?.id_cliente) {
        const error = new Error("No se pudo resolver el cliente del pedido.");
        error.statusCode = 500;
        throw error;
      }

      const labelNames = normalizePriorityLabels(data.priority);
      const labels = labelNames.length > 0
        ? await repoClient.etiqueta.findMany({
            where: {
              nombre_etiqueta: { in: labelNames },
              esta_activa: 1,
            },
          })
        : [];
      const primaryLabelId = labels[0]?.id_etiqueta ?? null;

      const order = await repo.create({
        id_cliente: client.id_cliente,
        id_usuario: resolvedUserId,
        id_estado_pedido: 1,
        id_estado_pago: 1,
        id_etiqueta: primaryLabelId,
        fecha_estimada_termino: toPrismaDate(data.fechaEntregaTentativaOrigen),
        numero_nota_venta: numeroNota,
        usuario_manager_origen: origen.usuarioManager ?? null,
        observacion_origen: data.observaciones ?? null,
        observacion_interna: data.observacionInterna ?? data.observacion_interna ?? null,
      });

      if (!order?.id_pedido) {
        const error = new Error("No se pudo crear el pedido.");
        error.statusCode = 500;
        throw error;
      }

      if (labels.length > 0) {
        await repo.addLabels(
          order.id_pedido,
          labels.map((label) => label.id_etiqueta),
          resolvedUserId,
        );
      }

      const details = [];

      for (const item of productionItems) {
        const productType = await productTypeService.getProductTypeByName(
          item.tipoProducto,
        );
        const subprocesses = await repo.getProductSubprocesses(
          productType.id_tipo_producto,
        );
        const firstSubprocess = subprocesses[0] ?? null;
        const detail = await orderDetailService.createOrderDetail(order.id_pedido, {
          id_tipo_producto: productType.id_tipo_producto,
          cantidad: item.cantidad,
          fecha_estimada_termino: toPrismaDate(data.fechaEntregaTentativaOrigen),
          fecha_real_termino: null,
          id_estado_subproceso: firstSubprocess?.id_estado_subproceso ?? null,
        });

        details.push({
          ...detail,
          codigo: item.codigo,
          producto: item.producto,
          familia: item.familia,
          subfamilia: item.subfamilia,
          tipoProducto: item.tipoProducto,
        });
      }

      const createdUntrackedItems = await repo.createUntrackedItems(
        order.id_pedido,
        untrackedItems,
      );

      const fullOrder = await repo.get(order.id_pedido);

      return {
        ...fullOrder,
        detalles: details,
        itemsSinSeguimientoProductivo: createdUntrackedItems,
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
