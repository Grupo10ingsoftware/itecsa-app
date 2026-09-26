import SalesOrderCreationService, { DUPLICATE_SALES_NOTE_MESSAGE } from "./salesOrderCreation.service.js";
import { createSalesOrderTransaction } from "./salesOrder.transaction.js";
import { toSalesNotePreview } from "./salesOrder.validator.js";
import { SalesOrderError } from "./salesOrder.errors.js";
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
export { DUPLICATE_SALES_NOTE_MESSAGE };

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
    salesOrderTransaction,
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
    this.salesOrderTransaction = salesOrderTransaction;
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

    const order = await this.repo.getTransitionState(orderId);

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

    // Se permiten avances manuales consecutivos desde producción lista hasta entrega.
    if (!((currentStep === 1 && nextStep === 2) || (currentStep === 2 && nextStep === 3) || (currentStep === 3 && nextStep === 4))) {
      const error = new Error("Esta transicion no admite movimiento manual."); error.statusCode = 403; throw error;
    }
    const isMoveToProduction =
      currentStep < nextStep && nextStep === KANBAN_EN_PRODUCCION_STEP;
    const permissions = options.permissions;

    if (
      isMoveToProduction &&
      !can(options.role, permissions, P.START_PRODUCTION)
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

  async updateDeliveryDate(orderId, dueDate, { actor } = {}) {
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

    if (!isBusinessDate(parsedDate)) {
      const error = new Error("La fecha de produccion debe ser un dia habil.");
      error.statusCode = 400;
      throw error;
    }

    if (!actor?.idUsuario) {
      const error = new Error("El usuario validado por PIN es obligatorio.");
      error.statusCode = 403;
      throw error;
    }

    const formattedDate = dueDate.split("-").reverse().join("-");
    const updatedOrder = await this.repo.updateDeliveryDate(orderId, parsedDate, {
      userId: actor.idUsuario,
      comment: `Fecha de termino definida para ${formattedDate}.`,
    });

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
      throw new SalesOrderError(DUPLICATE_SALES_NOTE_MESSAGE, 409);
    }

    return toSalesNotePreview(salesNote);
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

    const [paymentStatus, currentOrder] = await Promise.all([
      this.paymentRepo.get(paymentStatusId),
      this.repo.getPaymentOrder(orderId),
    ]);

    if (!paymentStatus) {
      const error = new Error("Estado de pago no encontrado.");
      error.statusCode = 404;
      throw error;
    }

    if (!currentOrder) {
      const error = new Error("Pedido no encontrado");
      error.statusCode = 404;
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
        const error = new Error(
          "Solo Administrador Cobranzas o Soporte puede modificar una decision de pago.",
        );
        error.statusCode = 403;
        throw error;
      }

      if (nextPaymentStatus === PAYMENT_STATUS.PENDIENTE) {
        const error = new Error(RESOLVED_PAYMENT_PENDING_LOCKED_MESSAGE);
        error.statusCode = 409;
        throw error;
      }

      if (!String(observacion ?? "").trim()) {
        const error = new Error("El motivo del cambio de pago es obligatorio.");
        error.statusCode = 400;
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
    const service = new SalesOrderCreationService({
      source: this.salesNoteSourceService,
      userRepo: this.userRepo,
      runInTransaction: this.salesOrderTransaction ?? createSalesOrderTransaction(() => this.client),
    });
    return service.create(data, options);
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
