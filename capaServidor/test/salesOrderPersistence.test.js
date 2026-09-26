import assert from "node:assert/strict";
import { test } from "node:test";
import OrderService from "../src/modules/orders/service/order.service.js";
import OrderRepository from "../src/modules/orders/repo/orders.repo.js";
import PaymentRecordRepo from "../src/modules/payments/repo/paymentRecord.repo.js";
import { createLineSnapshots } from "../src/modules/orders/service/salesOrder.snapshot.js";

const source = {
  numeroNota: "42", cliente: { rut: "RUT-DEMO-001", nombre: "Prueba" },
  items: [{ codigo: "SKU-A", producto: "Producto A", tipoProducto: "Tarjeta", cantidad: 2 },
    { codigo: "SKU-B", producto: "Producto B", tipoProducto: "Tarjeta", cantidad: 2 }],
};

// Integra servicios/repositorios reales con un adaptador en memoria.
// Verifica cableado y propagacion; no prueba semantica de rollback/locks de MySQL.
function database({ failStage = false } = {}) {
  let committed = { orders: [], details: [], events: [], stages: [] };
  const calls = { transactions: 0, types: 0, subprocesses: 0 };
  const prisma = { async $transaction(operation, options) {
    calls.transactions++;
    assert.equal(options.timeout, 20000);
    const working = structuredClone(committed);
    const tx = {
      cliente: { findUnique: async () => ({ id_cliente: 2 }) },
      pedidos: {
        findFirst: async () => null,
        async create({ data }) { const row = { id_pedido: 1, ...data }; working.orders.push(row); return row; },
        async findUnique({ select }) {
          assert.equal(select.Detalle_pedido.select.codigo_origen, true);
          return { ...working.orders[0], Detalle_pedido: working.details, Registros: [] };
        },
      },
      tipo_Producto: { async findFirst() { calls.types++; return { id_tipo_producto: 3 }; } },
      producto_Subproceso: { async findMany() { calls.subprocesses++; return []; } },
      detalle_pedido: { async create({ data }) {
        const row = { id_detalle_pedido: working.details.length + 1, ...data };
        working.details.push(row); return row;
      } },
      registros: { async create({ data }) { working.events.push(data); return { ID_REGISTRO: 5 }; } },
      registro_Etapas: { async create({ data }) {
        if (failStage) throw new Error("stage failure");
        working.stages.push(data); return data;
      } },
      usuario: { findMany: async () => [] },
    };
    const result = await operation(tx);
    committed = working;
    return result;
  } };
  return { prisma, calls, read: () => structuredClone(committed) };
}

test("repositorios reales conservan snapshots, actor, evento y etapa con el mismo cliente transaccional", async () => {
  const db = database();
  const service = new OrderService({ prisma: db.prisma, salesNoteSourceService: { getByNumber: async () => source } });
  const result = await service.createOrder({ numeroNota: "42" }, { actorId: 7 });
  const rows = db.read();
  assert.equal(rows.orders.length, 1);
  assert.equal(rows.orders[0].id_usuario, 7);
  assert.equal(rows.details.length, 2);
  assert.deepEqual(rows.details.map((line) => line.codigo_origen), ["SKU-A", "SKU-B"]);
  assert.equal(rows.events.length, 1);
  assert.equal(rows.events[0].id_usuario, 7);
  assert.equal(rows.events[0].id_pedido, 1);
  assert.equal(rows.stages[0].id_registro, 5);
  assert.equal(rows.stages[0].id_estado_pedido, 1);
  assert.equal(rows.stages[0].fecha_hora_entrada.getTime(), rows.events[0].FECHA_HORA.getTime());
  assert.equal(result.detalles[1].codigo, "SKU-B");
  assert.deepEqual(db.calls, { transactions: 1, types: 1, subprocesses: 1 });
});

test("fallo en apertura inicial sale de la transaccion sin commit del adaptador", async () => {
  const db = database({ failStage: true });
  const service = new OrderService({ prisma: db.prisma, salesNoteSourceService: { getByNumber: async () => source } });
  await assert.rejects(service.createOrder({ numeroNota: "42" }, { actorId: 7 }), /stage failure/);
  assert.deepEqual(db.read(), { orders: [], details: [], events: [], stages: [] });
});

test("lectura posterior conserva codigo y descripcion y no sustituye el tipo productivo", async () => {
  const snapshots = createLineSnapshots(source.items);
  const repo = new OrderRepository({ prisma: { pedidos: { async findUnique() { return {
    id_pedido: 1, Detalle_pedido: source.items.map((item, i) => ({
      ...snapshots[i], cantidad: item.cantidad, id_detalle_pedido: i + 1,
      Tipo_Producto: { nombre_producto: "Tarjeta" },
    })),
  }; } } } });
  const result = await repo.get(1);
  assert.deepEqual(result.detalles.map((line) => line.codigo), ["SKU-A", "SKU-B"]);
  assert.equal(result.detalles[0].producto, "Producto A");
  assert.equal(result.detalles[0].nombre_producto, "Tarjeta");
});

test("consulta parametrizada de Cobranzas transporta los campos de snapshot", async () => {
  const repo = new PaymentRecordRepo({ prisma: { async $queryRaw(strings, snapshotFields, id) {
    assert.equal(id, 1);
    assert.match(snapshotFields.strings.join(""), /dp\.codigo_origen/);
    return [{ id_pedido: 1, id_detalle_pedido: 2, cantidad: 2,
      linea_origen: "version:0", codigo_origen: "SKU-A", producto_origen: "Producto A" }];
  } } });
  const result = await repo.getConfirmationSource(1);
  assert.equal(result.Detalle_pedido[0].codigo_origen, "SKU-A");
});

test("reevaluacion mantiene el nuevo snapshot consistente con los items que actualiza", async () => {
  const changes = [];
  const repo = new OrderRepository({ prisma: {
    pedidos: { findUnique: async () => ({ id_cliente: 2, Detalle_pedido: [{ id_detalle_pedido: 10 }] }), update: async () => ({}) },
    cliente: { update: async () => ({}) },
    tipo_Producto: { findFirst: async () => ({ id_tipo_producto: 3 }) },
    detalle_pedido: { update: async ({ data }) => changes.push(data), create: async ({ data }) => changes.push(data) },
    producto_Subproceso: { findFirst: async () => null },
    usuario: { findMany: async () => [] },
  } });
  repo.transitionGeneralStage = async () => ({ id_pedido: 1 });
  await repo.reevaluateFromSalesNote({ orderId: 1, salesNote: source, userId: 7 });
  assert.deepEqual(changes.map((line) => line.codigo_origen), ["SKU-A", "SKU-B"]);
  assert.notEqual(changes[0].linea_origen, changes[1].linea_origen);
});
