import assert from "node:assert/strict";
import { test } from "node:test";

import PaymentStatusRepo from "../src/modules/payments/repo/paymentStatus.repo.js";

test("reutiliza temporalmente los estados cargados para validar un pago", async () => {
  let listQueries = 0;
  let detailQueries = 0;
  const statuses = [
    { id_estado_pago: 1, nombre_estado_pago: "Pendiente" },
    { id_estado_pago: 2, nombre_estado_pago: "Confirmado" },
  ];
  const repo = new PaymentStatusRepo({
    prisma: {
      estado_Pago: {
        async findMany() {
          listQueries += 1;
          return statuses;
        },
        async findUnique() {
          detailQueries += 1;
          return statuses[1];
        },
      },
    },
  });

  await repo.getAll();
  const confirmed = await repo.get(2);

  assert.equal(confirmed.nombre_estado_pago, "Confirmado");
  assert.equal(listQueries, 1);
  assert.equal(detailQueries, 0);
});

test("consulta por ID cuando el catalogo aun no esta en cache", async () => {
  let detailQueries = 0;
  const repo = new PaymentStatusRepo({
    prisma: {
      estado_Pago: {
        async findUnique({ where }) {
          detailQueries += 1;
          return {
            id_estado_pago: where.id_estado_pago,
            nombre_estado_pago: "Rechazado",
          };
        },
      },
    },
  });

  const rejected = await repo.get(3);

  assert.equal(rejected.id_estado_pago, 3);
  assert.equal(detailQueries, 1);
});
