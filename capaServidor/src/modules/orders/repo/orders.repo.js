import getPrismaClient from "../../../database/prisma.js";

const SALES_NOTE_DOCUMENT_URL_PREFIX = "/api/documents/nvs/";
const PAYMENT_SIGNATURE_EVIDENCE_URL_PREFIX = "/api/orders";

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

function mapUserSummary(user) {
  if (!user) return null;

  return {
    id_usuario: user.id_usuario ?? null,
    correo_usuario: user.correo_usuario ?? null,
    nombre_usuario: user.nombre_usuario ?? null,
    apellido_usuario: user.apellido_usuario ?? null,
  };
}

function mapProductionComment(comment) {
  return {
    id_comentario_produccion: comment.id_comentario_produccion ?? null,
    comentario: comment.comentario ?? null,
    fecha_comentario: comment.fecha_comentario ?? null,
    id_usuario: comment.id_usuario ?? null,
    usuario: mapUserSummary(comment.Usuario),
  };
}

function mapOrderTag(orderTag) {
  const tag = orderTag.etiqueta;

  return {
    id_etiqueta: tag?.id_etiqueta ?? orderTag.id_etiqueta ?? null,
    nombre_etiqueta: tag?.nombre_etiqueta ?? null,
    descripcion: tag?.descripcion ?? null,
    esta_activa: tag?.esta_activa ?? null,
    fecha_asignacion: orderTag.fecha_asignacion ?? null,
    id_usuario_asigna: orderTag.id_usuario_asigna ?? null,
    usuario_asigna: mapUserSummary(orderTag.Usuario),
  };
}

function getCompletedSubprocessById(records = []) {
  return new Map(
    records
      .filter((record) => record.id_estado_subproceso !== null)
      .map((record) => [Number(record.id_estado_subproceso), record]),
  );
}

function mapSubprocesses(detail) {
  const productSubprocesses =
    detail.Tipo_Producto?.Producto_Subproceso ?? [];
  const completedBySubprocess = getCompletedSubprocessById(
    detail.registro_subprocesos ?? [],
  );
  let hasCurrent = false;

  return productSubprocesses
    .slice()
    .sort((left, right) => Number(left.orden_flujo ?? 0) - Number(right.orden_flujo ?? 0))
    .map((productSubprocess) => {
      const subprocess = productSubprocess.Estado_Subprocesos;
      const subprocessId = productSubprocess.id_estado_subproceso;
      const record = completedBySubprocess.get(Number(subprocessId));
      const isDone = Boolean(record);
      const status = isDone ? "done" : hasCurrent ? "locked" : "current";

      if (!isDone && !hasCurrent) {
        hasCurrent = true;
      }

      return {
        id_estado_subproceso: subprocessId ?? null,
        nombre_estado: subprocess?.nombre_estado ?? null,
        descripcion_estado: subprocess?.descripcion_estado ?? null,
        orden_flujo: productSubprocess.orden_flujo ?? null,
        status,
        id_registro_subproceso: record?.id_registro_subproceso ?? null,
        fecha_hora_entrada: record?.fecha_hora_entrada ?? null,
        fecha_hora_salida: record?.fecha_hora_salida ?? null,
        id_usuario: record?.id_usuario ?? null,
        usuario: mapUserSummary(record?.Usuario),
      };
    });
}

function mapOrderDetail(detail) {
  const mappedDetail = {
    id_detalle_pedido: detail.id_detalle_pedido ?? null,
    id_tipo_producto: detail.id_tipo_producto ?? null,
    nombre_producto: detail.Tipo_Producto?.nombre_producto ?? null,
    descripcion_producto: detail.Tipo_Producto?.descripcion_producto ?? null,
    cantidad: detail.cantidad ?? null,
    fecha_estimada_termino: detail.fecha_estimada_termino ?? null,
    fecha_real_termino: detail.fecha_real_termino ?? null,
  };

  if (detail.Tipo_Producto?.Producto_Subproceso) {
    mappedDetail.subprocesos = mapSubprocesses(detail);
  }

  if (detail.Comentario_Produccion) {
    mappedDetail.comentarios = detail.Comentario_Produccion.map(
      mapProductionComment,
    );
  }

  return mappedDetail;
}

function findSalesNoteDocument(documents = []) {
  return (
    documents.find((document) => document.Nota_Venta) ??
    documents.find((document) => document.ruta_pdf) ??
    null
  );
}

function findPaymentSignature(document) {
  return (
    document?.Firma_Documento?.find((signature) => signature.Firma_Pago) ??
    null
  );
}

function getFileNameFromStoredPath(storedPath) {
  if (typeof storedPath !== "string" || storedPath.trim().length === 0) {
    return null;
  }

  return storedPath.replace(/\\/g, "/").split("/").filter(Boolean).at(-1) ?? null;
}

function buildPaymentSignatureEvidenceUrl(orderId, paymentSignature) {
  if (!orderId || !paymentSignature?.Firma_Pago) {
    return null;
  }

  return `${PAYMENT_SIGNATURE_EVIDENCE_URL_PREFIX}/${encodeURIComponent(orderId)}/payment-signature-evidence`;
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
    Documento,
    Detalle_pedido,
    Estado_Pedido,
    Pedido_Etiqueta,
    ...orderFields
  } = order;
  const salesNoteDocument = findSalesNoteDocument(Documento);
  const paymentSignature = findPaymentSignature(salesNoteDocument);

  return {
    ...orderFields,
    nombre_cliente: Cliente?.nombre_cliente ?? null,
    rut_cliente: Cliente?.rut_cliente ?? null,
    razon_social: Cliente?.razon_social ?? null,
    nombre_producto: Detalle_pedido ? uniqueProductNames(Detalle_pedido) : undefined,
    descripcion_producto: Detalle_pedido
      ? uniqueProductDescriptions(Detalle_pedido)
      : undefined,
    cantidad: Detalle_pedido ? totalQuantity(Detalle_pedido) : null,
    detalles: Array.isArray(Detalle_pedido)
      ? Detalle_pedido.map(mapOrderDetail)
      : [],
    id_etapa_general: Estado_Pedido?.orden_kanban ?? null,
    nombre_etapa_general: Estado_Pedido?.nombre_etapa ?? null,
    estado_pago: paymentStatusName,
    etiquetas: Array.isArray(Pedido_Etiqueta)
      ? Pedido_Etiqueta.map(mapOrderTag)
      : [],
    ruta_pdf: buildSalesNotePdfUrl(salesNoteDocument?.ruta_pdf),
    numero_nota_venta:
      salesNoteDocument?.Nota_Venta?.numero_nota_venta ?? null,
    firmado: salesNoteDocument?.Nota_Venta?.firmado ?? null,
    firma_pago: paymentSignature
      ? {
          id_firma_documento: paymentSignature.id_firma_documento ?? null,
          fecha_firma: paymentSignature.fecha_firma ?? null,
          id_usuario: paymentSignature.id_usuario ?? null,
          evidenceFileName: getFileNameFromStoredPath(
            paymentSignature.Usuario?.ruta_firma,
          ),
          evidenceUrl: buildPaymentSignatureEvidenceUrl(
            orderFields.id_pedido,
            paymentSignature,
          ),
        }
      : null,
  };
}

const orderListReadInclude = {
  Cliente: true,
  Detalle_pedido: {
    include: {
      Tipo_Producto: true,
    },
  },
  Documento: {
    include: {
      Nota_Venta: true,
      Firma_Documento: {
        include: {
          Firma_Pago: true,
          Usuario: {
            select: {
              ruta_firma: true,
            },
          },
        },
      },
    },
  },
  Estado_Pedido: true,
  Pedido_Etiqueta: {
    include: {
      etiqueta: true,
      Usuario: {
        select: {
          id_usuario: true,
          correo_usuario: true,
          nombre_usuario: true,
          apellido_usuario: true,
        },
      },
    },
    orderBy: { fecha_asignacion: "asc" },
  },
};

const orderDetailReadInclude = {
  ...orderListReadInclude,
  Detalle_pedido: {
    include: {
      Tipo_Producto: {
        include: {
          Producto_Subproceso: {
            include: {
              Estado_Subprocesos: true,
            },
            orderBy: { orden_flujo: "asc" },
          },
        },
      },
      registro_subprocesos: {
        include: {
          Usuario: {
            select: {
              id_usuario: true,
              correo_usuario: true,
              nombre_usuario: true,
              apellido_usuario: true,
            },
          },
        },
        orderBy: [
          { fecha_hora_salida: "asc" },
          { id_registro_subproceso: "asc" },
        ],
      },
      Comentario_Produccion: {
        include: {
          Usuario: {
            select: {
              id_usuario: true,
              correo_usuario: true,
              nombre_usuario: true,
              apellido_usuario: true,
            },
          },
        },
        orderBy: [
          { fecha_comentario: "asc" },
          { id_comentario_produccion: "asc" },
        ],
      },
    },
    orderBy: { id_detalle_pedido: "asc" },
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

  async getPaymentStatusNamesByIds(ids) {
    const uniqueIds = [...new Set(ids.filter((id) => id !== null && id !== undefined))];

    if (uniqueIds.length === 0) return new Map();

    const statuses = await this.client.estado_Pago.findMany({
      where: {
        id_estado_Pago: { in: uniqueIds.map(Number) },
      },
    });

    return new Map(
      statuses.map((status) => [
        Number(status.id_estado_Pago),
        status.nombre_estado_pago,
      ]),
    );
  }

  async getAllOrders() {
    const orders = await this.client.pedidos.findMany({
      include: orderListReadInclude,
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
      include: orderDetailReadInclude,
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
      },
    });

    return this.get(order.id_pedido);
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

  async getTag(id) {
    return this.client.etiqueta.findUnique({
      where: { id_etiqueta: Number(id) },
    });
  }

  async assignTag(orderId, tagId, userId = null) {
    try {
      await this.client.pedido_Etiqueta.createMany({
        data: [
          {
            id_pedido: Number(orderId),
            id_etiqueta: Number(tagId),
            id_usuario_asigna: userId === null || userId === undefined
              ? null
              : Number(userId),
          },
        ],
        skipDuplicates: true,
      });
    } catch (error) {
      if (error?.code === "P2003") return null;
      throw error;
    }

    return this.get(orderId);
  }

  async removeTag(orderId, tagId) {
    await this.client.pedido_Etiqueta.deleteMany({
      where: {
        id_pedido: Number(orderId),
        id_etiqueta: Number(tagId),
      },
    });

    return this.get(orderId);
  }
}

export default OrderRepository;
