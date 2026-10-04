import assert from "node:assert/strict";
import { test } from "node:test";
import OrderController from "../src/modules/orders/controller/orders.controller.js";

const internal = { id_pedido: 9, numero_nota_venta: "NV-9", fecha_creacion: null, fecha_estimada_termino: null, nombre_cliente: "Cliente", detalles: [], etiquetas: [], id_etapa_general: 1, nombre_etapa_general: "Listo", id_estado_pago: 1, estado_pago: "Pendiente", comments: [] };
const page = { items: [internal], pageInfo: { nextCursor: null, hasMore: false } };
function responseRecorder() { return { statusCode: 0, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }

test("el controlador conserva paginación y aplica el DTO de cada vista", async () => {
  const controller = new OrderController({ service: {
    getAllOrders: async () => page,
    getOrderViews: async () => page,
    getPagedPaymentWorkspace: async () => ({
      ...page,
      counts: {},
      paymentStatuses: [{ id_estado_pago: 1, nombre_estado_pago: "Pendiente" }],
    }),
  } });
  const kanban = responseRecorder();
  await controller.getOrders({ query: {} }, kanban);
  assert.equal(kanban.body.items[0].salesNoteNumber, "NV-9");
  assert.equal(kanban.body.pageInfo.hasMore, false);
  const calendar = responseRecorder();
  await controller.getCalendarOrders({ query: {} }, calendar);
  assert.equal(Object.hasOwn(calendar.body.items[0], "paymentStatus"), false);
  const payments = responseRecorder();
  await controller.getPaymentWorkspace({ query: {} }, payments);
  assert.equal(Object.hasOwn(payments.body.items[0], "items"), false);
  assert.deepEqual(payments.body.paymentStatuses, [{ id: 1, name: "Pendiente" }]);
});

test("las mutaciones devuelven un detalle releido con el contrato vigente", async () => {
  const calls = [];
  const detail = {
    ...internal,
    seller: "Ventas",
    comments: [{ id: "record-4", text: "Subproceso completado", createdAt: null }],
    commentGroups: {
      all: [{ id: "record-4", text: "Subproceso completado", createdAt: null }],
      source: [],
      subprocesses: [{ id: "record-4", text: "Subproceso completado", createdAt: null }],
      system: [],
    },
  };
  const controller = new OrderController({ service: {
    completeSubprocess: async (...args) => { calls.push(['mutation', ...args]); },
    getOrderViewById: async (...args) => { calls.push(['read', ...args]); return detail; },
  } });
  const response = responseRecorder();

  await controller.completeSubprocess({
    params: { orderId: '9', detailId: '3', subprocessId: '2' },
    body: { comment: 'Subproceso completado' },
    pinActor: { idUsuario: 1 },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.seller, "Ventas");
  assert.equal(response.body.commentGroups.subprocesses[0].text, "Subproceso completado");
  assert.equal(calls[0][0], 'mutation');
  assert.deepEqual(calls[1], ['read', '9', 'kanban']);
});
