import { randomUUID } from "node:crypto";
import { response, request } from "express";
import { respondError } from "../../../errors/httpErrors.js";
import { roleFromPayload } from "../../../../../shared/authorization.js";
import OrderService from "../service/order.service.js";
import SalesNoteSecurityMonitor, { SALES_NOTE_LOOKUP_OUTCOMES } from "../../security/service/salesNoteSecurityMonitor.service.js";
import {
  toCalendarOrderDetailDTO, toCalendarOrderSummaryDTO,
  toKanbanOrderDetailDTO, toKanbanOrderSummaryDTO,
  toOrderCreatedDTO, toOrderLabelsPatchDTO, toOrderStagePatchDTO, toPaymentOrderDTO,
  toPaymentStatusDTO,
} from "../dto/order.dto.js";

const mapPage = (page, mapper) => ({ ...page, items: (page?.items ?? []).map(mapper) });

class OrderController {
  constructor({ service, salesNoteMonitor, logger = console } = {}) {
    this.service = service ?? new OrderService();
    this.salesNoteMonitor = salesNoteMonitor ?? new SalesNoteSecurityMonitor({ logger });
    this.logger = logger;
  }

  getOrders = async (req = request, res = response) => {
    try { return res.status(200).json(mapPage(await this.service.getAllOrders(req.query), toKanbanOrderSummaryDTO)); }
    catch (error) { return respondError(error, req, res); }
  };

  getCalendarOrders = async (req = request, res = response) => {
    try { return res.status(200).json(mapPage(await this.service.getOrderViews(req.query, "calendar"), toCalendarOrderSummaryDTO)); }
    catch (error) { return respondError(error, req, res); }
  };

  getKanbanDetail = async (req = request, res = response) => {
    try { return res.status(200).json(toKanbanOrderDetailDTO(await this.service.getOrderViewById(req.params.orderId, "kanban"))); }
    catch (error) { return respondError(error, req, res); }
  };

  getCalendarDetail = async (req = request, res = response) => {
    try { return res.status(200).json(toCalendarOrderDetailDTO(await this.service.getOrderViewById(req.params.orderId, "calendar"))); }
    catch (error) { return respondError(error, req, res); }
  };

  getPaymentWorkspace = async (req = request, res = response) => {
    try {
      const workspace = await this.service.getPagedPaymentWorkspace(req.query);
      return res.status(200).json({
        ...mapPage(workspace, toPaymentOrderDTO),
        paymentStatuses: (workspace?.paymentStatuses ?? []).map(toPaymentStatusDTO),
      });
    }
    catch (error) { return respondError(error, req, res); }
  };

  getOrder = this.getKanbanDetail;

  observeSalesNote = async (req, outcome) => {
    try {
      await this.salesNoteMonitor.observeLookup({
        actorUserId: req.currentUser?.idUsuario,
        salesNoteNumber: req.params?.numeroNota,
        requestId: req.requestId ?? randomUUID(),
        outcome,
      });
    } catch {
      this.logger.error?.({ event: "security.sales_note_lookup_monitor_failed", requestId: req.requestId });
    }
  };

  getSalesNote = async (req = request, res = response) => {
    try {
      const salesNote = await this.service.getSalesNoteByNumber(req.params.numeroNota);
      res.status(200).json(salesNote);
      await this.observeSalesNote(req, SALES_NOTE_LOOKUP_OUTCOMES.AVAILABLE);
      return res;
    } catch (error) {
      const status = Number(error?.statusCode ?? error?.status ?? 500);
      const outcome = status === 404 ? SALES_NOTE_LOOKUP_OUTCOMES.NOT_FOUND
        : status === 409 ? SALES_NOTE_LOOKUP_OUTCOMES.ALREADY_REGISTERED
          : SALES_NOTE_LOOKUP_OUTCOMES.ERROR;
      const result = respondError(error, req, res);
      await this.observeSalesNote(req, outcome);
      return result;
    }
  };

  createOrder = async (req = request, res = response) => {
    try {
      const order = await this.service.createOrder(req.body ?? {}, {
        auth0UserId: req.auth?.payload?.sub, actorId: req.currentUser?.idUsuario, requestId: req.requestId,
      });
      return res.status(201).json(toOrderCreatedDTO(order));
    } catch (error) { return respondError(error, req, res); }
  };

  updatePaymentStatus = async (req = request, res = response) => {
    try {
      const { orderId } = req.params;
      if (!orderId) return res.status(400).json({ msg: "Missing ID" });
      const result = await this.service.updPaymentState(orderId, req.body?.paymentStatusId ?? req.body?.paymentStatus, {
        auth0UserId: req.auth?.payload?.sub, actor: req.pinActor, observacion: req.body?.observacion,
        role: roleFromPayload(req.auth?.payload), permissions: req.auth?.payload?.permissions,
      });
      if (!result) return res.status(404).json({ message: "Pedido no encontrado" });
      return res.status(200).json(toPaymentOrderDTO(result));
    } catch (error) { return respondError(error, req, res); }
  };

  updateGeneralStep = async (req = request, res = response) => {
    try {
      const { orderId } = req.params;
      if (!orderId) return res.status(400).json({ msg: "Missing ID" });
      const result = await this.service.updGeneralStep(orderId, req.body?.generalStepId, {
        permissions: req.auth?.payload?.permissions, role: roleFromPayload(req.auth?.payload), actor: req.pinActor, comment: req.body?.comment,
      });
      if (!result) return res.status(404).json({ message: "Pedido no encontrado" });
      return res.status(200).json(toOrderStagePatchDTO(result));
    } catch (error) { return respondError(error, req, res); }
  };

  sendToReview = async (req = request, res = response) => {
    try {
      await this.service.sendToReview(req.params.orderId, req.body?.comment, { auth0UserId: req.auth?.payload?.sub });
      return res.status(200).json(toKanbanOrderDetailDTO(await this.service.getOrderViewById(req.params.orderId, "kanban")));
    }
    catch (error) { return respondError(error, req, res); }
  };

  cancelProduction = async (req = request, res = response) => {
    try {
      await this.service.cancelProduction(req.params.orderId, req.body?.comment, { actor: req.pinActor });
      return res.status(200).json(toKanbanOrderDetailDTO(await this.service.getOrderViewById(req.params.orderId, "kanban")));
    }
    catch (error) { return respondError(error, req, res); }
  };

  reevaluate = async (req = request, res = response) => {
    try {
      await this.service.reevaluateOrder(req.params.orderId, { auth0UserId: req.auth?.payload?.sub });
      return res.status(200).json(toKanbanOrderDetailDTO(await this.service.getOrderViewById(req.params.orderId, "kanban")));
    }
    catch (error) { return respondError(error, req, res); }
  };

  setLabel = async (req = request, res = response) => {
    try { return res.status(200).json(toOrderLabelsPatchDTO(await this.service.setOrderLabel(req.params.orderId, req.body, { auth0UserId: req.auth?.payload?.sub }))); }
    catch (error) { return respondError(error, req, res); }
  };

  updateDeliveryDate = async (req = request, res = response) => {
    try {
      await this.service.updateDeliveryDate(req.params.orderId, req.body?.dueDate, { actor: req.pinActor });
      return res.status(200).json(toCalendarOrderDetailDTO(await this.service.getOrderViewById(req.params.orderId, "calendar")));
    }
    catch (error) { return respondError(error, req, res); }
  };

  completeSubprocess = async (req = request, res = response) => {
    try {
      const { orderId, detailId, subprocessId } = req.params;
      await this.service.completeSubprocess(orderId, detailId, subprocessId, { actor: req.pinActor, comment: req.body?.comment });
      return res.status(200).json(toKanbanOrderDetailDTO(await this.service.getOrderViewById(orderId, "kanban")));
    } catch (error) { return respondError(error, req, res); }
  };

  rollbackSubprocess = async (req = request, res = response) => {
    try {
      const { orderId, detailId, subprocessId } = req.params;
      await this.service.rollbackSubprocess(orderId, detailId, subprocessId, { actor: req.pinActor, comment: req.body?.comment });
      return res.status(200).json(toKanbanOrderDetailDTO(await this.service.getOrderViewById(orderId, "kanban")));
    } catch (error) { return respondError(error, req, res); }
  };
}

export default OrderController;
