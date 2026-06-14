import assert from "node:assert/strict";
import { test } from "node:test";

import PaymentRecordRepo from "../src/modules/payments/repo/paymentRecord.repo.js";

test("create asigna id_registro_pago explicitamente", async () => {
  const calls = [];
  const repo = new PaymentRecordRepo({
    prisma: {
      registro_Pago: {
        async aggregate() {
          return { _max: { id_registro_pago: 17 } };
        },
        async create(payload) {
          calls.push(payload);
          return payload.data;
        },
      },
    },
  });

  const record = await repo.create(3, {
    id_usuario: 4,
    id_estado_pago: 2,
    observacion: "Cambio de estado a Confirmado desde modulo de pagos.",
  });

  assert.equal(record.id_registro_pago, 18);
  assert.equal(calls[0].data.id_registro_pago, 18);
  assert.equal(calls[0].data.id_pedido, 3);
  assert.equal(calls[0].data.id_usuario, 4);
  assert.equal(calls[0].data.id_estado_pago, 2);
});
