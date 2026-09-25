import assert from "node:assert/strict";
import { test } from "node:test";

import ProductionLoadService from "../src/modules/productionLoad/service/productionLoad.service.js";

test("calcula resumen diario desde detalles lanyard en produccion", async () => {
  const service = new ProductionLoadService({
    repo: {
      async getCapacity() { return 1200; },
      async listLanyardDetails() {
        return [
          { detailId: 1, dailyQuantity: 240 },
          { detailId: 2, dailyQuantity: 120 },
        ];
      },
    },
  });

  const result = await service.getDailyLoad({ date: "2026-09-24" });

  assert.equal(result.date, "2026-09-24");
  assert.equal(result.capacity, 1200);
  assert.equal(result.lanyardsInProduction, 360);
  assert.equal(result.percentage, 30);
});

test("guarda carga diaria usando el usuario interno vinculado", async () => {
  let received;
  const service = new ProductionLoadService({
    userRepo: {
      async findByAuth0Id(auth0UserId) {
        assert.equal(auth0UserId, "auth0|soporte");
        return { idUsuario: 7 };
      },
    },
    repo: {
      async getCapacity() { return 1200; },
      async updateDailyLoads(payload) { received = payload; },
      async listLanyardDetails() { return [{ detailId: 5, dailyQuantity: 100 }]; },
    },
  });

  const result = await service.saveDailyLoad({
    date: "2026-09-24",
    auth0UserId: "auth0|soporte",
    entries: [{ detailId: 5, quantity: 100 }],
  });

  assert.deepEqual(received.entries, [{ detailId: 5, quantity: 100, observation: undefined }]);
  assert.equal(received.userId, 7);
  assert.equal(result.lanyardsInProduction, 100);
});

test("rechaza cantidades diarias negativas", async () => {
  const service = new ProductionLoadService({
    userRepo: { async findByAuth0Id() { return { idUsuario: 1 }; } },
    repo: { async getCapacity() { return 1200; } },
  });

  await assert.rejects(
    () => service.saveDailyLoad({
      auth0UserId: "auth0|actor",
      entries: [{ detailId: 1, quantity: -1 }],
    }),
    /cantidad diaria/i,
  );
});
