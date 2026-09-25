import assert from "node:assert/strict";
import { test } from "node:test";

import ProductionLoadRepository from "../src/modules/productionLoad/repo/productionLoad.repo.js";

test("guarda varias cargas de lanyard con lecturas agrupadas y escritura por lote", async () => {
  const calls = [];
  const details = [
    {
      id_detalle_pedido: 1,
      cantidad: 500,
      Tipo_Producto: { nombre_producto: "Lanyard" },
      Pedidos: { Estado_Pedido: { orden_kanban: 2 } },
    },
    {
      id_detalle_pedido: 2,
      cantidad: 300,
      Tipo_Producto: { nombre_producto: "Lanyard" },
      Pedidos: { Estado_Pedido: { orden_kanban: 2 } },
    },
    {
      id_detalle_pedido: 3,
      cantidad: 200,
      Tipo_Producto: { nombre_producto: "Lanyard" },
      Pedidos: { Estado_Pedido: { orden_kanban: 2 } },
    },
  ];
  const tx = {
    detalle_pedido: {
      async findMany(query) {
        calls.push(["detalle_pedido.findMany", query.where.id_detalle_pedido.in]);
        return details;
      },
    },
    avance_Lanyard: {
      async findMany(query) {
        calls.push(["avance_Lanyard.findMany", query.where.id_detalle_pedido.in]);
        return [
          { id_detalle_pedido: 2, cantidad_acumulada: 50 },
        ];
      },
    },
    async $executeRaw(query) {
      calls.push(["$executeRaw", query]);
      return 3;
    },
  };
  const repo = new ProductionLoadRepository({
    prisma: {
      async $transaction(callback, options) {
        calls.push(["$transaction", options]);
        return callback(tx);
      },
    },
  });

  await repo.updateDailyLoads({
    dateKey: "2026-09-24",
    entries: [
      { detailId: 1, quantity: 100 },
      { detailId: 2, quantity: 80 },
      { detailId: 3, quantity: 25 },
    ],
    userId: 7,
    capacity: 1200,
  });

  assert.deepEqual(calls.map((call) => call[0]), [
    "$transaction",
    "detalle_pedido.findMany",
    "avance_Lanyard.findMany",
    "$executeRaw",
  ]);
  assert.deepEqual(calls[1][1], [1, 2, 3]);
  assert.deepEqual(calls[2][1], [1, 2, 3]);
  assert.equal(calls[0][1].timeout, 15000);
});
