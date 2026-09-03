import assert from "node:assert/strict";
import { test } from "node:test";

import PaymentRecordRepo from "../src/modules/payments/repo/paymentRecord.repo.js";

test("create registra auditoria de pago enlazada a Registros", async () => {
  const calls = [];
  const registryCreatedAt = new Date("2026-09-02T10:00:00.000Z");
  const repo = new PaymentRecordRepo({
    prisma: {
      registros: {
        async create(payload) {
          calls.push(["registros.create", payload]);
          return {
            ID_REGISTRO: 18,
            ...payload.data,
          };
        },
      },
      registro_Pago: {
        async create(payload) {
          calls.push(["registro_Pago.create", payload]);
          return payload.data;
        },
      },
    },
  });

  const record = await repo.create(3, {
    fecha_registro: registryCreatedAt,
    id_usuario: 4,
    id_estado_pago: 2,
    observacion: "Cambio de estado a Confirmado desde modulo de pagos.",
  });

  assert.equal(record.id_registro, 18);
  assert.equal(calls[0][0], "registros.create");
  assert.deepEqual(calls[0][1].data, {
    FECHA_HORA: registryCreatedAt,
    id_pedido: 3,
    id_usuario: 4,
  });
  assert.equal(calls[1][0], "registro_Pago.create");
  assert.deepEqual(calls[1][1], {
    data: {
      id_registro: 18,
      fecha_registro: registryCreatedAt,
      observacion: "Cambio de estado a Confirmado desde modulo de pagos.",
      id_usuario: 4,
      id_estado_pago_nuevo: 2,
    },
    include: {
      Registros: true,
    },
  });
});
