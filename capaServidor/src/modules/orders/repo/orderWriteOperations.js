

export const ORDER_UPDATE_FIELDS = new Set([
  "fecha_estimada_termino",
  "id_usuario",
  "id_estado_pedido",
  "id_estado_pago",
  "id_cliente",
  "id_etiqueta",
]);

export async function recordCreationOperation(repository, { orderId, userId, stateId, now = new Date() }) {
  const registry = await repository.client.registros.create({ data: {
    FECHA_HORA: now,
    id_pedido: Number(orderId),
    id_usuario: Number(userId),
    observacion: "Pedido registrado desde Nota de Venta.",
  } });
  await repository.client.registro_Etapas.create({ data: {
    id_registro: registry.ID_REGISTRO,
    fecha_hora_entrada: now,
    fecha_hora_salida: null,
    id_estado_pedido: Number(stateId),
  } });
}

export async function createOperation(repository, data, { hydrate = true } = {}) {
  const {
    id_cliente,
    id_usuario,
    id_estado_pedido,
    id_estado_pago,
    id_etiqueta,
    fecha_estimada_termino,
    numero_nota_venta,
    usuario_manager_origen,
    observacion_origen,
    observacion_interna,
  } = data;

  const order = await repository.client.pedidos.create({
    data: {
      fecha_creacion: new Date(),
      fecha_estimada_termino: fecha_estimada_termino ?? null,
      id_usuario: Number(id_usuario),
      id_estado_pedido: Number(id_estado_pedido),
      id_estado_pago: Number(id_estado_pago),
      id_cliente: Number(id_cliente),
      id_etiqueta: id_etiqueta === undefined || id_etiqueta === null
        ? null
        : Number(id_etiqueta),
      numero_nota_venta: numero_nota_venta ?? null,
      usuario_manager_origen: usuario_manager_origen ?? null,
      observacion_origen: observacion_origen ?? null,
      observacion_interna: observacion_interna ?? null,
      observacion: observacion_interna ?? observacion_origen ?? null,
    },
  });

  return hydrate ? repository.get(order.id_pedido) : order;
}

export async function addLabelsOperation(repository, orderId, labelIds = [], userId = null) {
  if (!Array.isArray(labelIds) || labelIds.length === 0) return [];

  return Promise.all(
    labelIds.map((labelId) =>
      repository.client.pedido_Etiqueta.create({
        data: {
          id_pedido: Number(orderId),
          id_etiqueta: Number(labelId),
          id_usuario_asigna: userId ? Number(userId) : null,
        },
      }),
    ),
  );
}

export async function createUntrackedItemsOperation(repository, orderId, items = []) {
  if (!Array.isArray(items) || items.length === 0) return [];

  return Promise.all(
    items.map((item) =>
      repository.client.pedido_Item_Sin_Seguimiento.create({
        data: {
          id_pedido: Number(orderId),
          codigo: item.codigo ?? null,
          producto: item.producto,
          cantidad: item.cantidad ?? null,
          subfamilia: item.subfamilia ?? null,
        },
      }),
    ),
  );
}

export async function updateOperation(repository, id, data) {
  const entries = Object.entries(data)
    .filter(([key, value]) => ORDER_UPDATE_FIELDS.has(key) && value !== undefined);

  if (entries.length === 0) {
    return repository.get(id);
  }

  try {
    await repository.client.pedidos.update({
      where: { id_pedido: Number(id) },
      data: Object.fromEntries(entries),
    });
  } catch (error) {
    if (error?.code === "P2025") return null;
    throw error;
  }

  return repository.get(id);
}

export async function setOrderLabelOperation(repository, { orderId, label, active, userId }) {
  let tag = await repository.client.etiqueta.findFirst({ where: { nombre_etiqueta: label } });
  if (!tag) {
    const last = await repository.client.etiqueta.findFirst({ orderBy: { id_etiqueta: "desc" }, select: { id_etiqueta: true } });
    tag = await repository.client.etiqueta.create({ data: {
      id_etiqueta: (last?.id_etiqueta ?? 0) + 1, nombre_etiqueta: label,
      descripcion: "Etiqueta de organización del Kanban", esta_activa: 1,
    } });
  }
  if (active) {
    await repository.client.pedido_Etiqueta.upsert({
      where: { id_pedido_id_etiqueta: { id_pedido: Number(orderId), id_etiqueta: tag.id_etiqueta } },
      update: { id_usuario_asigna: Number(userId), fecha_asignacion: new Date() },
      create: { id_pedido: Number(orderId), id_etiqueta: tag.id_etiqueta, id_usuario_asigna: Number(userId) },
    });
  } else {
    await repository.client.pedido_Etiqueta.deleteMany({ where: { id_pedido: Number(orderId), id_etiqueta: tag.id_etiqueta } });
  }
  await repository.client.registros.create({ data: {
    FECHA_HORA: new Date(), id_pedido: Number(orderId), id_usuario: Number(userId),
    observacion: `${active ? "Asignó" : "Quitó"} etiqueta ${label}.`,
  } });
  const assignedLabels = await repository.client.pedido_Etiqueta.findMany({
    where: { id_pedido: Number(orderId) },
    include: { etiqueta: true },
  });
  return {
    id_pedido: Number(orderId),
    etiquetas: assignedLabels.map((item) => item.etiqueta).filter(Boolean),
  };
}

export async function updateDeliveryDateOperation(repository, id, dueDate, audit = {}) {
  try {
    await repository.client.pedidos.update({
      where: { id_pedido: Number(id) },
      data: {
        fecha_estimada_termino: dueDate,
        Detalle_pedido: {
          updateMany: {
            where: { id_pedido: Number(id) },
            data: { fecha_estimada_termino: dueDate },
          },
        },
      },
    });

    if (audit.userId) {
      await repository.client.registros.create({
        data: {
          FECHA_HORA: audit.now ?? new Date(),
          id_pedido: Number(id),
          id_usuario: Number(audit.userId),
          observacion: audit.comment ?? null,
        },
      });
    }
  } catch (error) {
    if (error?.code === "P2025") return null;
    throw error;
  }

  return repository.get(id);
}
