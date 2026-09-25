import { ROLES } from "../../../config/roles.js";
import getPrismaClient from "../../../database/prisma.js";


const ORDER_UPDATE_FIELDS = new Set([
  "fecha_estimada_termino",
  "id_usuario",
  "id_estado_pedido",
  "id_estado_pago",
  "id_cliente",
  "id_etiqueta",
]);

function uniqueProductNames(details = []) {
  const names = details
    .map((detail) => detail.Tipo_Producto?.nombre_producto)
    .filter(Boolean);

  return [...new Set(names)].join(", ");
}

function uniqueProductDescriptions(details = []) {
  const descriptions = details
    .map((detail) => detail.Tipo_Producto?.descripcion_producto)
    .filter(Boolean);

  return [...new Set(descriptions)].join(", ");
}

function totalQuantity(details = []) {
  const quantities = details
    .map((detail) => Number(detail.cantidad))
    .filter((quantity) => Number.isFinite(quantity));

  if (quantities.length === 0) return null;

  return quantities.reduce((sum, quantity) => sum + quantity, 0);
}

function normalizeProcessName(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

function isLanyardProduct(value) {
  return normalizeProcessName(value).includes("lanyard");
}

function isPackagingSubprocess(process) {
  return normalizeProcessName(process?.Estado_Subprocesos?.nombre_estado).includes("empaquet");
}

function formatLanyardProgressObservation(progress, totalQuantity) {
  if (!progress) return null;
  const percentage = Number(progress.porcentaje_acumulado ?? 0);
  const accumulated = Number(progress.cantidad_acumulada ?? 0);
  const total = Number(totalQuantity ?? 0);

  if (!Number.isFinite(percentage)) return null;

  const roundedPercentage = Math.round(percentage);
  const quantityText = Number.isFinite(total) && total > 0
    ? ` (${accumulated}/${total} producidos)`
    : "";

  return `Avance Lanyard: ${roundedPercentage}%${quantityText}`;
}

function mergeObservation(comment, systemObservation) {
  const trimmedComment = String(comment ?? "").trim();
  const trimmedSystemObservation = String(systemObservation ?? "").trim();

  return [trimmedComment, trimmedSystemObservation].filter(Boolean).join("\n") || null;
}

function mapDetailSubprocesses(detail) {
  const productSubprocesses = detail.Tipo_Producto?.Producto_Subproceso;

  if (!Array.isArray(productSubprocesses) || productSubprocesses.length === 0) {
    return [];
  }

  const sortedSubprocesses = [...productSubprocesses].sort(
    (left, right) => Number(left.orden_flujo ?? 0) - Number(right.orden_flujo ?? 0),
  );
  const currentIndex = sortedSubprocesses.findIndex(
    (item) =>
      Number(item.id_estado_subproceso) === Number(detail.id_estado_subproceso),
  );
  const isFinished = Boolean(detail.fecha_real_termino);

  return sortedSubprocesses.map((item, index) => {
    const name = item.Estado_Subprocesos?.nombre_estado ?? "Subproceso";

    return {
      id: String(item.id_estado_subproceso ?? normalizeProcessName(name)),
      name,
      status:
        isFinished || (currentIndex > -1 && index < currentIndex)
          ? "done"
          : "pending",
      order: item.orden_flujo ?? index + 1,
    };
  });
}

function mapLanyardProgress(detail) {
  const latest = Array.isArray(detail.Avance_Lanyard) ? detail.Avance_Lanyard[0] : null;
  const quantity = Number(detail.cantidad ?? 0);
  const accumulated = Number(latest?.cantidad_acumulada ?? 0);
  const percentage = Number(latest?.porcentaje_acumulado ?? 0);

  return {
    accumulatedQuantity: accumulated,
    totalQuantity: Number.isFinite(quantity) && quantity > 0 ? quantity : null,
    remainingQuantity: Number.isFinite(quantity) && quantity > 0 ? Math.max(0, quantity - accumulated) : null,
    percentage,
    updatedAt: latest?.fecha_actualizacion ?? latest?.fecha_registro ?? null,
    lastProductionDate: latest?.fecha_produccion ?? null,
  };
}

function mapOrderDetail(detail) {
  return {
    id_detalle_pedido: detail.id_detalle_pedido ?? null,
    id: detail.id_detalle_pedido ? String(detail.id_detalle_pedido) : null,
    id_tipo_producto: detail.id_tipo_producto ?? null,
    nombre_producto: detail.Tipo_Producto?.nombre_producto ?? null,
    product: detail.Tipo_Producto?.nombre_producto ?? null,
    descripcion_producto: detail.Tipo_Producto?.descripcion_producto ?? null,
    cantidad: detail.cantidad ?? null,
    quantity: detail.cantidad ?? null,
    fecha_estimada_termino: detail.fecha_estimada_termino ?? null,
    dueDate: detail.fecha_estimada_termino ?? null,
    fecha_real_termino: detail.fecha_real_termino ?? null,
    id_estado_subproceso: detail.id_estado_subproceso ?? null,
    estado_subproceso: detail.Estado_Subprocesos?.nombre_estado ?? null,
    lanyardProgress: mapLanyardProgress(detail),
    subProcesses: mapDetailSubprocesses(detail),
  };
}

function mapUntrackedItem(item) {
  return {
    id_item_sin_seguimiento: item.id_item_sin_seguimiento ?? null,
    codigo: item.codigo ?? null,
    producto: item.producto ?? null,
    cantidad: item.cantidad ?? null,
    subfamilia: item.subfamilia ?? null,
  };
}

function personName(user) {
  return [user?.nombre_usuario, user?.apellido_usuario].filter(Boolean).join(" ").trim();
}

function mapOrderComments(order) {
  const originObservation = String(order?.observacion_origen ?? "").trim();
  const internalObservation = String(order?.observacion_interna ?? "").trim();
  const source = originObservation
    ? [
        {
          id: `pedido-${order.id_pedido}-observacion-origen`,
          text: originObservation,
          createdAt: order.fecha_creacion ?? null,
          type: "source",
        },
      ]
    : [];
  const system = internalObservation
    ? [
        {
          id: `pedido-${order.id_pedido}-observacion-interna`,
          text: internalObservation,
          createdAt: order.fecha_creacion ?? null,
          type: "system",
        },
      ]
    : [];
  const subprocesses = Array.isArray(order?.Registros)
    ? order.Registros
        .filter((record) => record?.registro_subprocesos && String(record?.observacion ?? "").trim())
        .map((record) => {
          const subprocess = record.registro_subprocesos;

          return {
            id: `registro-${record.ID_REGISTRO}`,
            text: String(record.observacion ?? "").trim(),
            createdAt: record.FECHA_HORA ?? null,
            productType: subprocess.Detalle_pedido?.Tipo_Producto?.nombre_producto ?? null,
            responsible: personName(record.Usuario) || record.Usuario?.correo_usuario || null,
            subprocessName: subprocess.Estado_Subprocesos?.nombre_estado ?? "Subproceso",
            type: "subprocess",
          };
        })
        .sort((left, right) => new Date(left.createdAt ?? 0) - new Date(right.createdAt ?? 0))
    : [];

  const all = [...source, ...system, ...subprocesses]
    .filter((comment) => String(comment.text ?? "").trim())
    .sort((left, right) => new Date(left.createdAt ?? 0) - new Date(right.createdAt ?? 0));

  return {
    all,
    source,
    subprocesses,
    system,
  };
}

function toOrderSummaryDTO(order, paymentStatusName = null) {
  if (!order) return null;

  const mappedComments = mapOrderComments(order);
  const detallePedido = Array.isArray(order.Detalle_pedido) ? order.Detalle_pedido : [];
  const totalProductNames = detallePedido.length > 0 ? uniqueProductNames(detallePedido) : undefined;
  const descripcionProducto = detallePedido.length > 0 ? uniqueProductDescriptions(detallePedido) : undefined;
  const quantityTotal = detallePedido.length > 0 ? totalQuantity(detallePedido) : null;

  return {
    id: order.id_pedido ?? null,
    id_pedido: order.id_pedido ?? null,
    numero_nota_venta: order.numero_nota_venta ?? null,
    fecha_creacion: order.fecha_creacion ?? null,
    fecha_estimada_termino: order.fecha_estimada_termino ?? null,
    dueDate: order.fecha_estimada_termino ?? null,
    id_cliente: order.id_cliente ?? null,
    id_usuario: order.id_usuario ?? null,
    usuario_manager_origen: order.usuario_manager_origen ?? null,
    nombre_cliente: order.Cliente?.nombre_cliente ?? null,
    rut_cliente: order.Cliente?.rut_cliente ?? null,
    razon_social: order.Cliente?.razon_social ?? null,
    nombre_producto: totalProductNames,
    product: totalProductNames,
    descripcion_producto: descripcionProducto,
    cantidad: quantityTotal,
    quantity: quantityTotal,
    detalles: detallePedido.map(mapOrderDetail),
    id_etapa_general: order.Estado_Pedido?.orden_kanban ?? null,
    generalStepId: order.Estado_Pedido?.orden_kanban ?? null,
    nombre_etapa_general: order.Estado_Pedido?.nombre_etapa ?? null,
    id_estado_pago: order.id_estado_pago ?? null,
    paymentStatusId: order.id_estado_pago ?? null,
    id_estado_pedido: order.id_estado_pedido ?? null,
    estado_pago: paymentStatusName ?? order.Estado_Pago?.nombre_estado_pago ?? null,
    paymentStatus: paymentStatusName ?? order.Estado_Pago?.nombre_estado_pago ?? null,
    etiquetas: Array.isArray(order.Pedido_Etiqueta)
      ? order.Pedido_Etiqueta.map((item) => item.etiqueta).filter(Boolean)
      : [],
    itemsSinSeguimientoProductivo: Array.isArray(order.Pedido_Item_Sin_Seguimiento)
      ? order.Pedido_Item_Sin_Seguimiento.map(mapUntrackedItem)
      : [],
    comments: mappedComments.all,
    commentGroups: mappedComments,
  };
}

function toOrderDetailDTO(order, paymentStatusName = null) {
  if (!order) return null;

  return {
    ...toOrderSummaryDTO(order, paymentStatusName),
    observacion_origen: order.observacion_origen ?? null,
    observacion_interna: order.observacion_interna ?? null,
  };
}

function mapOrderRow(order, paymentStatusName = null) {
  return toOrderSummaryDTO(order, paymentStatusName);
}

function mapPaymentOrderRow(order) {
  if (!order) return null;

  return {
    id_pedido: order.id_pedido,
    numero_nota_venta: order.numero_nota_venta,
    fecha_creacion: order.fecha_creacion,
    id_estado_pago: order.id_estado_pago,
    id_estado_pedido: order.id_estado_pedido,
    nombre_cliente: order.nombre_cliente ?? null,
    razon_social: order.razon_social ?? null,
    rut_cliente: order.rut_cliente ?? null,
    id_etapa_general: order.id_etapa_general ?? null,
    generalStepId: order.id_etapa_general ?? null,
    nombre_etapa_general: order.nombre_etapa_general ?? null,
    estado_pago: order.estado_pago ?? null,
    paymentStatus: order.estado_pago ?? null,
  };
}

const orderReadSelect = {
  id_pedido: true,
  id_cliente: true,
  id_usuario: true,
  id_estado_pedido: true,
  id_estado_pago: true,
  numero_nota_venta: true,
  fecha_creacion: true,
  fecha_estimada_termino: true,
  observacion_origen: true,
  observacion_interna: true,
  usuario_manager_origen: true,
  Cliente: {
    select: {
      nombre_cliente: true,
      rut_cliente: true,
      razon_social: true,
    },
  },
  Detalle_pedido: {
    select: {
      id_detalle_pedido: true,
      id_tipo_producto: true,
      cantidad: true,
      fecha_estimada_termino: true,
      fecha_real_termino: true,
      id_estado_subproceso: true,
      Tipo_Producto: {
        select: {
          nombre_producto: true,
          descripcion_producto: true,
          Producto_Subproceso: {
            orderBy: { orden_flujo: "asc" },
            select: {
              id_estado_subproceso: true,
              orden_flujo: true,
              Estado_Subprocesos: { select: { nombre_estado: true } },
            },
          },
        },
      },
      Estado_Subprocesos: { select: { nombre_estado: true } },
      Avance_Lanyard: {
        orderBy: [
          { fecha_produccion: "desc" },
          { id_avance_lanyard: "desc" },
        ],
        take: 1,
        select: {
          cantidad_acumulada: true,
          porcentaje_acumulado: true,
          fecha_actualizacion: true,
          fecha_produccion: true,
        },
      },
    },
  },
  Estado_Pedido: { select: { orden_kanban: true, nombre_etapa: true } },
  Estado_Pago: { select: { nombre_estado_pago: true } },
  Pedido_Etiqueta: {
    select: {
      etiqueta: {
        select: {
          id_etiqueta: true,
          nombre_etiqueta: true,
        },
      },
    },
  },
  Pedido_Item_Sin_Seguimiento: {
    select: {
      id_item_sin_seguimiento: true,
      codigo: true,
      producto: true,
      cantidad: true,
      subfamilia: true,
    },
  },
  Registros: {
    where: {
      observacion: { not: null },
      registro_subprocesos: { isNot: null },
    },
    orderBy: [
      { FECHA_HORA: "asc" },
      { ID_REGISTRO: "asc" },
    ],
    select: {
      ID_REGISTRO: true,
      FECHA_HORA: true,
      observacion: true,
      Usuario: {
        select: {
          nombre_usuario: true,
          apellido_usuario: true,
          correo_usuario: true,
        },
      },
      registro_subprocesos: {
        select: {
          Estado_Subprocesos: { select: { nombre_estado: true } },
          Detalle_pedido: {
            select: {
              Tipo_Producto: {
                select: { nombre_producto: true },
              },
            },
          },
        },
      },
    },
  },
};

class OrderRepository {
  constructor({ prisma } = {}) {
    this.prisma = prisma;
  }

  get client() {
    if (!this.prisma) {
      this.prisma = getPrismaClient();
    }

    return this.prisma;
  }

  async getBySalesNoteNumber(numeroNota) {
    return this.client.pedidos.findFirst({
      where: { numero_nota_venta: String(numeroNota) },
      select: orderReadSelect,
    });
  }

  async existsBySalesNoteNumber(numeroNota) {
    const order = await this.client.pedidos.findFirst({
      where: { numero_nota_venta: String(numeroNota) },
      select: { id_pedido: true },
    });

    return Boolean(order);
  }

  async getAllOrders() {
    const orders = await this.client.pedidos.findMany({
      select: orderReadSelect,
      orderBy: { id_pedido: "desc" },
    });

    return orders.map((order) => mapOrderRow(order));
  }

  async getPaymentOrders() {
    const orders = await this.client.$queryRaw`
      SELECT
        p.id_pedido,
        p.numero_nota_venta,
        p.fecha_creacion,
        p.id_estado_pago,
        p.id_estado_pedido,
        c.nombre_cliente,
        c.razon_social,
        c.rut_cliente,
        ep.nombre_etapa AS nombre_etapa_general,
        ep.orden_kanban AS id_etapa_general,
        epa.nombre_estado_pago AS estado_pago
      FROM Pedidos p
      LEFT JOIN Cliente c ON c.id_cliente = p.id_cliente
      LEFT JOIN Estado_Pedido ep ON ep.id_estado_pedido = p.id_estado_pedido
      LEFT JOIN Estado_Pago epa ON epa.id_estado_pago = p.id_estado_pago
      ORDER BY p.id_pedido DESC
    `;

    return orders.map(mapPaymentOrderRow);
  }

  async getPaymentOrder(id) {
    const orders = await this.client.$queryRaw`
      SELECT
        p.id_pedido,
        p.numero_nota_venta,
        p.fecha_creacion,
        p.id_estado_pago,
        p.id_estado_pedido,
        c.nombre_cliente,
        c.razon_social,
        c.rut_cliente,
        ep.nombre_etapa AS nombre_etapa_general,
        ep.orden_kanban AS id_etapa_general,
        epa.nombre_estado_pago AS estado_pago
      FROM Pedidos p
      LEFT JOIN Cliente c ON c.id_cliente = p.id_cliente
      LEFT JOIN Estado_Pedido ep ON ep.id_estado_pedido = p.id_estado_pedido
      LEFT JOIN Estado_Pago epa ON epa.id_estado_pago = p.id_estado_pago
      WHERE p.id_pedido = ${Number(id)}
      LIMIT 1
    `;

    return mapPaymentOrderRow(orders[0]);
  }

  async get(id) {
    const order = await this.client.pedidos.findUnique({
      where: { id_pedido: Number(id) },
      select: orderReadSelect,
    });

    return toOrderDetailDTO(order);
  }

  async getTransitionState(id) {
    const order = await this.client.pedidos.findUnique({
      where: { id_pedido: Number(id) },
      select: {
        id_pedido: true,
        id_estado_pedido: true,
        id_estado_pago: true,
        Estado_Pedido: { select: { orden_kanban: true, nombre_etapa: true } },
        Estado_Pago: { select: { nombre_estado_pago: true } },
      },
    });

    if (!order) return null;

    return {
      id_pedido: order.id_pedido,
      id_estado_pedido: order.id_estado_pedido,
      id_estado_pago: order.id_estado_pago,
      id_etapa_general: order.Estado_Pedido?.orden_kanban ?? null,
      generalStepId: order.Estado_Pedido?.orden_kanban ?? null,
      nombre_etapa_general: order.Estado_Pedido?.nombre_etapa ?? null,
      estado_pago: order.Estado_Pago?.nombre_estado_pago ?? null,
      paymentStatus: order.Estado_Pago?.nombre_estado_pago ?? null,
    };
  }

  async create(data, { hydrate = true } = {}) {
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

    const order = await this.client.pedidos.create({
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

    return hydrate ? this.get(order.id_pedido) : order;
  }

  async addLabels(orderId, labelIds = [], userId = null) {
    if (!Array.isArray(labelIds) || labelIds.length === 0) return [];

    return Promise.all(
      labelIds.map((labelId) =>
        this.client.pedido_Etiqueta.create({
          data: {
            id_pedido: Number(orderId),
            id_etiqueta: Number(labelId),
            id_usuario_asigna: userId ? Number(userId) : null,
          },
        }),
      ),
    );
  }

  async createUntrackedItems(orderId, items = []) {
    if (!Array.isArray(items) || items.length === 0) return [];

    return Promise.all(
      items.map((item) =>
        this.client.pedido_Item_Sin_Seguimiento.create({
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

  async getProductSubprocesses(productTypeId) {
    return this.client.producto_Subproceso.findMany({
      where: { id_tipo_producto: Number(productTypeId) },
      include: { Estado_Subprocesos: true },
      orderBy: { orden_flujo: "asc" },
    });
  }

  async update(id, data) {
    const entries = Object.entries(data)
      .filter(([key, value]) => ORDER_UPDATE_FIELDS.has(key) && value !== undefined);

    if (entries.length === 0) {
      return this.get(id);
    }

    try {
      await this.client.pedidos.update({
        where: { id_pedido: Number(id) },
        data: Object.fromEntries(entries),
      });
    } catch (error) {
      if (error?.code === "P2025") return null;
      throw error;
    }

    return this.get(id);
  }

  async transitionGeneralStage({ id, ordenKanban, statusName, userId, comment, now = new Date(), compact = false, expectedState }) {
    const status = await this.client.estado_Pedido.findFirst({
      where: statusName
        ? { nombre_etapa: statusName }
        : { orden_kanban: Number(ordenKanban) },
      select: { id_estado_pedido: true, orden_kanban: true, nombre_etapa: true },
    });

    if (!status) return null;

    try {
      const transition = await this.client.pedidos.updateMany({
        where: {
          id_pedido: Number(id),
          NOT: { id_estado_pedido: status.id_estado_pedido },
          ...(expectedState ? {
            id_estado_pedido: expectedState.id_estado_pedido,
            id_estado_pago: expectedState.id_estado_pago,
          } : {}),
        },
        data: {
          id_estado_pedido: status?.id_estado_pedido ?? null,
        },
      });

      // Evita duplicar registros si la misma transición llega más de una vez.
      if (transition.count !== 1) {
        if (expectedState) {
          const error = new Error("El pedido cambio mientras se procesaba la solicitud. Actualiza el tablero e intenta nuevamente.");
          error.statusCode = 409;
          throw error;
        }
        return null;
      }

      await this.client.registro_Etapas.updateMany({
        where: {
          fecha_hora_salida: null,
          Registros: { id_pedido: Number(id) },
        },
        data: { fecha_hora_salida: now },
      });

      const registry = await this.client.registros.create({
        data: {
          FECHA_HORA: now,
          id_pedido: Number(id),
          id_usuario: Number(userId),
          observacion: comment?.trim() || null,
        },
      });

      await this.client.registro_Etapas.create({
        data: {
          id_registro: registry.ID_REGISTRO,
          fecha_hora_entrada: now,
          fecha_hora_salida: null,
          id_estado_pedido: status.id_estado_pedido,
        },
      });
    } catch (error) {
      if (error?.code === "P2025") return null;
      throw error;
    }

    if (Number(status.orden_kanban) === 3) {
      const responsibleOrder = await this.client.pedidos.findUnique({
        where: { id_pedido: Number(id) },
        select: { id_pedido: true, id_usuario: true, numero_nota_venta: true },
      });
      await this.notifyOrderReady(responsibleOrder, now);
    }
    if (compact) {
      return {
        id_pedido: Number(id),
        id_estado_pedido: status.id_estado_pedido,
        id_etapa_general: status.orden_kanban,
        generalStepId: status.orden_kanban,
        nombre_etapa_general: status.nombre_etapa,
      };
    }

    return this.get(id);
  }

  async setOrderLabel({ orderId, label, active, userId }) {
    let tag = await this.client.etiqueta.findFirst({ where: { nombre_etiqueta: label } });
    if (!tag) {
      const last = await this.client.etiqueta.findFirst({ orderBy: { id_etiqueta: "desc" }, select: { id_etiqueta: true } });
      tag = await this.client.etiqueta.create({ data: {
        id_etiqueta: (last?.id_etiqueta ?? 0) + 1, nombre_etiqueta: label,
        descripcion: "Etiqueta de organización del Kanban", esta_activa: 1,
      } });
    }
    if (active) {
      await this.client.pedido_Etiqueta.upsert({
        where: { id_pedido_id_etiqueta: { id_pedido: Number(orderId), id_etiqueta: tag.id_etiqueta } },
        update: { id_usuario_asigna: Number(userId), fecha_asignacion: new Date() },
        create: { id_pedido: Number(orderId), id_etiqueta: tag.id_etiqueta, id_usuario_asigna: Number(userId) },
      });
    } else {
      await this.client.pedido_Etiqueta.deleteMany({ where: { id_pedido: Number(orderId), id_etiqueta: tag.id_etiqueta } });
    }
    await this.client.registros.create({ data: {
      FECHA_HORA: new Date(), id_pedido: Number(orderId), id_usuario: Number(userId),
      observacion: `${active ? "Asignó" : "Quitó"} etiqueta ${label}.`,
    } });
    const assignedLabels = await this.client.pedido_Etiqueta.findMany({
      where: { id_pedido: Number(orderId) },
      include: { etiqueta: true },
    });
    return {
      id_pedido: Number(orderId),
      etiquetas: assignedLabels.map((item) => item.etiqueta).filter(Boolean),
    };
  }

  async updateGeneralStep(id, ordenKanban, audit = {}) {
    if (Number(ordenKanban) === 3) {
      await this.lockProductionOrder(id);
      const details = await this.client.detalle_pedido.findMany({
        where: { id_pedido: Number(id) },
        select: { fecha_real_termino: true },
      });
      if (details.length === 0 || details.some((detail) => !detail.fecha_real_termino)) {
        const error = new Error("Todos los detalles deben completar sus subprocesos antes de pasar a Listo para Entrega.");
        error.statusCode = 409;
        throw error;
      }
    }
    return this.transitionGeneralStage({
      id,
      ordenKanban,
      userId: audit.userId,
      comment: audit.comment,
      now: audit.now,
      compact: true,
      expectedState: audit.expectedState,
    });
  }

  async sendToReview(id, audit = {}) {
    const updatedOrder = await this.transitionGeneralStage({
      id,
      statusName: "En revisión",
      userId: audit.userId,
      comment: audit.comment,
      now: audit.now,
    });

    const responsibleUserId = Number(updatedOrder?.id_usuario);
    if (!updatedOrder || !Number.isInteger(responsibleUserId) || responsibleUserId <= 0) {
      return updatedOrder;
    }

    const message = await this.client.mensaje.create({
      data: {
        id_pedido: Number(id),
        fecha_publicacion: audit.now ?? new Date(),
        Asunto: "Pedido enviado a revisión",
        contenido: [
          `El pedido ${updatedOrder.numero_nota_venta ?? `#${id}`} fue enviado a revisión por Producción.`,
          audit.comment ? `Observación: ${audit.comment}` : null,
        ].filter(Boolean).join("\n"),
      },
    });

    await this.client.mENSAJE_USUARIO.create({
      data: {
        id_usuario: responsibleUserId,
        id_mensaje: message.id_mensaje,
        leido_: false,
        oculto_: false,
      },
    });

    return updatedOrder;
  }

  async cancelProduction(id, audit = {}) {
    return this.transitionGeneralStage({
      id,
      statusName: "Cancelado",
      userId: audit.userId,
      comment: audit.comment,
      now: audit.now,
    });
  }

  async reevaluateFromSalesNote({ orderId, salesNote, userId }) {
    const order = await this.client.pedidos.findUnique({
      where: { id_pedido: Number(orderId) },
      include: { Detalle_pedido: { orderBy: { id_detalle_pedido: "asc" } } },
    });
    if (!order) return null;

    const dueDate = salesNote.fechaEntregaTentativaOrigen
      ? new Date(`${salesNote.fechaEntregaTentativaOrigen}T00:00:00.000Z`)
      : null;
    await this.client.cliente.update({
      where: { id_cliente: order.id_cliente },
      data: {
        rut_cliente: salesNote.cliente?.rut,
        nombre_cliente: salesNote.cliente?.nombre,
        razon_social: salesNote.cliente?.nombre,
      },
    });
    await this.client.pedidos.update({
      where: { id_pedido: Number(orderId) },
      data: {
        fecha_estimada_termino: dueDate,
        usuario_manager_origen: salesNote.origen?.usuarioManager ?? null,
        observacion_origen: salesNote.observaciones ?? null,
      },
    });

    for (const [index, item] of (salesNote.items ?? []).entries()) {
      const type = await this.client.tipo_Producto.findFirst({
        where: { nombre_producto: item.tipoProducto },
      });
      if (!type) continue;
      const existing = order.Detalle_pedido[index];
      if (existing) {
        await this.client.detalle_pedido.update({
          where: { id_detalle_pedido: existing.id_detalle_pedido },
          data: { cantidad: Number(item.cantidad), id_tipo_producto: type.id_tipo_producto, fecha_estimada_termino: dueDate },
        });
      } else {
        const first = await this.client.producto_Subproceso.findFirst({
          where: { id_tipo_producto: type.id_tipo_producto }, orderBy: { orden_flujo: "asc" },
        });
        await this.client.detalle_pedido.create({ data: {
          id_pedido: Number(orderId), id_tipo_producto: type.id_tipo_producto,
          cantidad: Number(item.cantidad), fecha_estimada_termino: dueDate,
          id_estado_subproceso: first?.id_estado_subproceso ?? null,
        } });
      }
    }

    const updated = await this.transitionGeneralStage({
      id: orderId, ordenKanban: 1, userId,
      comment: "Pedido reevaluado desde la Nota de Venta y enviado a Listo para Produccion.",
    });

    const administrators = await this.client.usuario.findMany({
      where: { rol_usuario: ROLES.ADMINISTRADOR, NOT: { estado_usuario: "Desvinculado" } },
      select: { id_usuario: true },
    });
    if (administrators.length > 0) {
      const message = await this.client.mensaje.create({ data: {
        id_pedido: Number(orderId), fecha_publicacion: new Date(),
        Asunto: "Revision de pedido resuelta",
        contenido: `La revision del pedido ${salesNote.numeroNota} fue resuelta por Ventas.`,
      } });
      await this.client.mENSAJE_USUARIO.createMany({
        data: administrators.map(({ id_usuario }) => ({ id_usuario, id_mensaje: message.id_mensaje, leido_: false, oculto_: false })),
        skipDuplicates: true,
      });
    }
    return updated;
  }

  async updateDeliveryDate(id, dueDate, audit = {}) {
    try {
      await this.client.pedidos.update({
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
        await this.client.registros.create({
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

    return this.get(id);
  }

  async updatePaymentStatus(
    id,
    paymentStatusId,
    nextKanbanOrder,
    { currentOrder, paymentStatusName } = {},
  ) {
    const shouldUpdateOrderStage =
      nextKanbanOrder !== null && nextKanbanOrder !== undefined;
    const status = shouldUpdateOrderStage
      ? await this.client.estado_Pedido.findFirst({
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
      await this.client.pedidos.update({
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

    if (!currentOrder) return this.getPaymentOrder(id);

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

  async notifyProductionAdministrators(notification) {
    return this.notifyAdministratorsByRole(ROLES.ADMINISTRADOR, notification);
  }

  async notifyCollectionsAdministrators(notification) {
    return this.notifyAdministratorsByRole(ROLES.ADMIN_COBRANZAS, notification);
  }

  async notifyAdministratorsByRole(role, {
    orderId,
    subject,
    content,
    now = new Date(),
  }) {
    const administrators = await this.client.usuario.findMany({
      where: {
        rol_usuario: role,
        NOT: { estado_usuario: "Desvinculado" },
      },
      select: { id_usuario: true },
    });

    if (administrators.length === 0) return null;

    const message = await this.client.mensaje.create({
      data: {
        id_pedido: Number(orderId),
        fecha_publicacion: now,
        Asunto: subject,
        contenido: content,
      },
    });

    await this.client.mENSAJE_USUARIO.createMany({
      data: administrators.map(({ id_usuario }) => ({
        id_usuario,
        id_mensaje: message.id_mensaje,
        leido_: false,
        oculto_: false,
      })),
      skipDuplicates: true,
    });

    return message;
  }

  async notifyOrderReady(order, now = new Date()) {
    const responsibleUserId = Number(order?.id_usuario);
    if (!Number.isInteger(responsibleUserId) || responsibleUserId <= 0) return null;
    return this.client.mensaje.create({
      data: {
        id_pedido: Number(order.id_pedido),
        fecha_publicacion: now,
        Asunto: "Pedido listo para entrega",
        contenido: `El pedido ${order.numero_nota_venta ?? `#${order.id_pedido}`} pasó a la etapa Listo para Entrega.`,
        MENSAJE_USUARIO: {
          create: { id_usuario: responsibleUserId, leido_: false, oculto_: false },
        },
      },
    });
  }

  // Se invoca dentro de la transacción del servicio, antes de leer los detalles.
  // Serializa cierres y retrocesos del mismo pedido sin bloquear otros pedidos.
  async lockProductionOrder(orderId) {
    await this.client.$queryRaw`
      SELECT id_pedido FROM Pedidos WHERE id_pedido = ${Number(orderId)} FOR UPDATE
    `;
  }

  async completeSubprocess({ orderId, detailId, subprocessId, userId, comment }) {
    await this.lockProductionOrder(orderId);
    const detail = await this.client.detalle_pedido.findFirst({
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

    const order = await this.get(orderId);

    if (!order) return null;

    if (Number(order.id_etapa_general) !== 2 || order.estado_pago !== "Confirmado") {
      const error = new Error("Los subprocesos solo pueden completarse en Produccion.");
      error.statusCode = 409;
      throw error;
    }

    if (detail.fecha_real_termino) {
      const error = new Error("Todos los subprocesos de este producto ya estan completos.");
      error.statusCode = 409;
      throw error;
    }

    const subprocesses = detail.Tipo_Producto?.Producto_Subproceso ?? [];
    const processIndex = subprocesses.findIndex(
      (process) =>
        Number(process.id_estado_subproceso) === Number(subprocessId),
    );

    if (processIndex < 0) {
      const error = new Error("Subproceso no encontrado para este producto.");
      error.statusCode = 404;
      throw error;
    }

    const currentIndex = subprocesses.findIndex(
      (process) =>
        Number(process.id_estado_subproceso) ===
        Number(detail.id_estado_subproceso),
    );

    if (currentIndex < 0 || processIndex !== currentIndex) {
      const error = new Error("Debe completar primero el subproceso actual.");
      error.statusCode = 409;
      throw error;
    }

    const now = new Date();
    const nextSubprocess = subprocesses[processIndex + 1] ?? null;
    const firstSubprocess = subprocesses[0] ?? null;
    const isLanyard = isLanyardProduct(detail.Tipo_Producto?.nombre_producto);
    const shouldCheckLanyardProgress =
      isLanyard && nextSubprocess && isPackagingSubprocess(nextSubprocess);
    const latestLanyardProgress = isLanyard
      ? await this.client.avance_Lanyard.findFirst({
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

    const latestSubprocessRecord = await this.client.registro_subprocesos.findFirst({
      where: { id_detalle_pedido: Number(detailId) },
      include: { Registros: true },
      orderBy: { Registros: { FECHA_HORA: "desc" } },
    });
    const productionStageRecord = latestSubprocessRecord
      ? null
      : await this.client.registro_Etapas.findFirst({
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

    const transition = await this.client.detalle_pedido.updateMany({
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
      const error = new Error("El subproceso ya fue completado.");
      error.statusCode = 409;
      throw error;
    }

    const registry = await this.client.registros.create({
      data: {
        FECHA_HORA: now,
        id_pedido: Number(orderId),
        id_usuario: Number(userId),
        observacion: mergeObservation(
          comment,
          formatLanyardProgressObservation(latestLanyardProgress, detail.cantidad),
        ),
      },
    });

    await this.client.registro_subprocesos.create({
      data: {
        id_registro: registry.ID_REGISTRO,
        fecha_hora_entrada: startedAt,
        fecha_hora_salida: now,
        id_detalle_pedido: Number(detailId),
        id_estado_subproceso: Number(subprocessId),
      },
    });
    return this.get(orderId);
  }

  async rollbackSubprocess({ orderId, detailId, subprocessId, userId, comment }) {
    await this.lockProductionOrder(orderId);
    const detail = await this.client.detalle_pedido.findFirst({
      where: { id_pedido: Number(orderId), id_detalle_pedido: Number(detailId) },
      include: { Tipo_Producto: { include: { Producto_Subproceso: { orderBy: { orden_flujo: "asc" } } } } },
    });
    if (!detail) return null;
    const order = await this.getTransitionState(orderId);
    if (!order || Number(order.id_etapa_general) !== 2 || order.estado_pago !== "Confirmado") {
      const error = new Error("El pedido debe estar en produccion y con pago confirmado."); error.statusCode = 409; throw error;
    }

    const subprocesses = detail.Tipo_Producto?.Producto_Subproceso ?? [];
    const currentIndex = subprocesses.findIndex((item) =>
      Number(item.id_estado_subproceso) === Number(detail.id_estado_subproceso));
    const targetIndex = subprocesses.findIndex((item) =>
      Number(item.id_estado_subproceso) === Number(subprocessId));
    const rollbackIndex = detail.fecha_real_termino ? currentIndex : currentIndex - 1;
    if (currentIndex < 0 || rollbackIndex < 0 || targetIndex !== rollbackIndex) {
      const error = new Error("Solo se puede retroceder al subproceso inmediatamente anterior.");
      error.statusCode = 409;
      throw error;
    }

    const changed = await this.client.detalle_pedido.updateMany({
      where: {
        id_detalle_pedido: Number(detailId),
        id_pedido: Number(orderId),
        id_estado_subproceso: detail.id_estado_subproceso,
      },
      data: { id_estado_subproceso: Number(subprocessId), fecha_real_termino: null },
    });
    if (changed.count !== 1) {
      const error = new Error("El subproceso ya fue modificado.");
      error.statusCode = 409;
      throw error;
    }

    const now = new Date();
    const registry = await this.client.registros.create({ data: {
      FECHA_HORA: now, id_pedido: Number(orderId), id_usuario: Number(userId), observacion: comment,
    } });
    await this.client.registro_subprocesos.create({ data: {
      id_registro: registry.ID_REGISTRO,
      fecha_hora_entrada: now,
      fecha_hora_salida: null,
      id_detalle_pedido: Number(detailId),
      id_estado_subproceso: Number(subprocessId),
    } });
    return this.get(orderId);
  }
}

export default OrderRepository;
