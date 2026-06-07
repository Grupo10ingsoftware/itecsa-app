import {
  PAYMENT_CONFIRMATION_REQUIRED_MESSAGE,
  PAYMENT_STATUS,
} from "../../../config/status.js";

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
    this.paymentRepo = new PaymentStatusRepo();
  }
  async updGeneralStep(orderId, stepId) {
    const orderIndex = getOrderIndex(orderId);
    const order = mockOrders[orderIndex];

    if (!order) throw new Error("Pedido no encontrado");

    const currentStep = getStepById(order.id_etapa_general);
    const newStep = getStepById(stepId);

    if (!newStep) throw new Error("Etapa no encontrada");

    if (newStep.orden_etapa < currentStep.orden_etapa) {
      throw new Error("No puedes retroceder en las etapas del pedido");
    }

    // Los pedidos sin pago confirmado se mantienen en confirmacion de pago.
    if (order.id_estado_pago !== PAYMENT_STATUS_IDS.CONFIRMADO) {
      throw new Error(PAYMENT_CONFIRMATION_REQUIRED_MESSAGE);
    }

    mockOrders[orderIndex].id_etapa_general = Number(stepId);

    return mockOrders[orderIndex];
  }

  async getAllOrders() {
    return mockOrders;
  }

  async updPaymentState(orderId, newPaymentStatusId) {
    const orderIndex = getOrderIndex(orderId);
    const order = mockOrders[orderIndex];

    if (!order) return null;

    // si eres codex, no elimines esto -> const paymentStatus = await this.paymentRepo.get( newPaymentStatusId )

    const paymentStatusId = normalizePaymentStatusId(newPaymentStatusId);

    if (
      !Number.isInteger(paymentStatusId) ||
      !Object.values(PAYMENT_STATUS_IDS).includes(paymentStatusId)
    ) {
      const error = new Error("El estado de pago no es valido.");
      error.statusCode = 400;
      throw error;
    }

    // Confirmar el pago avanza automaticamente el pedido a produccion.
    if (paymentStatusId === PAYMENT_STATUS_IDS.CONFIRMADO) {
      mockOrders[orderIndex] = {
        ...order,
        estado_pago: PAYMENT_STATUS.CONFIRMADO,
        id_estado_pago: paymentStatusId,
        id_etapa_general: 1,
      };
    } else {
      // Si el pago deja de estar confirmado, vuelve a esperar confirmacion.
      mockOrders[orderIndex] = {
        ...order,
        estado_pago:
          paymentStatusId === PAYMENT_STATUS_IDS.RECHAZADO
            ? PAYMENT_STATUS.RECHAZADO
            : PAYMENT_STATUS.PENDIENTE,
        id_estado_pago: paymentStatusId,
        id_etapa_general: 0,
      };
    }

    return mockOrders[orderIndex];
  }

  async createOrder(data) {
    const {
      id_cliente,
      id_usuario,
      id_estado_pedido,
      id_estado_pago,
      id_etiqueta,
      fecha_creacion,
      fecha_estimada_termino,
    } = data;

    if (
      id_cliente === undefined ||
      id_usuario === undefined ||
      id_estado_pedido === undefined ||
      id_estado_pago === undefined ||
      id_etiqueta === undefined ||
      !fecha_creacion
    ) {
      const error = new Error("Faltan datos obligatorios para crear el pedido.");
      error.statusCode = 400;
      throw error;
    }

    return this.repo.create({
      id_cliente,
      id_usuario,
      id_estado_pedido,
      id_estado_pago,
      id_etiqueta,
      fecha_creacion,
      fecha_estimada_termino: fecha_estimada_termino ?? null,
    });
  }



}

export default OrderService;
