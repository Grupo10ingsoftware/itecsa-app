import { parseCreateOrderInput } from "./createOrderInput.js";
import { AppError } from "../../../errors/AppError.js";
import { can, PERMISSIONS as P } from "../../../../../shared/authorization.js";
import {
  KANBAN_EN_PRODUCCION_STEP,
  KANBAN_MOVE_TO_PRODUCTION_PERMISSION_MESSAGE,
  KANBAN_STAGE_SKIP_MESSAGE,
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
import SalesNoteSourceService, {
  normalizeSalesNoteNumber,
} from "./salesNoteSource.service.js";

export const RESOLVED_PAYMENT_PENDING_LOCKED_MESSAGE =
  "Un pago confirmado o rechazado no puede volver al estado Pendiente.";
export const DUPLICATE_SALES_NOTE_MESSAGE =
  "Esta Nota de Venta ya fue registrada en el sistema y no puede volver a ingresarse.";

function toPrismaDate(value) {
  if (!value) return null;

  return new Date(`${value}T00:00:00.000Z`);
}

function isBusinessDate(date) {
  const day = date.getUTCDay();

  return day !== 0 && day !== 6;
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
      const error = new AppError(400, "El ID del pedido es obligatorio");
      throw error;
    }

    if (stepId === undefined || stepId === null) {
      const error = new AppError(400, "La etapa destino es obligatoria");
      throw error;
    }

    const order = await this.repo.getTransitionState(orderId);

    if (!order) {
      const error = new AppError(404, "Pedido no encontrado", "ORDER_NOT_FOUND");
      throw error;
    }

    const currentStep = Number(order.id_etapa_general);
    const nextStep = Number(stepId);

    if (!Number.isInteger(nextStep)) {
      const error = new AppError(400, "Etapa no valida");
      throw error;
    }

    if (nextStep < currentStep) {
      const error = new AppError(409, "No puedes retroceder en las etapas del pedido");
      throw error;
    }

    if (nextStep === currentStep) {
      return order;
    }

    if (nextStep !== currentStep + 1) {
      const error = new AppError(409, KANBAN_STAGE_SKIP_MESSAGE);
      throw error;
    }

    // Se permiten avances manuales consecutivos desde producción lista hasta entrega.
    if (!((currentStep === 1 && nextStep === 2) || (currentStep === 2 && nextStep === 3) || (currentStep === 3 && nextStep === 4))) {
      const error = new AppError(403, "Esta transicion no admite movimiento manual."); throw error;
    }
    const isMoveToProduction =
      currentStep < nextStep && nextStep === KANBAN_EN_PRODUCCION_STEP;
    const permissions = options.permissions;

    if (
      isMoveToProduction &&
      !can(options.role, permissions, P.START_PRODUCTION)
    ) {
      const error = new AppError(403, KANBAN_MOVE_TO_PRODUCTION_PERMISSION_MESSAGE);
      throw error;
    }

    if (order.estado_pago !== PAYMENT_STATUS.CONFIRMADO) {
      throw new AppError(409, PAYMENT_CONFIRMATION_REQUIRED_MESSAGE, "PAYMENT_CONFIRMATION_REQUIRED");
    }

    if (!options.actor?.idUsuario) {
      const error = new AppError(403, "El usuario validado por PIN es obligatorio.");
      throw error;
    }

    return this.runInTransaction(({ repo }) => repo.updateGeneralStep(
      orderId,
      nextStep,
      {
        userId: options.actor.idUsuario,
        comment: options.comment,
        expectedState: {
          id_estado_pedido: order.id_estado_pedido,
          id_estado_pago: order.id_estado_pago,
        },
      },
    ));
  }

  async sendToReview(orderId, comment, { auth0UserId } = {}) {
    const normalizedComment = typeof comment === "string" ? comment.trim() : "";
    if (!normalizedComment) {
      const error = new AppError(400, "El comentario de revision es obligatorio.");
      throw error;
    }

    if (normalizedComment.length > 2000) {
      const error = new AppError(400, "El comentario de revision no puede superar 2000 caracteres.");
      throw error;
    }

    const currentOrder = await this.repo.get(orderId);
    if (!currentOrder) {
      const error = new AppError(404, "Pedido no encontrado.", "ORDER_NOT_FOUND");
      throw error;
    }

    if (Number(currentOrder.id_etapa_general) !== 1) {
      const error = new AppError(409, "Solo se puede enviar a revision un pedido Listo para Produccion.");
      throw error;
    }

    const userId = await this.resolveInternalUserId({ auth0UserId });
    return this.runInTransaction(async ({ repo }) => {
      const updatedOrder = await repo.sendToReview(orderId, {
        userId,
        comment: normalizedComment,
      });
      if (!updatedOrder) {
        const error = new AppError(404, "Pedido o estado En revisión no encontrado.");
        throw error;
      }
      return updatedOrder;
    });
  }

  async cancelProduction(orderId, comment, { actor } = {}) {
    const normalizedComment = typeof comment === "string" ? comment.trim() : "";
    if (!normalizedComment) {
      const error = new AppError(400, "La observacion de cancelacion es obligatoria.");
      throw error;
    }

    if (normalizedComment.length > 2000) {
      const error = new AppError(400, "La observacion no puede superar 2000 caracteres.");
      throw error;
    }

    if (!actor?.idUsuario) {
      const error = new AppError(403, "El usuario validado por PIN es obligatorio.");
      throw error;
    }

    const currentOrder = await this.repo.get(orderId);
    if (!currentOrder) {
      const error = new AppError(404, "Pedido no encontrado.", "ORDER_NOT_FOUND");
      throw error;
    }

    if (currentOrder.nombre_etapa_general === "Cancelado") {
      const error = new AppError(409, "El pedido ya se encuentra cancelado.");
      throw error;
    }

    return this.runInTransaction(async ({ repo }) => {
      const updatedOrder = await repo.cancelProduction(orderId, {
        userId: actor.idUsuario,
        comment: normalizedComment,
      });
      if (!updatedOrder) {
        const error = new AppError(404, "Pedido o estado Cancelado no encontrado.");
        throw error;
      }
      return updatedOrder;
    });
  }

  async updateDeliveryDate(orderId, dueDate, { actor } = {}) {
    if (!orderId) {
      const error = new AppError(400, "El ID del pedido es obligatorio");
      throw error;
    }

    if (!dueDate) {
      const error = new AppError(400, "La fecha de entrega es obligatoria.");
      throw error;
    }

    const parsedDate = toPrismaDate(dueDate);

    if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
      const error = new AppError(400, "La fecha de entrega no es valida.");
      throw error;
    }

    if (!isBusinessDate(parsedDate)) {
      const error = new AppError(400, "La fecha de produccion debe ser un dia habil.");
      throw error;
    }

    if (!actor?.idUsuario) {
      const error = new AppError(403, "El usuario validado por PIN es obligatorio.");
      throw error;
    }

    const formattedDate = dueDate.split("-").reverse().join("-");
    const updatedOrder = await this.repo.updateDeliveryDate(orderId, parsedDate, {
      userId: actor.idUsuario,
      comment: `Fecha de termino definida para ${formattedDate}.`,
    });

    if (!updatedOrder) {
      const error = new AppError(404, "Pedido no encontrado", "ORDER_NOT_FOUND");
      throw error;
    }

    return updatedOrder;
  }

  async completeSubprocess(orderId, detailId, subprocessId, { actor, comment } = {}) {
    if (!orderId || !detailId || !subprocessId) {
      const error = new AppError(400, "Faltan IDs obligatorios para completar el subproceso.");
      throw error;
    }

    if (!actor?.idUsuario) {
      const error = new AppError(403, "El usuario validado por PIN es obligatorio.");
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
        const error = new AppError(404, "Pedido o detalle de pedido no encontrado.");
        throw error;
      }

      return updatedOrder;
    });
  }

  async rollbackSubprocess(orderId, detailId, subprocessId, { actor, comment } = {}) {
    const observation = typeof comment === "string" ? comment.trim() : "";
    if (!actor?.idUsuario) {
      const error = new AppError(403, "El usuario validado por PIN es obligatorio.");
      throw error;
    }
    if (!observation) {
      const error = new AppError(400, "La observacion del retroceso es obligatoria.");
      throw error;
    }
    if (observation.length > 2000) {
      const error = new AppError(400, "La observacion no puede superar 2000 caracteres.");
      throw error;
    }

    return this.runInTransaction(async ({ repo }) => {
      const result = await repo.rollbackSubprocess({
        orderId, detailId, subprocessId, userId: actor.idUsuario, comment: observation,
      });
      if (!result) {
        const error = new AppError(404, "Pedido o subproceso no encontrado.");
        throw error;
      }
      return result;
    });
  }

  async getAllOrders() {
    return this.repo.getAllOrders();
  }

  async getPaymentWorkspace() {
    const [orders, paymentStatuses] = await Promise.all([
      this.repo.getPaymentOrders(),
      this.paymentRepo.getAll(),
    ]);

    return { orders, paymentStatuses };
  }

  async getSalesNoteByNumber(numeroNota) {
    const normalizedNumber = normalizeSalesNoteNumber(numeroNota);
    const duplicateCheck = normalizedNumber
      ? this.repo.existsBySalesNoteNumber(normalizedNumber)
      : Promise.resolve(false);
    const [salesNote, isAlreadyRegistered] = await Promise.all([
      this.salesNoteSourceService.getByNumber(numeroNota),
      duplicateCheck,
    ]);

    if (isAlreadyRegistered) {
      const error = new AppError(409, DUPLICATE_SALES_NOTE_MESSAGE);
      throw error;
    }

    return salesNote;
  }

  async reevaluateOrder(orderId, { auth0UserId } = {}) {
    const order = await this.repo.get(orderId);
    if (!order) {
      const error = new AppError(404, "Pedido no encontrado.", "ORDER_NOT_FOUND"); throw error;
    }
    if (Number(order.id_etapa_general) !== 6) {
      const error = new AppError(409, "Solo se pueden reevaluar pedidos En revision."); throw error;
    }
    if (!order.numero_nota_venta) {
      const error = new AppError(409, "El pedido no tiene numero de Nota de Venta."); throw error;
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
      const error = new AppError(400, "Etiqueta o estado no valido."); throw error;
    }
    const userId = await this.resolveInternalUserId({ auth0UserId });
    return this.runInTransaction(async ({ repo }) => {
      const result = await repo.setOrderLabel({ orderId, label, active, userId });
      if (!result) { const error = new AppError(404, "Pedido no encontrado.", "ORDER_NOT_FOUND"); throw error; }
      return result;
    });
  }

  async resolveInternalUserId({ auth0UserId, id_usuario } = {}) {
    if (auth0UserId) {
      const user = await this.userRepo.findByAuth0Id(auth0UserId);

      if (!user?.idUsuario) {
        const error = new AppError(403, "No existe un usuario interno vinculado a la sesion.");
        throw error;
      }

      return user.idUsuario;
    }

    if (id_usuario) {
      return id_usuario;
    }

    const error = new AppError(400, "El usuario autenticado es obligatorio para registrar el pago.");
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
      const error = new AppError(400, "El estado de pago no es valido.");
      throw error;
    }

    const [paymentStatus, currentOrder] = await Promise.all([
      this.paymentRepo.get(paymentStatusId),
      this.repo.getPaymentOrder(orderId),
    ]);

    if (!paymentStatus) {
      const error = new AppError(404, "Estado de pago no encontrado.");
      throw error;
    }

    if (!currentOrder) {
      const error = new AppError(404, "Pedido no encontrado", "ORDER_NOT_FOUND");
      throw error;
    }

    const currentPaymentStatus = currentOrder.estado_pago;
    const nextPaymentStatus = paymentStatus.nombre_estado_pago;
    const isSamePaymentStatus =
      Number(currentOrder.id_estado_pago) === paymentStatusId;
    const isResolvedPayment = currentPaymentStatus !== PAYMENT_STATUS.PENDIENTE;

    if (isSamePaymentStatus) {
      return currentOrder;
    }

    if (isResolvedPayment) {
      if (!can(data.role, data.permissions, P.REVISE_PAYMENT_STATUS)) {
        const error = new AppError(403,
          "Solo Administrador Cobranzas o Soporte puede modificar una decision de pago.",
        );
        throw error;
      }

      if (nextPaymentStatus === PAYMENT_STATUS.PENDIENTE) {
        const error = new AppError(409, RESOLVED_PAYMENT_PENDING_LOCKED_MESSAGE);
        throw error;
      }

      if (!String(observacion ?? "").trim()) {
        const error = new AppError(400, "El motivo del cambio de pago es obligatorio.");
        throw error;
      }
    }

    const KANBAN_CONFIRMACION_PAGO = 0;
    const KANBAN_LISTO_PRODUCCION = 1;
    const KANBAN_EN_PRODUCCION = 2;
    const KANBAN_CANCELADO = 5;
    const resolvedUserId =
      actor?.idUsuario ??
      await this.resolveInternalUserId({
        auth0UserId,
        id_usuario,
      });

    const currentKanbanOrder = Number(currentOrder.id_etapa_general);
    const isConfirmedToRejected =
      currentPaymentStatus === PAYMENT_STATUS.CONFIRMADO &&
      nextPaymentStatus === PAYMENT_STATUS.RECHAZADO;
    const cancelsReadyOrder =
      isConfirmedToRejected && currentKanbanOrder === KANBAN_LISTO_PRODUCCION;
    const requiresProductionCancellation =
      isConfirmedToRejected &&
      currentKanbanOrder === KANBAN_EN_PRODUCCION;
    const nextKanbanOrder =
      nextPaymentStatus === PAYMENT_STATUS.CONFIRMADO
        ? KANBAN_LISTO_PRODUCCION
        : cancelsReadyOrder
          ? KANBAN_CANCELADO
          : isConfirmedToRejected
            ? null
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
        {
          currentOrder,
          paymentStatusName: nextPaymentStatus,
        },
      );

      if (!updatedOrder) return null;

      await paymentRecordService.createPaymentRecord(orderId, {
        id_usuario: resolvedUserId,
        id_estado_pago: paymentStatusId,
        observacion,
      });

      const salesNote =
        updatedOrder.numero_nota_venta ?? currentOrder.numero_nota_venta ?? `#${orderId}`;
      const normalizedObservation = String(observacion ?? "").trim();

      if (nextPaymentStatus === PAYMENT_STATUS.CONFIRMADO) {
        await repo.notifyProductionAdministrators({
          orderId,
          subject: "Pago confirmado: pedido listo para producción",
          content: `Se confirmó el pago del pedido ${salesNote}. El pedido está listo para producción.`,
        });
      }

      if (cancelsReadyOrder) {
        await repo.notifyProductionAdministrators({
          orderId,
          subject: "Pedido cancelado por rechazo de pago",
          content: [
            `El pedido ${salesNote} fue cancelado porque su pago cambió de Confirmado a Rechazado.`,
            normalizedObservation ? `Motivo: ${normalizedObservation}` : null,
          ].filter(Boolean).join("\n"),
        });
      }

      if (requiresProductionCancellation) {
        await repo.notifyProductionAdministrators({
          orderId,
          subject: "Cancelación de producción requerida",
          content: [
            `El pago del pedido ${salesNote} cambió de Confirmado a Rechazado.`,
            "La producción de este pedido debe ser cancelada por un Administrador de Producción.",
            normalizedObservation ? `Motivo: ${normalizedObservation}` : null,
          ].filter(Boolean).join("\n"),
        });
      }

      return updatedOrder;
    });
  }

  async createOrder(data, options = {}) {
    return this.createOrderFromSalesNote(data, options);
  }

  async createOrderFromSalesNote(data, options = {}) {
    // Sólo la referencia y las decisiones internas cruzan desde el navegador.
    const input = parseCreateOrderInput(data);
    const salesNote = await this.salesNoteSourceService.getByNumber(input.numeroNota);
    if (!salesNote) {
      throw new AppError(404, "Nota de Venta no encontrada.");
    }
    const numeroNota = normalizeSalesNoteNumber(salesNote.numeroNota);
    if (numeroNota !== input.numeroNota) {
      throw new AppError(400, "La fuente devolvio una Nota de Venta diferente.");
    }
    const cliente = {
      rut: normalizeText(salesNote.cliente?.rut),
      nombre: normalizeText(salesNote.cliente?.nombre),
    };
    const origen = salesNote.origen ?? {};
    if (!Array.isArray(salesNote.items) ||
        !Array.isArray(salesNote.itemsSinSeguimientoProductivo ?? []) ||
        [...salesNote.items, ...(salesNote.itemsSinSeguimientoProductivo ?? [])]
          .some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
      throw new AppError(400, "Los productos de la Nota de Venta no son validos.");
    }
    const productionItems = normalizeProductionItems(salesNote.items);
    const untrackedItems = normalizeUntrackedItems(salesNote.itemsSinSeguimientoProductivo ?? []);

    if (!cliente.rut || !cliente.nombre || productionItems.length === 0) {
      throw new AppError(400, "Faltan datos obligatorios para registrar el pedido.");
    }
    if (productionItems.some((item) => !normalizeText(item.tipoProducto) ||
        !normalizeText(item.producto) || !Number.isInteger(item.cantidad) || item.cantidad <= 0) ||
        untrackedItems.some((item) => !Number.isInteger(item.cantidad) || item.cantidad <= 0)) {
      throw new AppError(400, "Hay productos sin tipo productivo, nombre o cantidad valida.");
    }
    const resolvedUserId = await this.resolveInternalUserId({
      auth0UserId: options.auth0UserId,
    });
    const estimatedCompletionDate = null;

    return this.runInTransaction(async ({
      repo,
      clientService,
      orderDetailService,
      productTypeService,
      repoClient,
    }) => {
      const duplicateOrder = await repo.existsBySalesNoteNumber(numeroNota);

      if (duplicateOrder) {
        const error = new AppError(409, DUPLICATE_SALES_NOTE_MESSAGE);
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

      const labelNames = normalizePriorityLabels(input.priority);
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
        fecha_estimada_termino: estimatedCompletionDate,
        numero_nota_venta: numeroNota,
        usuario_manager_origen: origen.usuarioManager ?? null,
        observacion_origen: salesNote.observaciones ?? null,
        observacion_interna: input.observacionInterna,
      }, { hydrate: false });

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
      const productContextByName = new Map();

      for (const item of productionItems) {
        let productContext = productContextByName.get(item.tipoProducto);

        if (!productContext) {
          const productType = await productTypeService.getProductTypeByName(
            item.tipoProducto,
          );
          const subprocesses = await repo.getProductSubprocesses(
            productType.id_tipo_producto,
          );

          productContext = {
            productType,
            firstSubprocess: subprocesses[0] ?? null,
          };
          productContextByName.set(item.tipoProducto, productContext);
        }

        const detail = await orderDetailService.createOrderDetail(order.id_pedido, {
          id_tipo_producto: productContext.productType.id_tipo_producto,
          cantidad: item.cantidad,
          fecha_estimada_termino: estimatedCompletionDate,
          fecha_real_termino: null,
          id_estado_subproceso:
            productContext.firstSubprocess?.id_estado_subproceso ?? null,
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

      await repo.notifyCollectionsAdministrators({
        orderId: order.id_pedido,
        subject: "Nuevo pedido pendiente de confirmación de pago",
        content: `Se registró el pedido ${numeroNota}. Está pendiente de confirmación de pago.`,
      });

      await repo.notifyProductionAdministrators({
        orderId: order.id_pedido,
        subject: "Pedido pendiente de programacion",
        content: `Se registro el pedido ${numeroNota}. Debe asignarse una fecha habil en el calendario de produccion.`,
      });

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
      const error = new AppError(400, "El ID del pedido es obligatorio");
      throw error;
    }

    const order = await this.repo.get(orderId);

    if (!order) {
      const error = new AppError(404, "Pedido no encontrado", "ORDER_NOT_FOUND");
      throw error;
    }

    return order;
  }
}

export default OrderService;
