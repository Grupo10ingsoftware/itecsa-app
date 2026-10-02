import { isLanyardProduct, isPackagingSubprocess } from './orderProductionRules.js';
import { snapshotOmit, supportsOrderSnapshots } from './orderSnapshotSchema.js';
import { AppError } from '../../../errors/AppError.js';

export async function lockProductionOrderOperation(repository, orderId) {
  await repository.client.$queryRaw`
      SELECT id_pedido FROM Pedidos WHERE id_pedido = ${Number(orderId)} FOR UPDATE
    `;
}

export async function completeSubprocessOperation(repository, { orderId, detailId, subprocessId, userId, comment }) {
  await repository.lockProductionOrder(orderId);
  const detail = await repository.client.detalle_pedido.findFirst({
    ...snapshotOmit(await supportsOrderSnapshots(repository.client)),
    where: {
      id_pedido: Number(orderId),
      id_detalle_pedido: Number(detailId),
    },
    include: {
      Tipo_Producto: {
        include: {
          Producto_Subproceso: {
            include: { Estado_Subprocesos: true },
            orderBy: { orden_flujo: "asc" },
          },
        },
      },
    },
  });

  if (!detail) return null;

  const order = await repository.get(orderId);

  if (!order) return null;

  if (Number(order.id_etapa_general) !== 2 || order.estado_pago !== "Confirmado") {
    const error = new AppError(409, "Los subprocesos solo pueden completarse en Produccion.");
    throw error;
  }

  if (detail.fecha_real_termino) {
    const error = new AppError(409, "Todos los subprocesos de este producto ya estan completos.");
    throw error;
  }

  const subprocesses = detail.Tipo_Producto?.Producto_Subproceso ?? [];
  const processIndex = subprocesses.findIndex(
    (process) =>
      Number(process.id_estado_subproceso) === Number(subprocessId),
  );

  if (processIndex < 0) {
    const error = new AppError(404, "Subproceso no encontrado para este producto.");
    throw error;
  }

  const currentIndex = subprocesses.findIndex(
    (process) =>
      Number(process.id_estado_subproceso) ===
      Number(detail.id_estado_subproceso),
  );

  if (currentIndex < 0 || processIndex !== currentIndex) {
    const error = new AppError(409, "Debe completar primero el subproceso actual.");
    throw error;
  }

  const now = new Date();
  const nextSubprocess = subprocesses[processIndex + 1] ?? null;
  const firstSubprocess = subprocesses[0] ?? null;
  const isLanyard = isLanyardProduct(detail.Tipo_Producto?.nombre_producto);
  const shouldCheckLanyardProgress =
    isLanyard && nextSubprocess && isPackagingSubprocess(nextSubprocess);
  const latestLanyardProgress = isLanyard
    ? await repository.client.avance_Lanyard.findFirst({
        where: { id_detalle_pedido: Number(detailId) },
        orderBy: [
          { fecha_produccion: "desc" },
          { id_avance_lanyard: "desc" },
        ],
      })
    : null;
  const lanyardProgressPercentage = Number(
    latestLanyardProgress?.porcentaje_acumulado ?? 0,
  );
  const shouldRepeatLanyardFlow =
    shouldCheckLanyardProgress &&
    lanyardProgressPercentage < 100 &&
    firstSubprocess;
  const targetSubprocess = shouldRepeatLanyardFlow
    ? firstSubprocess
    : nextSubprocess;

  const latestSubprocessRecord = await repository.client.registro_subprocesos.findFirst({
    where: { id_detalle_pedido: Number(detailId) },
    include: { Registros: true },
    orderBy: { Registros: { FECHA_HORA: "desc" } },
  });
  const productionStageRecord = latestSubprocessRecord
    ? null
    : await repository.client.registro_Etapas.findFirst({
        where: {
          Registros: { id_pedido: Number(orderId) },
          Estado_Pedido: { nombre_etapa: "En producción" },
        },
        orderBy: { fecha_hora_entrada: "desc" },
      });
  const startedAt =
    latestSubprocessRecord?.fecha_hora_salida ??
    latestSubprocessRecord?.fecha_hora_entrada ??
    productionStageRecord?.fecha_hora_entrada ??
    order.fecha_creacion ??
    now;

  const transition = await repository.client.detalle_pedido.updateMany({
    where: {
      id_detalle_pedido: Number(detailId),
      id_pedido: Number(orderId),
      id_estado_subproceso: Number(subprocessId),
      fecha_real_termino: null,
    },
    data: {
      id_estado_subproceso:
        targetSubprocess?.id_estado_subproceso ?? detail.id_estado_subproceso,
      fecha_real_termino: nextSubprocess ? null : now,
    },
  });

  // La actualización condicional actúa como barrera de idempotencia. Si dos
  // solicitudes llegan juntas, solo la primera puede avanzar el detalle.
  if (transition.count !== 1) {
    const error = new AppError(409, "El subproceso ya fue completado.");
    throw error;
  }

  const registry = await repository.client.registros.create({
    data: {
      FECHA_HORA: now,
      id_pedido: Number(orderId),
      id_usuario: Number(userId),
      observacion: String(comment ?? "").trim() || null,
    },
  });

  await repository.client.registro_subprocesos.create({
    data: {
      id_registro: registry.ID_REGISTRO,
      fecha_hora_entrada: startedAt,
      fecha_hora_salida: now,
      id_detalle_pedido: Number(detailId),
      id_estado_subproceso: Number(subprocessId),
    },
  });
  return repository.get(orderId);
}

export async function rollbackSubprocessOperation(repository, { orderId, detailId, subprocessId, userId, comment }) {
  await repository.lockProductionOrder(orderId);
  const detail = await repository.client.detalle_pedido.findFirst({
    ...snapshotOmit(await supportsOrderSnapshots(repository.client)),
    where: { id_pedido: Number(orderId), id_detalle_pedido: Number(detailId) },
    include: { Tipo_Producto: { include: { Producto_Subproceso: { orderBy: { orden_flujo: "asc" } } } } },
  });
  if (!detail) return null;
  const order = await repository.getTransitionState(orderId);
  if (!order || Number(order.id_etapa_general) !== 2 || order.estado_pago !== "Confirmado") {
    const error = new AppError(409, "El pedido debe estar en produccion y con pago confirmado."); throw error;
  }

  const subprocesses = detail.Tipo_Producto?.Producto_Subproceso ?? [];
  const currentIndex = subprocesses.findIndex((item) =>
    Number(item.id_estado_subproceso) === Number(detail.id_estado_subproceso));
  const targetIndex = subprocesses.findIndex((item) =>
    Number(item.id_estado_subproceso) === Number(subprocessId));
  const rollbackIndex = detail.fecha_real_termino ? currentIndex : currentIndex - 1;
  if (currentIndex < 0 || rollbackIndex < 0 || targetIndex !== rollbackIndex) {
    const error = new AppError(409, "Solo se puede retroceder al subproceso inmediatamente anterior.");
    throw error;
  }

  const changed = await repository.client.detalle_pedido.updateMany({
    where: {
      id_detalle_pedido: Number(detailId),
      id_pedido: Number(orderId),
      id_estado_subproceso: detail.id_estado_subproceso,
    },
    data: { id_estado_subproceso: Number(subprocessId), fecha_real_termino: null },
  });
  if (changed.count !== 1) {
    const error = new AppError(409, "El subproceso ya fue modificado.");
    throw error;
  }

  const now = new Date();
  const registry = await repository.client.registros.create({ data: {
    FECHA_HORA: now, id_pedido: Number(orderId), id_usuario: Number(userId), observacion: comment,
  } });
  await repository.client.registro_subprocesos.create({ data: {
    id_registro: registry.ID_REGISTRO,
    fecha_hora_entrada: now,
    fecha_hora_salida: null,
    id_detalle_pedido: Number(detailId),
    id_estado_subproceso: Number(subprocessId),
  } });
  return repository.get(orderId);
}
