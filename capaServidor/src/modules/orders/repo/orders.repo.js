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
    id_etapa_general: Estado_Pedido?.orden_kanban ?? null,
    nombre_etapa_general: Estado_Pedido?.nombre_etapa ?? null,
    estado_pago: paymentStatusName,
    ruta_pdf: salesNoteDocument?.ruta_pdf ?? null,
    numero_nota_venta:
      salesNoteDocument?.Nota_Venta?.numero_nota_venta ?? null,
    firmado: salesNoteDocument?.Nota_Venta?.firmado ?? null,
    signed_ruta_pdf: null,
    firma_pago: paymentSignature
      ? {
          fecha_firma: paymentSignature.fecha_firma ?? null,
          id_usuario: paymentSignature.id_usuario ?? null,
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
