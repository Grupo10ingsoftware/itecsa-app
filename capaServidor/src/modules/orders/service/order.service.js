import {
  PAYMENT_CONFIRMATION_REQUIRED_MESSAGE,
  PAYMENT_STATUS,
} from "../../../config/status.js";


import OrderRepository from "../repo/orders.repo.js";
import ClientService from "../../clients/service/clients.service.js";
import OrderDetailService from "./orderDetail.service.js";
import ProductTypeService from "../../products/service/product.service.js";
import PaymentRecordService from "../../payments/service/paymentRecord.service.js";
import PaymentStatusRepo from "../../payments/repo/paymentStatus.repo.js";

// IDs temporales hasta mapear los estados de pago desde la BD.
const PAYMENT_STATUS_IDS = Object.freeze({
  PENDIENTE: 0,
  CONFIRMADO: 1,
  RECHAZADO: 2,
});

// Etapas minimas usadas por Kanban hasta integrar el catalogo persistido.
const GENERAL_STEPS = Object.freeze([
  {
    id: 0,
    orden_etapa: 1,
    key: "confirmacion-pago",
    title: "Confirmacion de pago",
  },
  {
    id: 1,
    orden_etapa: 2,
    key: "listo-produccion",
    title: "Listo para produccion",
  },
  {
    id: 2,
    orden_etapa: 3,
    key: "en-produccion",
    title: "En produccion",
  },
  {
    id: 3,
    orden_etapa: 4,
    key: "listo-entrega",
    title: "Listo para entrega",
  },
]);

// Datos en memoria para desarrollo y tests; reemplazar por repositorio cuando exista BD.
const mockOrders = [
  {
    id_pedido: 1,
    nombre_cliente: "Colegio Andes",
    codigo_nota_venta: "NV-6767",
    nombre_producto: "Cordones",
    fecha_pedido: "21-05-2026",
    estado_pago: PAYMENT_STATUS.PENDIENTE,
    id_estado_pago: PAYMENT_STATUS_IDS.PENDIENTE,
    id_etapa_general: 0,
  },
  {
    id_pedido: 2,
    nombre_cliente: "Chile",
    codigo_nota_venta: "NV-6768",
    nombre_producto: "Lanyards",
    fecha_pedido: "21-05-2026",
    estado_pago: PAYMENT_STATUS.PENDIENTE,
    id_estado_pago: PAYMENT_STATUS_IDS.PENDIENTE,
    id_etapa_general: 0,
  },
  {
    id_pedido: 3,
    nombre_cliente: "Bulla de mi vida",
    codigo_nota_venta: "NV-6769",
    nombre_producto: "Cordones",
    fecha_pedido: "21-05-2026",
    estado_pago: PAYMENT_STATUS.PENDIENTE,
    id_estado_pago: PAYMENT_STATUS_IDS.PENDIENTE,
    id_etapa_general: 0,
  },
  {
    id_pedido: 4,
    nombre_cliente: "Bulla de mi amor",
    codigo_nota_venta: "NV-6779",
    nombre_producto: "Lanyards",
    fecha_pedido: "21-05-2026",
    estado_pago: PAYMENT_STATUS.CONFIRMADO,
    id_estado_pago: PAYMENT_STATUS_IDS.CONFIRMADO,
    id_etapa_general: 3,
  },
  {
    id_pedido: 5,
    nombre_cliente: "Puro sentimiento",
    codigo_nota_venta: "NV-6777",
    nombre_producto: "Lanyards",
    fecha_pedido: "21-05-2026",
    estado_pago: PAYMENT_STATUS.CONFIRMADO,
    id_estado_pago: PAYMENT_STATUS_IDS.CONFIRMADO,
    id_etapa_general: 3,
  },
  {
    id_pedido: 6,
    nombre_cliente: "Franco Parisi",
    codigo_nota_venta: "NV-6778",
    nombre_producto: "Lanyards",
    fecha_pedido: "21-05-2026",
    estado_pago: PAYMENT_STATUS.CONFIRMADO,
    id_estado_pago: PAYMENT_STATUS_IDS.CONFIRMADO,
    id_etapa_general: 1,
  },
];

const INITIAL_MOCK_ORDERS = mockOrders.map((order) => ({ ...order }));

export function resetMockOrders() {
  mockOrders.splice(
    0,
    mockOrders.length,
    ...INITIAL_MOCK_ORDERS.map((order) => ({ ...order })),
  );
}

function getStepById(stepId) {
  return GENERAL_STEPS.find((step) => Number(step.id) === Number(stepId));
}

function getOrderIndex(orderId) {
  return mockOrders.findIndex(
    (currentOrder) => Number(currentOrder.id_pedido) === Number(orderId),
  );
}

function normalizePaymentStatusId(newPaymentStatusId) {
  if (newPaymentStatusId === PAYMENT_STATUS.CONFIRMADO) {
    return PAYMENT_STATUS_IDS.CONFIRMADO;
  }

  return Number(newPaymentStatusId);
}

class OrderService {

  constructor() {
    this.repo = new OrderRepository();
    this.clientService = new ClientService();
    this.orderDetailService = new OrderDetailService();
    this.productTypeService = new ProductTypeService();
    this.paymentRecordService = new PaymentRecordService();
    this.paymentRepo = new PaymentStatusRepo();
  }
  async updGeneralStep(orderId, stepId) {
    if (!orderId) {
      const error = new Error("El ID del pedido es obligatorio");
      error.statusCode = 400;
      throw error;
    }

    if (stepId === undefined || stepId === null) {
      const error = new Error("La etapa destino es obligatoria");
      error.statusCode = 400;
      throw error;
    }

    const order = await this.repo.get(orderId);

    if (!order) {
      const error = new Error("Pedido no encontrado");
      error.statusCode = 404;
      throw error;
    }

    const currentStep = Number(order.id_etapa_general);
    const nextStep = Number(stepId);

    if (!Number.isInteger(nextStep)) {
      const error = new Error("Etapa no valida");
      error.statusCode = 400;
      throw error;
    }

    if (nextStep < currentStep) {
      const error = new Error("No puedes retroceder en las etapas del pedido");
      error.statusCode = 409;
      throw error;
    }

    const PAYMENT_STATUS_CONFIRMADO_ID = 2;

    if (Number(order.id_estado_pago) !== PAYMENT_STATUS_CONFIRMADO_ID) {
      throw new Error(PAYMENT_CONFIRMATION_REQUIRED_MESSAGE);
    }

    return this.repo.updateGeneralStep(orderId, nextStep);
  }

  async getAllOrders() {
    return this.repo.getAllOrders();
  }

 async updPaymentState(orderId, newPaymentStatusId, data = {}) {
    const {
      id_usuario,
      observacion,
    } = data;

    if (!id_usuario) {
      const error = new Error("El ID del usuario es obligatorio para registrar el pago.");
      error.statusCode = 400;
      throw error;
    }

    const paymentStatusId = Number(newPaymentStatusId);

    if (!Number.isInteger(paymentStatusId)) {
      const error = new Error("El estado de pago no es valido.");
      error.statusCode = 400;
      throw error;
    }

    const paymentStatus = await this.paymentRepo.get(paymentStatusId);

    if (!paymentStatus) {
      const error = new Error("Estado de pago no encontrado.");
      error.statusCode = 404;
      throw error;
    }

    const PAYMENT_STATUS_CONFIRMADO_ID = 2;
    const KANBAN_CONFIRMACION_PAGO = 0;
    const KANBAN_LISTO_PRODUCCION = 1;

    const nextKanbanOrder =
      paymentStatusId === PAYMENT_STATUS_CONFIRMADO_ID
        ? KANBAN_LISTO_PRODUCCION
        : KANBAN_CONFIRMACION_PAGO;

    const updatedOrder = await this.repo.updatePaymentStatus(
      orderId,
      paymentStatusId,
      nextKanbanOrder,
    );

    if (!updatedOrder) return null;

    await this.paymentRecordService.createPaymentRecord(orderId, {
      id_usuario,
      id_estado_pago: paymentStatusId,
      observacion,
    });

    return updatedOrder;
  }

    


  

  async createOrder(data) {
    const {
      rut_cliente,
      nombre_cliente,
      razon_social,
      estado_cliente,
      id_usuario,
      id_etiqueta,
      productos,
    } = data;

    if (
      !id_usuario ||
      !rut_cliente ||
      !Array.isArray(productos) ||
      productos.length === 0
    ) {
      const error = new Error("Faltan datos obligatorios para crear el pedido.");
      error.statusCode = 400;
      throw error;
    }

    const client = await this.clientService.findOrCreateClient({
      rut_cliente,
      nombre_cliente,
      razon_social,
      estado_cliente,
    });

    if (!client?.id_cliente) {
      const error = new Error("No se pudo resolver el cliente del pedido.");
      error.statusCode = 500;
      throw error;
    }

    const id_estado_pago = 1;
    const id_estado_pedido = 1;

    const fecha_estimada_termino = productos.reduce((latestDate, product) => {
      if (!product.fecha_estimada_termino) return latestDate;
      if (!latestDate) return product.fecha_estimada_termino;

      return new Date(product.fecha_estimada_termino) > new Date(latestDate)
        ? product.fecha_estimada_termino
        : latestDate;
    }, null);

    const order = await this.repo.create({
      id_cliente: client.id_cliente,
      id_usuario,
      id_estado_pedido,
      id_estado_pago,
      id_etiqueta,
      fecha_estimada_termino,
    });

    if (!order?.id_pedido) {
      const error = new Error("No se pudo crear el pedido.");
      error.statusCode = 500;
      throw error;
    }

    const details = [];

    for (const product of productos) {
      const { nombre_producto, cantidad, fecha_estimada_termino } = product;

      if (!nombre_producto || cantidad === undefined) {
        const error = new Error("Faltan datos obligatorios en un detalle del pedido.");
        error.statusCode = 400;
        throw error;
      }

      const productType = await this.productTypeService.getProductTypeByName(
        nombre_producto,
      );

      const detail = await this.orderDetailService.createOrderDetail(order.id_pedido, {
        id_tipo_producto: productType.id_tipo_producto,
        cantidad,
        fecha_estimada_termino: fecha_estimada_termino ?? null,
        fecha_real_termino: null,
      });

      details.push(detail);
    }

    return {
      ...order,
      detalles: details,
    };
  }

  async getOrderById(orderId) {
    if (!orderId) {
      const error = new Error("El ID del pedido es obligatorio");
      error.statusCode = 400;
      throw error;
    }

    const order = await this.repo.get(orderId);

    if (!order) {
      const error = new Error("Pedido no encontrado");
      error.statusCode = 404;
      throw error;
    }

    return order;
  }

}

export default OrderService;
