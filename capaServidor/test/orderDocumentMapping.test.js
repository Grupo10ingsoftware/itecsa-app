import assert from "node:assert/strict";
import { test } from "node:test";

import OrderRepository, {
  buildSalesNotePdfUrl,
} from "../src/modules/orders/repo/orders.repo.js";

test("convierte ruta almacenada de NV a URL consumible por frontend", () => {
  assert.equal(
    buildSalesNotePdfUrl("itecsa-app\\data\\NVS\\Pedido1.pdf"),
    "/api/documents/nvs/Pedido1.pdf",
  );
});

test("lista pedidos con ruta_pdf de Nota de Venta expuesta como URL API", async () => {
  const repo = new OrderRepository({
    prisma: {
      pedidos: {
        async findMany() {
          return [
            {
              id_pedido: 1,
              fecha_creacion: new Date("2026-06-10T00:00:00.000Z"),
              id_estado_pago: 1,
              Cliente: null,
              Detalle_pedido: [],
              Estado_Pedido: null,
              Documento: [
                {
                  id_documento: 10,
                  ruta_pdf: "itecsa-app\\data\\NVS\\Pedido1.pdf",
                  Nota_Venta: {
                    numero_nota_venta: "Pedido1",
                  },
                },
              ],
            },
          ];
        },
      },
      estado_Pago: {
        async findMany() {
          return [
            {
              id_estado_Pago: 1,
              nombre_estado_pago: "Pendiente",
            },
          ];
        },
      },
    },
  });

  const orders = await repo.getAllOrders();

  assert.equal(orders[0].ruta_pdf, "/api/documents/nvs/Pedido1.pdf");
  assert.equal(orders[0].signed_ruta_pdf, undefined);
  assert.equal(orders[0].numero_nota_venta, "Pedido1");
});

test("lista pedidos confirmados usando la ruta original de la Nota de Venta", async () => {
  const repo = new OrderRepository({
    prisma: {
      pedidos: {
        async findMany() {
          return [
            {
              id_pedido: 2,
              fecha_creacion: new Date("2026-06-10T00:00:00.000Z"),
              id_estado_pago: 2,
              Cliente: null,
              Detalle_pedido: [],
              Estado_Pedido: null,
              Documento: [
                {
                  id_documento: 20,
                  ruta_pdf: "itecsa-app\\data\\NVS\\Pedido2.pdf",
                  Nota_Venta: {
                    numero_nota_venta: "Pedido2",
                  },
                },
              ],
            },
          ];
        },
      },
      estado_Pago: {
        async findMany() {
          return [
            {
              id_estado_Pago: 2,
              nombre_estado_pago: "Confirmado",
            },
          ];
        },
      },
    },
  });

  const orders = await repo.getAllOrders();

  assert.equal(orders[0].ruta_pdf, "/api/documents/nvs/Pedido2.pdf");
  assert.equal(orders[0].signed_ruta_pdf, undefined);
});
