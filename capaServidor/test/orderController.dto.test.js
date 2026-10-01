import assert from "node:assert/strict";
import { test } from "node:test";
import OrderController from "../src/modules/orders/controller/orders.controller.js";

function responseRecorder() {
  return {
    body: undefined,
    statusCode: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

const internalOrder = {
  id_pedido: 9,
  numero_nota_venta: "NV-9",
  fecha_creacion: "2026-10-01T10:00:00.000Z",
  fecha_estimada_termino: null,
  detalles: [],
  id_etapa_general: 1,
  id_estado_pedido: 2,
  nombre_etapa_general: "Listo para produccion",
  id_estado_pago: 2,
  estado_pago: "Confirmado",
  etiquetas: [],
  comments: [],
};

test("el controlador aplica el DTO canonico a lecturas, alta y mutaciones", async () => {
  const controller = new OrderController({
    service: {
      async getAllOrders() { return [internalOrder]; },
      async getOrderById() { return internalOrder; },
      async createOrder() { return internalOrder; },
      async getPaymentWorkspace() {
        return {
          orders: [internalOrder],
          paymentStatuses: [{ id_estado_pago: 2, nombre_estado_pago: "Confirmado" }],
        };
      },
      async updPaymentState() { return internalOrder; },
      async updGeneralStep() {
        return {
          id_pedido: 9,
          id_estado_pedido: 3,
          id_etapa_general: 2,
          nombre_etapa_general: "En produccion",
        };
      },
      async setOrderLabel() {
        return {
          id_pedido: 9,
          etiquetas: [{ id_etiqueta: 1, nombre_etiqueta: "Urgencia" }],
        };
      },
    },
  });

  const listResponse = responseRecorder();
  await controller.getOrders({}, listResponse);
  assert.equal(listResponse.statusCode, 200);
  assert.equal(listResponse.body[0].salesNoteNumber, "NV-9");
  assert.equal(Object.hasOwn(listResponse.body[0], "numero_nota_venta"), false);

  const paymentWorkspaceResponse = responseRecorder();
  await controller.getPaymentWorkspace({}, paymentWorkspaceResponse);
  assert.equal(paymentWorkspaceResponse.statusCode, 200);
  assert.equal(paymentWorkspaceResponse.body.orders[0].id, 9);
  assert.equal(paymentWorkspaceResponse.body.orders[0].paymentStatus, "Confirmado");
  assert.equal(Object.hasOwn(paymentWorkspaceResponse.body.orders[0], "id_pedido"), false);

  const paymentUpdateResponse = responseRecorder();
  await controller.updatePaymentStatus({
    params: { orderId: "9" },
    body: { paymentStatusId: 2 },
    auth: { payload: {} },
  }, paymentUpdateResponse);
  assert.equal(paymentUpdateResponse.statusCode, 200);
  assert.equal(paymentUpdateResponse.body.id, 9);
  assert.equal(Object.hasOwn(paymentUpdateResponse.body, "estado_pago"), false);

  for (const handler of [controller.getOrder, controller.createOrder]) {
    const response = responseRecorder();
    await handler({ params: { orderId: "9" }, body: {}, auth: {}, currentUser: {} }, response);
    assert.equal(response.body.id, 9);
    assert.equal(response.body.salesNoteNumber, "NV-9");
  }

  const moveResponse = responseRecorder();
  await controller.updateGeneralStep({
    params: { orderId: "9" },
    body: { generalStepId: 2 },
    auth: { payload: {} },
  }, moveResponse);
  assert.deepEqual(moveResponse.body, {
    id: 9,
    orderStatusId: 3,
    generalStepId: 2,
    orderStatus: "En produccion",
  });

  const labelResponse = responseRecorder();
  await controller.setLabel({ params: { orderId: "9" }, body: {}, auth: {} }, labelResponse);
  assert.deepEqual(labelResponse.body, {
    id: 9,
    labels: [{ id: 1, name: "Urgencia" }],
  });
});
