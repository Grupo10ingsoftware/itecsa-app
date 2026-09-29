import { AppError } from "../../../errors/AppError.js";
import PaymentRecordRepo from "../repo/paymentRecord.repo.js";
import SalesNoteSourceService from "../../orders/service/salesNoteSource.service.js";

function normalizeText(value) {
  return typeof value === "string" ? value.trim().toLocaleLowerCase("es") : "";
}

function toUserSummary(user) {
  if (!user) return null;

  return {
    id_usuario: user.id_usuario ?? null,
    nombre_usuario: user.nombre_usuario ?? null,
    apellido_usuario: user.apellido_usuario ?? null,
  };
}

function toPaymentRecordDTO(record) {
  if (!record) return null;

  const registry = record.Registros ?? {};
  const previousStatus =
    record.Estado_Pago_Registro_Pago_id_estado_pago_anteriorToEstado_Pago
      ?.nombre_estado_pago ?? null;
  const nextStatus =
    record.Estado_Pago_Registro_Pago_id_estado_pago_nuevoToEstado_Pago
      ?.nombre_estado_pago ?? null;

  return {
    id_registro: record.id_registro ?? registry.ID_REGISTRO ?? null,
    id_pedido: registry.id_pedido ?? null,
    fecha_registro: record.fecha_registro ?? registry.FECHA_HORA ?? null,
    observacion: record.observacion ?? registry.observacion ?? null,
    estado_anterior: previousStatus,
    estado_nuevo: nextStatus,
    id_usuario: registry.id_usuario ?? null,
    usuario: toUserSummary(registry.Usuario),
  };
}

function resolveSalesNoteItems(details = [], salesNoteItems = []) {
  const availableItems = salesNoteItems.map((item, index) => ({ item, index }));
  const usedIndexes = new Set();

  return details.map((detail, detailIndex) => {
    const productType = detail.Tipo_Producto?.nombre_producto;
    if (detail.linea_origen && detail.producto_origen) {
      return {
        id: detail.id_detalle_pedido,
        productType: productType ?? null,
        code: detail.codigo_origen ?? null,
        product: detail.producto_origen,
        quantity: detail.cantidad,
      };
    }
    const normalizedType = normalizeText(productType);
    const quantity = Number(detail.cantidad);
    const matchesType = ({ item, index }) =>
      !usedIndexes.has(index) &&
      normalizeText(item.tipoProducto) === normalizedType;
    const matchesTypeAndQuantity = (entry) =>
      matchesType(entry) && Number(entry.item.cantidad) === quantity;

    const match =
      availableItems.find(matchesTypeAndQuantity) ??
      availableItems.find(matchesType) ??
      availableItems.find(({ index }) =>
        index === detailIndex && !usedIndexes.has(index),
      );

    if (match) usedIndexes.add(match.index);

    return {
      id: detail.id_detalle_pedido,
      productType: productType ?? match?.item?.tipoProducto ?? null,
      code: match?.item?.codigo ?? null,
      product:
        match?.item?.producto ??
        detail.Tipo_Producto?.descripcion_producto ??
        null,
      quantity: detail.cantidad ?? match?.item?.cantidad ?? null,
    };
  });
}

class PaymentRecordService {
  constructor({ repo, salesNoteSourceService } = {}) {
    this.repo = repo ?? new PaymentRecordRepo();
    this.salesNoteSourceService =
      salesNoteSourceService ?? new SalesNoteSourceService();
  }

  async createPaymentRecord(orderId, data) {
    const {
      fecha_registro,
      observacion,
      id_usuario,
      id_estado_pago_anterior,
      id_estado_pago,
    } = data;

    if (!orderId) {
      const error = new AppError(400, "El ID del pedido es obligatorio");
      throw error;
    }

    if (!id_usuario || !id_estado_pago) {
      const error = new AppError(400, "Faltan datos obligatorios del registro de pago");
      throw error;
    }

    const previousStatusId = Number(id_estado_pago_anterior);
    const nextStatusId = Number(id_estado_pago);
    if (!Number.isInteger(previousStatusId) || previousStatusId <= 0 ||
        !Number.isInteger(nextStatusId) || nextStatusId <= 0 ||
        previousStatusId === nextStatusId) {
      const error = new AppError(400, "La transicion de pago requiere estados anterior y nuevo distintos.");
      throw error;
    }

    return this.repo.create(orderId, {
      fecha_registro,
      observacion,
      id_usuario,
      id_estado_pago_anterior: previousStatusId,
      id_estado_pago: nextStatusId,
    });
  }

  async getPaymentRecord(orderId, paymentRecordId) {
    if (!orderId || !paymentRecordId) {
      const error = new AppError(400, "Faltan IDs obligatorios");
      throw error;
    }

    const record = await this.repo.getByOrderIdAndRecordId(orderId, paymentRecordId);

    if (!record) {
      const error = new AppError(404, "Registro de pago no encontrado");
      throw error;
    }

    return toPaymentRecordDTO(record);
  }

  async getPaymentRecordsByOrderId(orderId) {
    if (!orderId) {
      const error = new AppError(400, "El ID del pedido es obligatorio");
      throw error;
    }

    const records = await this.repo.getByOrderId(orderId);
    return records.map(toPaymentRecordDTO);
  }

  async getConfirmationDetails(orderId) {
    const parsedOrderId = Number(orderId);

    if (!Number.isInteger(parsedOrderId) || parsedOrderId <= 0) {
      const error = new AppError(400, "El ID del pedido no es valido");
      throw error;
    }

    const order = await this.repo.getConfirmationSource(parsedOrderId);

    if (!order) {
      const error = new AppError(404, "Pedido no encontrado", "ORDER_NOT_FOUND");
      throw error;
    }

    let salesNote = null;

    const needsSource = (order.Detalle_pedido ?? []).some((detail) => !detail.linea_origen || !detail.producto_origen);
    if (order.numero_nota_venta && needsSource) {
      try {
        salesNote = await this.salesNoteSourceService.getByNumber(
          order.numero_nota_venta,
        );
      } catch (error) {
        if (error.statusCode !== 404) throw error;
      }
    }

    return {
      id: order.id_pedido,
      nvNumber: order.numero_nota_venta,
      companyName:
        order.Cliente?.nombre_cliente ?? order.Cliente?.razon_social ?? null,
      rut: order.Cliente?.rut_cliente ?? null,
      sellerId: order.Usuario?.id_usuario ?? null,
      sellerName: [order.Usuario?.nombre_usuario, order.Usuario?.apellido_usuario].filter(Boolean).join(" ") || null,
      products: resolveSalesNoteItems(
        order.Detalle_pedido,
        salesNote?.items ?? [],
      ),
    };
  }
}

export default PaymentRecordService;
