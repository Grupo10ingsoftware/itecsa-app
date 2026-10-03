import { AppError } from '../../../errors/AppError.js';
import { PAYMENT_STATUS } from '../../../config/status.js';
import { can, PERMISSIONS as P } from '../../../../../shared/authorization.js';

export const RESOLVED_PAYMENT_PENDING_LOCKED_MESSAGE =
  "Un pago confirmado o rechazado no puede volver al estado Pendiente.";

export async function updPaymentStateOperation(service, orderId, newPaymentStatusId, data = {}) {
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

  const [paymentStatus, observedOrder] = await Promise.all([
    service.paymentRepo.get(paymentStatusId),
    service.repo.getPaymentOrder(orderId),
  ]);

  if (!paymentStatus) {
    const error = new AppError(404, "Estado de pago no encontrado.");
    throw error;
  }

  if (!observedOrder) {
    const error = new AppError(404, "Pedido no encontrado", "ORDER_NOT_FOUND");
    throw error;
  }

  const nextPaymentStatus = paymentStatus.nombre_estado_pago;
  const KANBAN_CONFIRMACION_PAGO = 0;
  const KANBAN_LISTO_PRODUCCION = 1;
  const KANBAN_EN_PRODUCCION = 2;
  const KANBAN_CANCELADO = 5;

  // La lectura inicial solo detecta conflictos; la decision usa la fila bloqueada.
  return service.runInTransaction(async ({
    repo,
    paymentRecordService,
  }) => {
    if (!await repo.lockPaymentOrder(orderId)) {
      const error = new AppError(404, "Pedido no encontrado");
      throw error;
    }
    const currentOrder = await repo.getPaymentOrder(orderId);
    if (!currentOrder) {
      const error = new AppError(404, "Pedido no encontrado");
      throw error;
    }

    // Dos solicitudes con el mismo destino son idempotentes. Si cambio a otro
    // estado desde la lectura inicial, la segunda debe volver a decidir.
    if (Number(currentOrder.id_estado_pago) === paymentStatusId) {
      return currentOrder;
    }
    if (Number(currentOrder.id_estado_pago) !== Number(observedOrder.id_estado_pago)) {
      const error = new AppError(409, "El estado de pago cambio. Actualiza el pedido e intenta nuevamente.");
      throw error;
    }

    const currentPaymentStatus = currentOrder.estado_pago;
    if (currentPaymentStatus !== PAYMENT_STATUS.PENDIENTE) {
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

    const resolvedUserId =
      actor?.idUsuario ??
      await service.resolveInternalUserId({ auth0UserId, id_usuario });
    const currentKanbanOrder = Number(currentOrder.id_etapa_general);
    const isConfirmedToRejected =
      currentPaymentStatus === PAYMENT_STATUS.CONFIRMADO &&
      nextPaymentStatus === PAYMENT_STATUS.RECHAZADO;
    const cancelsReadyOrder =
      isConfirmedToRejected && currentKanbanOrder === KANBAN_LISTO_PRODUCCION;
    const requiresProductionCancellation =
      isConfirmedToRejected && currentKanbanOrder === KANBAN_EN_PRODUCCION;
    const nextKanbanOrder =
      nextPaymentStatus === PAYMENT_STATUS.CONFIRMADO
        ? KANBAN_LISTO_PRODUCCION
        : cancelsReadyOrder
          ? KANBAN_CANCELADO
          : isConfirmedToRejected
            ? null
            : KANBAN_CONFIRMACION_PAGO;

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
      id_estado_pago_anterior: currentOrder.id_estado_pago,
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
