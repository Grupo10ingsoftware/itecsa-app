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

function mapOrderDetail(detail) {
  return {
    id_detalle_pedido: detail.id_detalle_pedido ?? null,
    id_tipo_producto: detail.id_tipo_producto ?? null,
    nombre_producto: detail.Tipo_Producto?.nombre_producto ?? null,
    descripcion_producto: detail.Tipo_Producto?.descripcion_producto ?? null,
    cantidad: detail.cantidad ?? null,
    fecha_estimada_termino: detail.fecha_estimada_termino ?? null,
    fecha_real_termino: detail.fecha_real_termino ?? null,
  };
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

const orderReadInclude = {
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
}

export default OrderRepository;
