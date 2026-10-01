import assert from "node:assert/strict";
import { test } from "node:test";
import {
  toOrderDTO,
  toOrderLabelsPatchDTO,
  toOrderStagePatchDTO,
  toPaymentOrderDTO,
} from "../src/modules/orders/dto/order.dto.js";

test("OrderDTO expone un unico contrato canonico", () => {
  const dto = toOrderDTO({
    id_pedido: 7,
    numero_nota_venta: "NV-7",
    fecha_creacion: "2026-10-01T10:00:00.000Z",
    fecha_estimada_termino: "2026-10-10T00:00:00.000Z",
    nombre_cliente: "Cliente",
    usuario_manager_origen: "Manager",
    nombre_producto: "Lanyard",
    cantidad: 20,
    detalles: [{
      id_detalle_pedido: 3,
      id_tipo_producto: 2,
      nombre_producto: "Lanyard",
      cantidad: 20,
      fecha_estimada_termino: "2026-10-10T00:00:00.000Z",
      subProcesses: [],
    }],
    id_etapa_general: 2,
    id_estado_pedido: 3,
    nombre_etapa_general: "En produccion",
    id_estado_pago: 2,
    estado_pago: "Confirmado",
    etiquetas: [{ id_etiqueta: 5, nombre_etiqueta: "Urgencia" }],
    comments: [],
  });

  assert.equal(dto.id, 7);
  assert.equal(dto.salesNoteNumber, "NV-7");
  assert.equal(dto.sourceManagerUser, "Manager");
  assert.deepEqual(dto.labels, [{ id: 5, name: "Urgencia" }]);
  assert.equal(dto.items[0].id, "3");
  assert.equal(dto.items[0].product, "Lanyard");
  assert.equal(dto.items[0].quantity, 20);
  assert.equal(dto.generalStepId, 2);
  assert.equal(dto.orderStatusId, 3);

  for (const legacyField of [
    "id_pedido",
    "numero_nota_venta",
    "fecha_creacion",
    "detalles",
    "id_etapa_general",
    "estado_pago",
    "etiquetas",
  ]) {
    assert.equal(Object.hasOwn(dto, legacyField), false, legacyField);
  }
});

test("el mapper rechaza aliases canonicos en su entrada interna", () => {
  assert.throws(
    () => toOrderDTO({ id: 7, salesNoteNumber: "NV-7" }),
    /id_pedido/,
  );
  assert.throws(
    () => toOrderStagePatchDTO({ id: 7, generalStepId: 2 }),
    /id_pedido/,
  );
});

test("PaymentOrderDTO traduce el contrato interno de cobranzas sin aliases", () => {
  assert.deepEqual(toPaymentOrderDTO({
    id_pedido: 7,
    numero_nota_venta: "NV-7",
    fecha_creacion: "2026-10-01T10:00:00.000Z",
    nombre_cliente: "Cliente",
    razon_social: "Cliente SpA",
    rut_cliente: "1-9",
    id_etapa_general: 1,
    id_estado_pedido: 2,
    nombre_etapa_general: "Listo para produccion",
    id_estado_pago: 2,
    estado_pago: "Confirmado",
  }), {
    id: 7,
    salesNoteNumber: "NV-7",
    createdAt: "2026-10-01T10:00:00.000Z",
    clientName: "Cliente",
    clientBusinessName: "Cliente SpA",
    clientRut: "1-9",
    generalStepId: 1,
    orderStatusId: 2,
    orderStatus: "Listo para produccion",
    paymentStatusId: 2,
    paymentStatus: "Confirmado",
  });
});

test("los parches de etapa y etiquetas tambien son canonicos", () => {
  assert.deepEqual(toOrderStagePatchDTO({
    id_pedido: 7,
    id_estado_pedido: 3,
    id_etapa_general: 2,
    nombre_etapa_general: "En produccion",
  }), {
    id: 7,
    orderStatusId: 3,
    generalStepId: 2,
    orderStatus: "En produccion",
  });

  assert.deepEqual(toOrderLabelsPatchDTO({
    id_pedido: 7,
    etiquetas: [{ id_etiqueta: 5, nombre_etiqueta: "Urgencia" }],
  }), {
    id: 7,
    labels: [{ id: 5, name: "Urgencia" }],
  });
});
