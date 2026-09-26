import assert from "node:assert/strict";
import { test } from "node:test";

import PaymentRecordRepo from "../src/modules/payments/repo/paymentRecord.repo.js";
import PaymentRecordService from "../src/modules/payments/service/paymentRecord.service.js";

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
    id_estado_pago_anterior: 1,
    id_estado_pago: 2,
    observacion: "Cambio de estado a Confirmado desde modulo de pagos.",
  });

  assert.equal(record.id_registro, 18);
  assert.equal(calls[0][0], "registros.create");
  assert.deepEqual(calls[0][1].data, {
    FECHA_HORA: registryCreatedAt,
    id_pedido: 3,
    id_usuario: 4,
    observacion: "Cambio de estado a Confirmado desde modulo de pagos.",
  });
  assert.equal(calls[1][0], "registro_Pago.create");
  assert.deepEqual(calls[1][1], {
    data: {
      id_registro: 18,
      fecha_registro: registryCreatedAt,
      observacion: "Cambio de estado a Confirmado desde modulo de pagos.",
      id_estado_pago_anterior: 1,
      id_estado_pago_nuevo: 2,
    },
    include: {
      Registros: true,
    },
  });
});

test("el registro exige un estado anterior distinto y lo pasa al repositorio", async () => {
  const calls = [];
  const service = new PaymentRecordService({
    repo: { async create(orderId, data) { calls.push({ orderId, data }); return data; } },
  });

  await assert.rejects(
    service.createPaymentRecord(3, { id_usuario: 4, id_estado_pago: 2 }),
    { statusCode: 400 },
  );
  await assert.rejects(
    service.createPaymentRecord(3, {
      id_usuario: 4, id_estado_pago_anterior: 2, id_estado_pago: 2,
    }),
    { statusCode: 400 },
  );
  assert.equal(calls.length, 0);

  await service.createPaymentRecord(3, {
    id_usuario: 4, id_estado_pago_anterior: 1, id_estado_pago: 2,
  });
  assert.deepEqual(calls, [{ orderId: 3, data: {
    fecha_registro: undefined,
    observacion: undefined,
    id_usuario: 4,
    id_estado_pago_anterior: 1,
    id_estado_pago: 2,
  } }]);
});

test("consulta el detalle del modal en una sola lectura parametrizada", async () => {
  let query;
  let values;
  const repo = new PaymentRecordRepo({
    prisma: {
      async $queryRaw(strings, ...parameters) {
        query = strings.join("?");
        values = parameters;
        return [
          {
            id_pedido: 33,
            numero_nota_venta: "23950",
            nombre_cliente: "Cliente Demo 013",
            razon_social: "Cliente Demo 013 SpA",
            rut_cliente: "RUT-DEMO-013",
            correo_usuario: "vendedor@itecsa.cl",
            id_detalle_pedido: 38,
            cantidad: 100,
            nombre_producto: "Lanyard",
            descripcion_producto: "Cordón porta credencial",
          },
        ];
      },
    },
  });

  const source = await repo.getConfirmationSource(33);

  assert.match(query, /LEFT JOIN Detalle_pedido/);
  assert.match(values[0].strings.join(""), /dp\.codigo_origen/);
  assert.equal(values[1], 33);
  assert.equal(source.Usuario.correo_usuario, "vendedor@itecsa.cl");
  assert.deepEqual(source.Detalle_pedido, [
    {
      id_detalle_pedido: 38,
      cantidad: 100,
      Tipo_Producto: {
        nombre_producto: "Lanyard",
        descripcion_producto: "Cordón porta credencial",
      },
    },
  ]);
});
