

export async function lockPaymentOrderOperation(repository, id) {
  // Esta lectura debe ser la primera consulta dentro de la transaccion de pago.
  // La fila queda bloqueada hasta que se escriban estado, auditoria y avisos.
  const rows = await repository.client.$queryRaw`
      SELECT id_pedido FROM Pedidos
      WHERE id_pedido = ${Number(id)}
      FOR UPDATE
    `;
  return rows.length > 0;
}

export async function updatePaymentStatusOperation(repository, id, paymentStatusId, nextKanbanOrder, { currentOrder, paymentStatusName } = {}) {
  const shouldUpdateOrderStage =
    nextKanbanOrder !== null && nextKanbanOrder !== undefined;
  const status = shouldUpdateOrderStage
    ? await repository.client.estado_Pedido.findFirst({
        where: { orden_kanban: Number(nextKanbanOrder) },
        select: {
          id_estado_pedido: true,
          nombre_etapa: true,
          orden_kanban: true,
        },
      })
    : null;

  if (shouldUpdateOrderStage && !status) return null;

  try {
    await repository.client.pedidos.update({
      where: { id_pedido: Number(id) },
      data: {
        id_estado_pago: Number(paymentStatusId),
        ...(shouldUpdateOrderStage
          ? { id_estado_pedido: status.id_estado_pedido }
          : {}),
      },
    });
  } catch (error) {
    if (error?.code === "P2025") return null;
    throw error;
  }

  if (!currentOrder) return repository.getPaymentOrder(id);

  const normalizedPaymentStatus =
    paymentStatusName ?? currentOrder.estado_pago ?? null;
  const normalizedKanbanOrder = shouldUpdateOrderStage
    ? Number(status.orden_kanban ?? nextKanbanOrder)
    : currentOrder.id_etapa_general;

  return {
    ...currentOrder,
    id_estado_pago: Number(paymentStatusId),
    estado_pago: normalizedPaymentStatus,
    paymentStatus: normalizedPaymentStatus,
    id_estado_pedido: shouldUpdateOrderStage
      ? status.id_estado_pedido
      : currentOrder.id_estado_pedido,
    id_etapa_general: normalizedKanbanOrder,
    generalStepId: normalizedKanbanOrder,
    nombre_etapa_general: shouldUpdateOrderStage
      ? status.nombre_etapa
      : currentOrder.nombre_etapa_general,
  };
}
