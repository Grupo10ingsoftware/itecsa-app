import { request, response } from "express";

import {
  approveDemoPaymentDeconfirmation,
  listAvailableDemoSalesNotes,
  listDemoAnnouncements,
  listDemoOrders,
  listDemoPaymentOrders,
  listDemoPaymentStatuses,
  requestDemoPaymentDeconfirmation,
  updateDemoOrderDeliveryDate,
  updateDemoOrderPaymentStatus,
  updateDemoOrderStep,
} from "../repo/demoOrders.store.js";

function isValidDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ""));
}

function isBusinessDateKey(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = date.getDay();

  return !Number.isNaN(date.getTime()) && weekday !== 0 && weekday !== 6;
}

class DemoOrdersController {
  getOrders = (req = request, res = response) => {
    return res.status(200).json(listDemoOrders());
  };

  getPaymentOrders = (req = request, res = response) => {
    return res.status(200).json(listDemoPaymentOrders());
  };

  getPaymentStatuses = (req = request, res = response) => {
    return res.status(200).json(listDemoPaymentStatuses());
  };

  getAvailableSalesNotes = (req = request, res = response) => {
    return res.status(200).json(listAvailableDemoSalesNotes());
  };

  getAnnouncements = (req = request, res = response) => {
    return res.status(200).json(listDemoAnnouncements());
  };

  updateDeliveryDate = (req = request, res = response) => {
    const { orderId } = req.params;
    const { dueDate } = req.body ?? {};

    if (!isValidDateKey(dueDate)) {
      return res.status(400).json({ message: "La fecha de entrega no es valida." });
    }

    if (!isBusinessDateKey(dueDate)) {
      return res.status(400).json({ message: "La fecha de entrega debe ser un dia habil." });
    }

    const updatedOrder = updateDemoOrderDeliveryDate(orderId, dueDate);

    if (!updatedOrder) {
      return res.status(404).json({ message: "Pedido no encontrado." });
    }

    return res.status(200).json(updatedOrder);
  };

  updateGeneralStep = (req = request, res = response) => {
    const { orderId } = req.params;
    const { generalStepId, operatorEmail } = req.body ?? {};
    const nextStep = Number(generalStepId);

    if (!Number.isInteger(nextStep) || nextStep < 0 || nextStep > 3) {
      return res.status(400).json({ message: "La etapa destino no es valida." });
    }

    const updatedOrder = updateDemoOrderStep(orderId, nextStep, { operatorEmail });

    if (!updatedOrder) {
      return res.status(404).json({ message: "Pedido no encontrado." });
    }

    return res.status(200).json(updatedOrder);
  };

  updatePaymentStatus = (req = request, res = response) => {
    const { orderId } = req.params;
    const {
      email,
      observacion,
      password,
      paymentStatus,
      paymentStatusId,
    } = req.body ?? {};
    const nextPaymentStatusId = Number(paymentStatusId ?? paymentStatus);

    if (!Number.isInteger(nextPaymentStatusId)) {
      return res.status(400).json({ message: "El estado de pago no es valido." });
    }

    if (!email || !password) {
      return res.status(400).json({ message: "Debe ingresar correo y contrasena para validar el cambio." });
    }

    const result = updateDemoOrderPaymentStatus(orderId, nextPaymentStatusId, {
      email: String(email).trim(),
      observacion,
      password,
    });

    if (result.error === "STATUS_NOT_FOUND") {
      return res.status(404).json({ message: "Estado de pago no encontrado." });
    }

    if (result.error === "ORDER_NOT_FOUND") {
      return res.status(404).json({ message: "Pedido no encontrado." });
    }

    if (result.error === "DIRECT_DECONFIRMATION_NOT_ALLOWED") {
      return res.status(409).json({ message: "La desconfirmacion debe ser solicitada por cobranza y aprobada desde Kanban." });
    }

    if (result.error === "MISSING_CREDENTIALS") {
      return res.status(400).json({ message: "Debe ingresar correo y contrasena para validar el cambio." });
    }

    return res.status(200).json(
      listDemoPaymentOrders().find((order) => order.id_pedido === result.order.id),
    );
  };

  requestPaymentDeconfirmation = (req = request, res = response) => {
    const { orderId } = req.params;
    const { email, responsible } = req.body ?? {};

    const result = requestDemoPaymentDeconfirmation(orderId, {
      email: email ? String(email).trim() : undefined,
      responsible,
    });

    if (result.error === "ORDER_NOT_FOUND") {
      return res.status(404).json({ message: "Pedido no encontrado." });
    }

    if (result.error === "REQUEST_NOT_ALLOWED") {
      return res.status(409).json({ message: "Solo se puede solicitar desconfirmacion para pedidos confirmados en Listo para produccion." });
    }

    return res.status(200).json(
      listDemoPaymentOrders().find((order) => order.id_pedido === result.order.id),
    );
  };

  approvePaymentDeconfirmation = (req = request, res = response) => {
    const { orderId } = req.params;
    const { email, password } = req.body ?? {};

    const result = approveDemoPaymentDeconfirmation(orderId, {
      email: email ? String(email).trim() : undefined,
      password,
    });

    if (result.error === "MISSING_CREDENTIALS") {
      return res.status(400).json({ message: "Debe ingresar correo y contrasena para aprobar la desconfirmacion." });
    }

    if (result.error === "ORDER_NOT_FOUND") {
      return res.status(404).json({ message: "Pedido no encontrado." });
    }

    if (result.error === "REQUEST_NOT_FOUND") {
      return res.status(409).json({ message: "Este pedido no tiene una solicitud de desconfirmacion pendiente." });
    }

    return res.status(200).json(result.order);
  };
}

export default DemoOrdersController;
