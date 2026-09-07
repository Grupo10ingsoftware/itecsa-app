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

test("lista pedidos sin depender de Documento/Nota_Venta legacy", async () => {
  const repo = new OrderRepository({
    prisma: {
      pedidos: {
        async findMany(query) {
          assert.equal(query.include.Documento, undefined);
          return [
            {
              id_pedido: 1,
              fecha_creacion: new Date("2026-06-10T00:00:00.000Z"),
              numero_nota_venta: null,
              id_estado_pago: 1,
              Estado_Pago: { nombre_estado_pago: "Pendiente" },
              Cliente: null,
              Detalle_pedido: [],
              Estado_Pedido: null,
              Estado_Pago: {
                nombre_estado_pago: "Pendiente",
              },
              Pedido_Etiqueta: [
                {
                  etiqueta: {
                    id_etiqueta: 1,
                    nombre_etiqueta: "Urgente",
                  },
                },
              ],
            },
          ];
        },
      },
    },
  });

  const orders = await repo.getAllOrders();

  assert.equal(orders[0].ruta_pdf, null);
  assert.equal(orders[0].numero_nota_venta, null);
  assert.equal(orders[0].firmado, null);
  assert.equal(orders[0].firma_pago, null);
  assert.equal(orders[0].estado_pago, "Pendiente");
  assert.deepEqual(orders[0].etiquetas, [
    {
      id_etiqueta: 1,
      nombre_etiqueta: "Urgente",
    },
  ]);
});

test("lista pedidos con productos y cliente usando relaciones vigentes", async () => {
  const repo = new OrderRepository({
    prisma: {
      pedidos: {
        async findMany() {
          return [
            {
              id_pedido: 2,
              fecha_creacion: new Date("2026-06-10T00:00:00.000Z"),
              id_estado_pago: 2,
              Estado_Pago: { nombre_estado_pago: "Confirmado" },
              observacion_interna: "Coordinar entrega con el cliente.",
              Cliente: {
                nombre_cliente: "Mall Plaza",
                rut_cliente: "76.812.440-5",
                razon_social: "Mall Plaza",
              },
              Detalle_pedido: [
                {
                  id_detalle_pedido: 5,
                  cantidad: 250,
                  fecha_estimada_termino: null,
                  fecha_real_termino: null,
                  id_tipo_producto: 7,
                  Tipo_Producto: {
                    nombre_producto: "Lanyard",
                    descripcion_producto: "Lanyard sublimado",
                    Producto_Subproceso: [
                      {
                        id_estado_subproceso: 1,
                        orden_flujo: 1,
                        Estado_Subprocesos: {
                          nombre_estado: "Impresion",
                        },
                      },
                    ],
                  },
                },
              ],
              Estado_Pedido: {
                orden_kanban: 1,
                nombre_etapa: "Listo para produccion",
              },
              Estado_Pago: {
                nombre_estado_pago: "Confirmado",
              },
              Pedido_Etiqueta: [],
            },
          ];
        },
      },
    },
  });

  const orders = await repo.getAllOrders();

  assert.equal(orders[0].nombre_cliente, "Mall Plaza");
  assert.equal(orders[0].rut_cliente, "76.812.440-5");
  assert.equal(orders[0].nombre_producto, "Lanyard");
  assert.equal(orders[0].descripcion_producto, "Lanyard sublimado");
  assert.equal(orders[0].cantidad, 250);
  assert.equal(orders[0].id_etapa_general, 1);
  assert.equal(orders[0].nombre_etapa_general, "Listo para produccion");
  assert.deepEqual(orders[0].comments, [
    {
      id: "pedido-2-observacion-inicial",
      text: "Coordinar entrega con el cliente.",
    },
  ]);
  assert.deepEqual(orders[0].detalles, [
    {
      id_detalle_pedido: 5,
      id: "5",
      id_tipo_producto: 7,
      nombre_producto: "Lanyard",
      product: "Lanyard",
      descripcion_producto: "Lanyard sublimado",
      cantidad: 250,
      quantity: 250,
      fecha_estimada_termino: null,
      dueDate: null,
      fecha_real_termino: null,
      id_estado_subproceso: null,
      estado_subproceso: null,
      subProcesses: [
        {
          id: "1",
          name: "Impresion",
          status: "pending",
          order: 1,
        },
      ],
    },
  ]);
});

test("crea un pedido sin hidratar relaciones cuando el flujo no las necesita aun", async () => {
  let reads = 0;
  const repo = new OrderRepository({
    prisma: {
      pedidos: {
        async create({ data }) {
          return { id_pedido: 23, ...data };
        },
        async findUnique() {
          reads += 1;
          return null;
        },
      },
    },
  });

  const order = await repo.create(
    {
      id_cliente: 3,
      id_usuario: 8,
      id_estado_pedido: 1,
      id_estado_pago: 1,
      numero_nota_venta: "24956",
    },
    { hydrate: false },
  );

  assert.equal(order.id_pedido, 23);
  assert.equal(reads, 0);
});
