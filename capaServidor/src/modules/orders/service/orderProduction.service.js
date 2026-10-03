import { AppError } from '../../../errors/AppError.js';
import {
  KANBAN_STAGE_SKIP_MESSAGE,
  KANBAN_EN_PRODUCCION_STEP,
  KANBAN_MOVE_TO_PRODUCTION_PERMISSION_MESSAGE,
  PAYMENT_STATUS,
  PAYMENT_CONFIRMATION_REQUIRED_MESSAGE,
} from '../../../config/status.js';
import { can, PERMISSIONS as P } from '../../../../../shared/authorization.js';

export function toPrismaDate(value) {
  if (!value) return null;

  return new Date(`${value}T00:00:00.000Z`);
}

export function isBusinessDate(date) {
  const day = date.getUTCDay();

  return day !== 0 && day !== 6;
}

export function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export async function updGeneralStepOperation(service, orderId, stepId, options = {}) {
  if (!orderId) {
    const error = new AppError(400, "El ID del pedido es obligatorio");
    throw error;
  }

  if (stepId === undefined || stepId === null) {
    const error = new AppError(400, "La etapa destino es obligatoria");
    throw error;
  }

  const order = await service.repo.getTransitionState(orderId);

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

  return service.runInTransaction(({ repo }) => repo.updateGeneralStep(
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

export async function sendToReviewOperation(service, orderId, comment, { auth0UserId } = {}) {
  const normalizedComment = typeof comment === "string" ? comment.trim() : "";
  if (!normalizedComment) {
    const error = new AppError(400, "El comentario de revision es obligatorio.");
    throw error;
  }

  if (normalizedComment.length > 2000) {
    const error = new AppError(400, "El comentario de revision no puede superar 2000 caracteres.");
    throw error;
  }

  const currentOrder = await service.repo.get(orderId);
  if (!currentOrder) {
    const error = new AppError(404, "Pedido no encontrado.", "ORDER_NOT_FOUND");
    throw error;
  }

  if (Number(currentOrder.id_etapa_general) !== 1) {
    const error = new AppError(409, "Solo se puede enviar a revision un pedido Listo para Produccion.");
    throw error;
  }

  const userId = await service.resolveInternalUserId({ auth0UserId });
  return service.runInTransaction(async ({ repo }) => {
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

export async function cancelProductionOperation(service, orderId, comment, { actor } = {}) {
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

  const currentOrder = await service.repo.get(orderId);
  if (!currentOrder) {
    const error = new AppError(404, "Pedido no encontrado.", "ORDER_NOT_FOUND");
    throw error;
  }

  if (currentOrder.nombre_etapa_general === "Cancelado") {
    const error = new AppError(409, "El pedido ya se encuentra cancelado.");
    throw error;
  }

  return service.runInTransaction(async ({ repo }) => {
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

export async function updateDeliveryDateOperation(service, orderId, dueDate, { actor } = {}) {
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
  const updatedOrder = await service.repo.updateDeliveryDate(orderId, parsedDate, {
    userId: actor.idUsuario,
    comment: `Fecha de termino definida para ${formattedDate}.`,
  });

  if (!updatedOrder) {
    const error = new AppError(404, "Pedido no encontrado", "ORDER_NOT_FOUND");
    throw error;
  }

  return updatedOrder;
}

export async function completeSubprocessOperation(service, orderId, detailId, subprocessId, { actor, comment } = {}) {
  if (!orderId || !detailId || !subprocessId) {
    const error = new AppError(400, "Faltan IDs obligatorios para completar el subproceso.");
    throw error;
  }

  if (!actor?.idUsuario) {
    const error = new AppError(403, "El usuario validado por PIN es obligatorio.");
    throw error;
  }

  return service.runInTransaction(async ({ repo }) => {
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

export async function rollbackSubprocessOperation(service, orderId, detailId, subprocessId, { actor, comment } = {}) {
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

  return service.runInTransaction(async ({ repo }) => {
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
