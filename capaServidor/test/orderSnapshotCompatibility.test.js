import assert from "node:assert/strict";
import { test } from "node:test";
import OrderRepository from "../src/modules/orders/repo/orders.repo.js";
import OrderDetailRepo from "../src/modules/orders/repo/orderDetail.repo.js";
import PaymentRecordRepo from "../src/modules/payments/repo/paymentRecord.repo.js";

test("Orders lee y crea detalles cuando aun faltan las columnas de snapshot", async () => {
  let selected;
  let created;
  const prisma = {
    $queryRawUnsafe() {},
    async $queryRaw(strings) {
      assert.match(strings.join(""), /information_schema\.COLUMNS/);
      return [];
    },
    pedidos: {
      async findMany({ select }) { selected = select; return []; },
    },
    detalle_pedido: {
      async create(args) { created = args; return { id_detalle_pedido: 9 }; },
    },
  };

  assert.deepEqual(await new OrderRepository({ prisma }).getAllOrders(), []);
  assert.equal("codigo_origen" in selected.Detalle_pedido.select, false);

  await new OrderDetailRepo({ prisma }).create(4, {
    id_tipo_producto: 3,
    cantidad: 2,
    codigo_origen: "SKU-A",
    producto_origen: "Producto A",
  });
  assert.equal("codigo_origen" in created.data, false);
  assert.equal(created.data.id_pedido, 4);
  assert.equal(created.data.cantidad, 2);
  assert.equal(created.omit.codigo_origen, true);
});

test("Cobranzas proyecta NULL para snapshots ausentes sin consultar columnas inexistentes", async () => {
  let query;
  let calls = 0;
  const prisma = {
    $queryRawUnsafe() {},
    async $queryRaw(strings, columns, orderId) {
      calls++;
      if (calls === 1) return [];
      query = { columns, orderId };
      return [{ id_pedido: 4, id_detalle_pedido: 9, cantidad: 2 }];
    },
  };
  const source = await new PaymentRecordRepo({ prisma }).getConfirmationSource(4);
  assert.equal(query.orderId, 4);
  assert.match(query.columns.strings.join(""), /NULL AS codigo_origen/);
  assert.equal(source.Detalle_pedido.length, 1);
  assert.equal(source.Detalle_pedido[0].codigo_origen, undefined);
});
