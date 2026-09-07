import assert from "node:assert/strict";
import { test } from "node:test";

import PaymentRecordService from "../src/modules/payments/service/paymentRecord.service.js";

test("arma el detalle de confirmacion con vendedor y datos de la Nota de Venta", async () => {
  const service = new PaymentRecordService({
    repo: {
      async getConfirmationSource() {
        return {
          id_pedido: 33,
          numero_nota_venta: "23950",
          Cliente: {
            nombre_cliente: "Cliente Demo 013",
            razon_social: "Cliente Demo 013 SpA",
            rut_cliente: "RUT-DEMO-013",
          },
          Usuario: {
            correo_usuario: "vendedor@itecsa.cl",
          },
          Detalle_pedido: [
            {
              id_detalle_pedido: 38,
              cantidad: 100,
              Tipo_Producto: {
                nombre_producto: "Lanyard",
                descripcion_producto: "Cordón porta credencial",
              },
            },
          ],
        };
      },
    },
    salesNoteSourceService: {
      async getByNumber() {
        return {
          items: [
            {
              tipoProducto: "Lanyard",
              codigo: "2300030140053",
              producto: "LANYARD IMPRESO SUBLIMACION 20MM",
              cantidad: 100,
            },
          ],
        };
      },
    },
  });

  const result = await service.getConfirmationDetails(33);

  assert.deepEqual(result, {
    id: 33,
    nvNumber: "23950",
    companyName: "Cliente Demo 013",
    rut: "RUT-DEMO-013",
    sellerEmail: "vendedor@itecsa.cl",
    products: [
      {
        id: 38,
        productType: "Lanyard",
        code: "2300030140053",
        product: "LANYARD IMPRESO SUBLIMACION 20MM",
        quantity: 100,
      },
    ],
  });
});
