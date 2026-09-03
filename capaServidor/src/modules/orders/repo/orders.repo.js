import getPrismaClient from "../../../database/prisma.js";

const SALES_NOTE_DOCUMENT_URL_PREFIX = "/api/documents/nvs/";
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

export function buildSalesNotePdfUrl(storedPath) {
  if (typeof storedPath !== "string" || storedPath.trim().length === 0) {
    return null;
  }

  const normalizedPath = storedPath.replace(/\\/g, "/");
  const pathParts = normalizedPath.split("/").filter(Boolean);
  const nvsIndex = pathParts.findIndex((part) => part.toLowerCase() === "nvs");
  const filename = pathParts.at(-1);

  if (!filename?.toLowerCase().endsWith(".pdf")) {
    return storedPath;
  }

  if (nvsIndex === -1 || pathParts[nvsIndex + 1] !== filename) {
    return storedPath;
  }

  return `${SALES_NOTE_DOCUMENT_URL_PREFIX}${encodeURIComponent(filename)}`;
}

function mapOrderRow(order, paymentStatusName = null) {
  if (!order) return null;

  const {
    Cliente,
    Detalle_pedido,
    Estado_Pedido,
    Estado_Pago,
    Pedido_Etiqueta,
    Pedido_Item_Sin_Seguimiento,
    ...orderFields
  } = order;

  return {
    ...orderFields,
    nombre_cliente: Cliente?.nombre_cliente ?? null,
    rut_cliente: Cliente?.rut_cliente ?? null,
    razon_social: Cliente?.razon_social ?? null,
    nombre_producto: Detalle_pedido ? uniqueProductNames(Detalle_pedido) : undefined,
    product: Detalle_pedido ? uniqueProductNames(Detalle_pedido) : undefined,
    descripcion_producto: Detalle_pedido
      ? uniqueProductDescriptions(Detalle_pedido)
      : undefined,
    cantidad: Detalle_pedido ? totalQuantity(Detalle_pedido) : null,
    quantity: Detalle_pedido ? totalQuantity(Detalle_pedido) : null,
    detalles: Array.isArray(Detalle_pedido)
      ? Detalle_pedido.map(mapOrderDetail)
      : [],
    id_etapa_general: Estado_Pedido?.orden_kanban ?? null,
    generalStepId: Estado_Pedido?.orden_kanban ?? null,
    nombre_etapa_general: Estado_Pedido?.nombre_etapa ?? null,
    estado_pago: paymentStatusName ?? Estado_Pago?.nombre_estado_pago ?? null,
    paymentStatus: paymentStatusName ?? Estado_Pago?.nombre_estado_pago ?? null,
    etiquetas: Array.isArray(Pedido_Etiqueta)
      ? Pedido_Etiqueta.map((item) => item.etiqueta).filter(Boolean)
      : [],
    itemsSinSeguimientoProductivo: Array.isArray(Pedido_Item_Sin_Seguimiento)
      ? Pedido_Item_Sin_Seguimiento.map(mapUntrackedItem)
      : [],
    ruta_pdf: null,
    firmado: null,
    firma_pago: null,
  };
}

const orderReadInclude = {
  Cliente: true,
  Detalle_pedido: {
    include: {
      Tipo_Producto: {
        include: {
          Producto_Subproceso: {
            include: {
              Estado_Subprocesos: true,
            },
            orderBy: {
              orden_flujo: "asc",
            },
          },
        },
      },
      Estado_Subprocesos: true,
    },
  },
  Estado_Pedido: true,
  Estado_Pago: true,
  Pedido_Etiqueta: {
    include: {
      etiqueta: true,
    },
  },
  Pedido_Item_Sin_Seguimiento: true,
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

  async getPaymentStatusNamesByIds(ids) {
    const uniqueIds = [...new Set(ids.filter((id) => id !== null && id !== undefined))];

    if (uniqueIds.length === 0) return new Map();

    const statuses = await this.client.estado_Pago.findMany({
      where: {
        id_estado_pago: { in: uniqueIds.map(Number) },
      },
    });

    return new Map(
      statuses.map((status) => [
        Number(status.id_estado_pago),
        status.nombre_estado_pago,
      ]),
    );
  }

  async getBySalesNoteNumber(numeroNota) {
    return this.client.pedidos.findFirst({
      where: { numero_nota_venta: String(numeroNota) },
      include: orderReadInclude,
    });
  }

  async getAllOrders() {
    const orders = await this.client.pedidos.findMany({
      include: orderReadInclude,
      orderBy: { id_pedido: "desc" },
    });
    const paymentStatuses = await this.getPaymentStatusNamesByIds(
      orders.map((order) => order.id_estado_pago),
    );

    return orders.map((order) =>
      mapOrderRow(order, paymentStatuses.get(Number(order.id_estado_pago)) ?? null),
    );
  }

  async get(id) {
    const order = await this.client.pedidos.findUnique({
      where: { id_pedido: Number(id) },
      include: orderReadInclude,
    });

    if (!order) return null;

    const paymentStatuses = await this.getPaymentStatusNamesByIds([order.id_estado_pago]);

    return mapOrderRow(
      order,
      paymentStatuses.get(Number(order.id_estado_pago)) ?? null,
    );
  }

  async create(data) {
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

    return this.get(order.id_pedido);
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

  async updateGeneralStep(id, ordenKanban) {
    const status = await this.client.estado_Pedido.findFirst({
      where: { orden_kanban: Number(ordenKanban) },
      select: { id_estado_pedido: true },
    });

    try {
      await this.client.pedidos.update({
        where: { id_pedido: Number(id) },
        data: {
          id_estado_pedido: status?.id_estado_pedido ?? null,
        },
      });
    } catch (error) {
      if (error?.code === "P2025") return null;
      throw error;
    }

    return this.get(id);
  }

  async updateDeliveryDate(id, dueDate) {
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
    } catch (error) {
      if (error?.code === "P2025") return null;
      throw error;
    }

    return this.get(id);
  }

  async updatePaymentStatus(id, paymentStatusId, nextKanbanOrder) {
    const status = await this.client.estado_Pedido.findFirst({
      where: { orden_kanban: Number(nextKanbanOrder) },
      select: { id_estado_pedido: true },
    });

    try {
      await this.client.pedidos.update({
        where: { id_pedido: Number(id) },
        data: {
          id_estado_pago: Number(paymentStatusId),
          id_estado_pedido: status?.id_estado_pedido ?? null,
        },
      });
    } catch (error) {
      if (error?.code === "P2025") return null;
      throw error;
    }

    return this.get(id);
  }

  async completeSubprocess({ orderId, detailId, subprocessId, userId, comment }) {
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

    if (Number(order.id_etapa_general) !== 2) {
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

    await this.client.detalle_pedido.update({
      where: { id_detalle_pedido: Number(detailId) },
      data: {
        id_estado_subproceso:
          nextSubprocess?.id_estado_subproceso ?? detail.id_estado_subproceso,
        fecha_real_termino: nextSubprocess ? null : now,
      },
    });

    const registry = await this.client.registros.create({
      data: {
        FECHA_HORA: now,
        id_pedido: Number(orderId),
        id_usuario: Number(userId),
      },
    });

    await this.client.registro_subprocesos.create({
      data: {
        id_registro: registry.ID_REGISTRO,
        fecha_hora_entrada: now,
        fecha_hora_salida: now,
        id_detalle_pedido: Number(detailId),
        id_estado_subproceso: Number(subprocessId),
      },
    });

    void comment;

    return this.get(orderId);
  }
}

export default OrderRepository;
