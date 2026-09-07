import assert from "node:assert/strict";
import { test } from "node:test";

import OrderService, {
  DUPLICATE_SALES_NOTE_MESSAGE,
} from "../src/modules/orders/service/order.service.js";

function createSalesNoteLookupService({ registered = false } = {}) {
  return new OrderService({
    repo: {
      async existsBySalesNoteNumber(numeroNota) {
        assert.equal(numeroNota, "24226");
        return registered;
      },
    },
    salesNoteSourceService: {
      async getByNumber(numeroNota) {
        assert.equal(numeroNota, "NV-2026-24226");
        return {
          numeroNota: "24226",
          cliente: { rut: "76.123.456-7", nombre: "Cliente Demo" },
          items: [],
        };
      },
    },
  });
}

test("permite revisar una Nota de Venta que aun no fue registrada", async () => {
  const service = createSalesNoteLookupService();

  const salesNote = await service.getSalesNoteByNumber("NV-2026-24226");

  assert.equal(salesNote.numeroNota, "24226");
});

test("advierte durante la busqueda cuando la Nota de Venta ya fue registrada", async () => {
  const service = createSalesNoteLookupService({ registered: true });

  await assert.rejects(
    () => service.getSalesNoteByNumber("NV-2026-24226"),
    {
      statusCode: 409,
      message: DUPLICATE_SALES_NOTE_MESSAGE,
    },
  );
});

test("persiste la observacion interna al crear el pedido", async () => {
  let persistedOrderData = null;
  const service = new OrderService({
    repo: {
      async getBySalesNoteNumber() {
        return null;
      },
      async create(data) {
        persistedOrderData = data;
        return { id_pedido: 101 };
      },
      async getProductSubprocesses() {
        return [];
      },
      async createUntrackedItems() {
        return [];
      },
      async get() {
        return {
          id_pedido: 101,
          observacion_interna: persistedOrderData?.observacion_interna,
        };
      },
    },
    clientService: {
      async findOrCreateClient() {
        return { id_cliente: 15 };
      },
    },
    orderDetailService: {
      async createOrderDetail() {
        return { id_detalle_pedido: 201 };
      },
    },
    productTypeService: {
      async getProductTypeByName() {
        return { id_tipo_producto: 2 };
      },
    },
    userRepo: {
      async findByAuth0Id() {
        return { idUsuario: 8 };
      },
    },
  });

  const order = await service.createOrder(
    {
      numeroNota: "24226",
      fechaEntregaTentativaOrigen: "2026-09-15",
      cliente: { rut: "76.123.456-7", nombre: "Cliente Demo" },
      origen: { usuarioManager: "ventas@itecsa.cl" },
      observaciones: "Observacion de origen",
      observacionInterna: "Coordinar entrega con el cliente.",
      items: [
        {
          codigo: "2100010060008",
          producto: "TARJETA HID PROXCARD CODIFICADA",
          cantidad: 100,
          tipoProducto: "Tarjeta",
        },
      ],
    },
    { auth0UserId: "auth0|sales-user" },
  );

  assert.equal(
    persistedOrderData.observacion_interna,
    "Coordinar entrega con el cliente.",
  );
  assert.equal(order.observacion_interna, "Coordinar entrega con el cliente.");
});
