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
    getPagedPaymentWorkspace: async () => ({ ...page, counts: {}, paymentStatuses: [] }),
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
});
