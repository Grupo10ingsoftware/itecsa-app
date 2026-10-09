import {
  updGeneralStepOperation,
  sendToReviewOperation,
  cancelProductionOperation,
  updateDeliveryDateOperation,
  completeSubprocessOperation,
  rollbackSubprocessOperation,
} from './orderProduction.service.js';
import { updPaymentStateOperation } from './orderPayment.service.js';
import SalesOrderCreationService, { DUPLICATE_SALES_NOTE_MESSAGE } from './salesOrderCreation.service.js';
import OrderRepository from '../repo/orders.repo.js';
import ClientService from '../../clients/service/clients.service.js';
import OrderDetailService from './orderDetail.service.js';
import ProductTypeService from '../../products/service/product.service.js';
import PaymentRecordService from '../../payments/service/paymentRecord.service.js';
import PaymentStatusRepo from '../../payments/repo/paymentStatus.repo.js';
import defaultUserRepository from '../../users/repo/users.repo.js';
import SalesNoteSourceService, { normalizeSalesNoteNumber } from './salesNoteSource.service.js';
import getPrismaClient from '../../../database/prisma.js';
import ClientRepo from '../../clients/repo/clients.repo.js';
import OrderDetailRepo from '../repo/orderDetail.repo.js';
import ProductTypeRepo from '../../products/repo/product.repo.js';
import PaymentRecordRepo from '../../payments/repo/paymentRecord.repo.js';
import { parseLimit, decodeCursor, pageResult } from '../../../shared/pagination.js';
import { AppError } from '../../../errors/AppError.js';
import { SalesOrderError } from './salesOrder.errors.js';
import { toSalesNotePreview } from './salesOrder.validator.js';
import { createSalesOrderTransaction } from './salesOrder.transaction.js';

export { DUPLICATE_SALES_NOTE_MESSAGE };

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
    // Payment and production operations share this transaction boundary.
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

  async updGeneralStep(...args) {
    return updGeneralStepOperation(this, ...args);
  }

  async sendToReview(...args) {
    return sendToReviewOperation(this, ...args);
  }

  async cancelProduction(...args) {
    return cancelProductionOperation(this, ...args);
  }

  async updateDeliveryDate(...args) {
    return updateDeliveryDateOperation(this, ...args);
  }

  async completeSubprocess(...args) {
    return completeSubprocessOperation(this, ...args);
  }

  async rollbackSubprocess(...args) {
    return rollbackSubprocessOperation(this, ...args);
  }

  async getAllOrders(query = {}) {
    return this.getOrderViews(query, 'kanban');
  }

  async getOrderViews(query = {}, view = 'kanban') {
    const limit = parseLimit(query.limit);
    const cursor = decodeCursor(query.cursor);
    const status = String(query.status ?? "").trim().slice(0, 100) || null;
    const search = String(query.search ?? "").trim().slice(0, 100) || null;
    const productType = String(query.productType ?? "").trim().slice(0, 100) || null;
    const unscheduled = query.unscheduled === 'true';
    if (query.unscheduled !== undefined && query.unscheduled !== 'true' && query.unscheduled !== 'false') {
      throw new AppError(400, 'unscheduled solo admite true o false');
    }
    if (unscheduled && (view !== 'calendar' || query.from || query.to)) {
      throw new AppError(400, 'La consulta de pendientes no admite rango de fechas ni otra vista');
    }
    const parseDate = (value, end = false) => {
      if (!value) return null;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
        const error = new AppError(400, "Las fechas deben tener formato YYYY-MM-DD."); throw error;
      }
      const date = new Date(`${value}T00:00:00.000Z`);
      if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) { const error = new AppError(400, "La fecha no es valida."); throw error; }
      return end ? new Date(date.getTime() + 24 * 60 * 60 * 1000) : date;
    };
    const rows = await this.repo.listOrderViews({
      view,
      limit,
      cursor,
      status,
      search,
      productType,
      unscheduled,
      from: parseDate(query.from),
      to: parseDate(query.to, true),
    });
    return pageResult(rows, limit);
  }

  async getOrderViewById(orderId, view = 'kanban') {
    if (!Number.isInteger(Number(orderId)) || Number(orderId) <= 0) throw new AppError(400, 'ID de pedido no valido');
    const order = await this.repo.getOrderView(orderId, view);
    if (!order) throw new AppError(404, 'Pedido no encontrado', 'ORDER_NOT_FOUND');
    return order;
  }

  async getPaymentWorkspace() {
    const [orders, paymentStatuses] = await Promise.all([
      this.repo.getPaymentOrders(),
      this.paymentRepo.getAll(),
    ]);

    return { orders, paymentStatuses };
  }

  async getPagedPaymentWorkspace(query = {}) {
    const limit = parseLimit(query.limit);
    const cursor = decodeCursor(query.cursor);
    const search = String(query.search ?? '').trim().slice(0, 100) || null;
    const status = String(query.status ?? '').trim() || null;
    if (status && !['Pendiente', 'Rechazado', 'Confirmado'].includes(status)) throw new AppError(400, 'Estado de pago no valido');
    const parseDate = (value, end = false) => {
      if (!value) return null;
      const date = new Date(`${value}T00:00:00.000Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value)) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new AppError(400, 'Fecha no valida');
      return end ? new Date(date.getTime() + 86400000) : date;
    };
    const from = parseDate(query.from);
    const to = parseDate(query.to, true);
    if (from && to && from >= to) throw new AppError(400, 'Rango de fechas no valido');
    const [page, paymentStatuses] = await Promise.all([
      this.repo.listPaymentViews({ limit, cursor, status, search, from, to }),
      this.paymentRepo.getAll(),
    ]);
    return { ...pageResult(page.rows, limit), counts: page.counts, paymentStatuses };
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

  async updPaymentState(...args) {
    return updPaymentStateOperation(this, ...args);
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

export { RESOLVED_PAYMENT_PENDING_LOCKED_MESSAGE } from './orderPayment.service.js';
