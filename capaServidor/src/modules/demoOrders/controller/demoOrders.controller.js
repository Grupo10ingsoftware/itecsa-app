import { request, response } from "express";

import {
  listAvailableDemoSalesNotes,
  listDemoOrders,
  listDemoPaymentOrders,
  listDemoPaymentStatuses,
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
    const { generalStepId } = req.body ?? {};
    const nextStep = Number(generalStepId);

    if (!Number.isInteger(nextStep) || nextStep < 0 || nextStep > 3) {
      return res.status(400).json({ message: "La etapa destino no es valida." });
    }

    const updatedOrder = updateDemoOrderStep(orderId, nextStep);

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

    if (result.error === "DECONFIRM_WINDOW_EXPIRED") {
      return res.status(409).json({ message: "El tiempo para desconfirmar este pago ya expiro." });
    }

    if (result.error === "MISSING_CREDENTIALS") {
      return res.status(400).json({ message: "Debe ingresar correo y contrasena para validar el cambio." });
    }

    return res.status(200).json(
      listDemoPaymentOrders().find((order) => order.id_pedido === result.order.id),
    );
  };
}

export default DemoOrdersController;
