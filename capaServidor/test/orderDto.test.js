import assert from "node:assert/strict";
import { test } from "node:test";
import {
  toCalendarOrderDetailDTO, toCalendarOrderSummaryDTO,
  toKanbanOrderDetailDTO, toKanbanOrderSummaryDTO,
  toOrderCreatedDTO, toOrderLabelsPatchDTO, toOrderStagePatchDTO, toPaymentOrderDTO,
} from "../src/modules/orders/dto/order.dto.js";

const order = {
  id_pedido: 7, numero_nota_venta: "NV-7", fecha_creacion: "2026-10-01T10:00:00.000Z",
  fecha_estimada_termino: "2026-10-10T00:00:00.000Z", nombre_cliente: "Cliente",
  id_etapa_general: 2, nombre_etapa_general: "En produccion", id_estado_pago: 2,
  estado_pago: "Confirmado", etiquetas: [{ id_etiqueta: 5, nombre_etiqueta: "Urgencia" }],
  detalles: [{ id_detalle_pedido: 3, nombre_producto: "Lanyard", cantidad: 20, subProcesses: [] }],
  comments: [], seller: "Manager",
};

test("cada módulo recibe solo su DTO canónico", () => {
  const kanban = toKanbanOrderSummaryDTO(order);
  const calendar = toCalendarOrderSummaryDTO(order);
  const payment = toPaymentOrderDTO(order);
  assert.equal(kanban.salesNoteNumber, "NV-7");
  assert.equal(kanban.paymentStatus, "Confirmado");
  assert.equal(Object.hasOwn(calendar, "paymentStatus"), false);
  assert.equal(Object.hasOwn(payment, "items"), false);
  assert.equal(toKanbanOrderDetailDTO(order).comments.length, 0);
  assert.equal(toCalendarOrderDetailDTO(order).seller, "Manager");
  assert.deepEqual(toOrderCreatedDTO(order), { id: 7, salesNoteNumber: "NV-7" });
});

test("los contratos no exponen nombres internos", () => {
  for (const dto of [toKanbanOrderSummaryDTO(order), toCalendarOrderSummaryDTO(order), toPaymentOrderDTO(order)]) {
    assert.equal(Object.hasOwn(dto, "id_pedido"), false);
    assert.equal(Object.hasOwn(dto, "numero_nota_venta"), false);
  }
  assert.throws(() => toKanbanOrderSummaryDTO({ id: 7 }), /id_pedido/);
});

test("los parches de etapa y etiquetas son canónicos", () => {
  assert.deepEqual(toOrderStagePatchDTO({ id_pedido: 7, id_estado_pedido: 3, id_etapa_general: 2, nombre_etapa_general: "En produccion" }), {
    id: 7, orderStatusId: 3, generalStepId: 2, orderStatus: "En produccion",
  });
  assert.deepEqual(toOrderLabelsPatchDTO(order), { id: 7, labels: [{ id: 5, name: "Urgencia" }] });
});
