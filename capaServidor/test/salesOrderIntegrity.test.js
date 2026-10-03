import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import express from "express";
import { createOrderRouter } from "../src/modules/orders/routes/order.routes.js";
import { payloadFor } from "./authorization.fixture.js";
import OrderService from "../src/modules/orders/service/order.service.js";
import SalesNoteSourceService, { normalizeSalesNote } from "../src/modules/orders/service/salesNoteSource.service.js";
import { validateCreateSalesOrder, validateSalesNoteSource } from "../src/modules/orders/service/salesOrder.validator.js";
import { SalesOrderError, sendOrderError } from "../src/modules/orders/service/salesOrder.errors.js";
import OrderController from "../src/modules/orders/controller/orders.controller.js";
import PaymentRecordService from "../src/modules/payments/service/paymentRecord.service.js";

const note = () => ({
  numeroNota: "24226", cliente: { rut: "RUT-DEMO-001", nombre: "Cliente de prueba" },
  origen: { usuarioManager: "origen" }, observaciones: "Texto de origen",
  items: [
    { codigo: "A", producto: "Tarjeta A", tipoProducto: "Tarjeta", cantidad: 10 },
    { codigo: "B", producto: "Tarjeta B", tipoProducto: "Tarjeta", cantidad: 10 },
  ], itemsSinSeguimientoProductivo: [],
});

// Doble de unidad de trabajo: no es un motor SQL ni prueba de aislamiento MySQL.
function setup({ source = note(), failAt, conflict, labelAvailable = false } = {}) {
  const state = { persisted: null, events: [], lines: [], labels: [], sourceReads: 0, userReads: 0, transactions: 0 };
  const deps = {
    repo: {
      existsBySalesNoteNumber: async () => false,
      async create(data) {
        if (conflict) throw conflict;
        state.persisted = data;
        return { id_pedido: 1, ...data };
      },
      async recordCreation(event) { state.events.push(event); if (failAt === "audit") throw new Error("audit failure"); },
      getProductSubprocesses: async () => [],
      createUntrackedItems: async () => [],
      addLabels: async (_orderId, ids) => { state.labels.push(...ids); },
      async notifyCollectionsAdministrators() { if (failAt === "notification") throw new Error("notification failure"); },
      notifyProductionAdministrators: async () => {},
      get: async () => ({ id_pedido: 1, ...state.persisted }),
    },
    clientService: { findOrCreateClient: async () => ({ id_cliente: 2 }) },
    productTypeService: { getProductTypeByName: async () => ({ id_tipo_producto: 3 }) },
    orderDetailService: { async createOrderDetail(id, data) {
      state.lines.push(data);
      if (failAt === "detail" && state.lines.length === 2) throw new Error("detail failure");
      return { id_detalle_pedido: state.lines.length, ...data };
    } },
    repoClient: { etiqueta: { findMany: async () => labelAvailable ? [{ id_etiqueta: 4 }] : [] } },
  };
  const sourceService = { async getByNumber(id) {
    state.sourceReads++;
    assert.equal(id, "24226");
    if (!source) throw new SalesOrderError("Nota de Venta no encontrada.", 404);
    return structuredClone(source);
  } };
  const userRepo = { async findByAuth0Id() { state.userReads++; return { idUsuario: 7 }; } };
  const service = new OrderService({
    ...deps, userRepo, salesNoteSourceService: sourceService,
    salesOrderTransaction: async (operation) => {
      state.transactions++;
      try { return await operation(deps); }
      catch (error) { state.persisted = null; state.events = []; state.lines = []; throw error; }
    },
  });
  return { service, state, deps, sourceService, userRepo };
}

test("creacion consulta fuente, canonicaliza alias e ignora campos comerciales y actor del cuerpo", async () => {
  const { service, state } = setup();
  const result = await service.createOrder({
    numeroNota: "NV-2026-24226", cliente: { nombre: "ALTERADO" }, items: {},
    id_usuario: 999, id_estado_pago: 3, observaciones: "ALTERADO", observacionInterna: " Interna ",
  }, { actorId: 7 });
  assert.equal(state.sourceReads, 1);
  assert.equal(state.userReads, 0, "reutiliza actor del contexto verificado");
  assert.equal(state.persisted.numero_nota_venta, "24226");
  assert.equal(state.persisted.id_usuario, 7);
  assert.equal(state.persisted.id_estado_pago, 1);
  assert.equal(state.persisted.observacion_origen, "Texto de origen");
  assert.equal(state.persisted.observacion_interna, "Interna");
  assert.equal(state.persisted.fecha_estimada_termino, null);
  assert.equal(result.detalles[0].codigo_origen, "A");
  assert.equal(state.events.length, 1);
  assert.equal(state.lines[0].codigo_origen, "A");
  assert.equal(state.lines[1].codigo_origen, "B");
  assert.notEqual(state.lines[0].linea_origen, state.lines[1].linea_origen);
  assert.match(state.lines[0].linea_origen, /^[a-f0-9]{64}:0$/);
});

test("rechaza el alias historico observacion_interna del contrato de alta", () => {
  assert.throws(
    () => validateCreateSalesOrder({
      numeroNota: "24226",
      observacion_interna: "Alias antiguo",
    }),
    /usa observacionInterna/,
  );
});

test("actor de token se resuelve una vez cuando no hay contexto interno", async () => {
  const { service, state } = setup();
  await service.createOrder({ numeroNota: "24226", id_usuario: 999 }, { auth0UserId: "auth0|test" });
  assert.equal(state.userReads, 1);
  assert.equal(state.persisted.id_usuario, 7);
});

test("prioridad valida asigna la etiqueta disponible; ausencia revierte la creacion", async () => {
  const { service, state } = setup({ labelAvailable: true });
  await service.createOrder({ numeroNota: "24226", priority: "urgent" }, { actorId: 7 });
  assert.equal(state.persisted.id_etiqueta, 4);
  assert.deepEqual(state.labels, [4]);
  const missing = setup();
  await assert.rejects(missing.service.createOrder({ numeroNota: "24226", priority: "urgent" }, { actorId: 7 }), { statusCode: 409 });
  assert.equal(missing.state.persisted, null);
});

test("el cuerpo no puede habilitar la creacion antigua sin NV ni autenticar al actor", async () => {
  const { service, state } = setup();
  await assert.rejects(service.createOrder({ rut_cliente: "X", productos: [{}] }, { actorId: 7 }), { statusCode: 400 });
  await assert.rejects(service.createOrder({ numeroNota: "24226", id_usuario: 7 }), { statusCode: 403 });
  assert.equal(state.transactions, 0);
});

test("NV inexistente no inicia escrituras", async () => {
  const { service, state } = setup({ source: null });
  await assert.rejects(service.createOrder({ numeroNota: "24226" }, { actorId: 7 }), { statusCode: 404 });
  assert.equal(state.transactions, 0);
});

for (const cantidad of [-2, 0, 1.5, null, "", true, "10", 2147483648]) {
  test(`rechaza cantidad de fuente fuera de contrato: ${JSON.stringify(cantidad)}`, async () => {
    const source = note(); source.items[0].cantidad = cantidad;
    const { service, state } = setup({ source });
    await assert.rejects(service.createOrder({ numeroNota: "24226" }, { actorId: 7 }), { statusCode: 422 });
    assert.equal(state.transactions, 0);
  });
}

for (const data of [null, [], {}, { numeroNota: 24226 }, { numeroNota: "NV-2026-" }, { numeroNota: "x".repeat(51) },
  { numeroNota: "24226", priority: [] }, { numeroNota: "24226", priority: "otro" },
  { numeroNota: "24226", observacionInterna: "x".repeat(301) }, { numeroNota: "24226", observacionInterna: {} }]) {
  test(`valida contrato editable ${JSON.stringify(data).slice(0, 80)}`, () => {
    assert.throws(() => validateCreateSalesOrder(data), { statusCode: 400 });
  });
}

test("rechaza fecha imposible, otra NV, items malformados y longitudes de fuente", () => {
  for (const patch of [{ fechaEntregaTentativaOrigen: "2026-02-30" }, { numeroNota: "OTRA" },
    { items: {} }, { items: [] }, { cliente: { rut: "x", nombre: "x".repeat(101) } }]) {
    assert.throws(() => validateSalesNoteSource({ ...note(), ...patch }, "24226"), { statusCode: 422 });
  }
});

test("todas las notas actuales respetan el nuevo contrato de fuente", async () => {
  const source = new SalesNoteSourceService();
  const records = await source.getSalesNotes();
  assert.ok(records.length > 0);
  for (const record of records) {
    const normalized = normalizeSalesNote(record);
    assert.doesNotThrow(() => validateSalesNoteSource(normalized, normalized.numeroNota));
  }
});

test("preview de ventas minimiza cliente sin cambiar el contrato interno de fuente", async () => {
  const source = note(); source.cliente.direccion = "NO PUBLICAR"; source.cliente.comuna = "NO PUBLICAR";
  const { service, sourceService } = setup({ source });
  const preview = await service.getSalesNoteByNumber("24226");
  assert.deepEqual(Object.keys(preview.cliente).sort(), ["nombre", "rut"]);
  assert.equal(Object.hasOwn(preview, "origen"), false);
  assert.equal((await sourceService.getByNumber("24226")).cliente.direccion, "NO PUBLICAR");
});

for (const failAt of ["detail", "audit", "notification"]) {
  test(`propaga fallo ${failAt} a la unidad transaccional`, async () => {
    const { service, state } = setup({ failAt });
    await assert.rejects(service.createOrder({ numeroNota: "24226" }, { actorId: 7 }), new RegExp(`${failAt} failure`));
    assert.equal(state.transactions, 1);
    assert.equal(state.persisted, null);
    assert.deepEqual(state.events, []);
    assert.deepEqual(state.lines, []);
  });
}

test("inyectar fuente y repo no evita $transaction del camino real", async () => {
  const { sourceService, userRepo } = setup();
  let calls = 0;
  const sentinel = new Error("transaction boundary");
  const service = new OrderService({ repo: {}, salesNoteSourceService: sourceService, userRepo,
    prisma: { async $transaction() { calls++; throw sentinel; } } });
  await assert.rejects(service.createOrder({ numeroNota: "24226" }, { actorId: 7 }), sentinel);
  assert.equal(calls, 1);
});

test("solo el conflicto de la restriccion NV se convierte en duplicado 409", async () => {
  for (const target of ["Pedidos_numero_nota_venta_UNIQUE", ["numero_nota_venta"]]) {
    const { service } = setup({ conflict: { code: "P2002", meta: { target } } });
    await assert.rejects(service.createOrder({ numeroNota: "24226" }, { actorId: 7 }), { statusCode: 409 });
  }
  const conflict = { code: "P2002", meta: { target: ["rut_cliente"] } };
  const { service } = setup({ conflict });
  await assert.rejects(service.createOrder({ numeroNota: "24226" }, { actorId: 7 }), (error) => error === conflict);
});

test("errores inesperados no exponen mensaje ni datos; logger solo recibe correlacion", () => {
  let status, payload; const logs = [];
  const res = { status(value) { status = value; return this; }, json(value) { payload = value; return this; } };
  sendOrderError(res, new Error("SQL INTERNO Y DATOS"), { error: (value) => logs.push(value) });
  assert.equal(status, 500);
  assert.ok(payload.reference);
  assert.equal(JSON.stringify([payload, logs]).includes("SQL INTERNO"), false);
  assert.equal(logs[0].reference, payload.reference);
});

test("el log de un error Prisma conserva solo el codigo diagnostico seguro", () => {
  const logs = [];
  const res = { status() { return this; }, json() { return this; } };
  const error = new Error("SQL privado del cliente");
  error.code = "P2022";
  error.meta = { table: "Detalle_pedido", column: "producto_origen" };
  sendOrderError(res, error, { error: (value) => logs.push(value) });
  assert.equal(logs[0].databaseCode, "P2022");
  assert.equal(JSON.stringify(logs).includes("producto_origen"), false);
  assert.equal(JSON.stringify(logs).includes("SQL privado"), false);
});

test("controlador transmite actor verificado y conserva errores de dominio", async () => {
  let options, status, payload;
  const controller = new OrderController({ service: { async createOrder(_body, context) {
    options = context; throw new SalesOrderError("Nota inexistente", 404);
  } } });
  const res = { status(value) { status = value; return this; }, json(value) { payload = value; } };
  await controller.createOrder({ body: { actorId: 999 }, auth: { payload: { sub: "auth0|test" } }, currentUser: { idUsuario: 7 } }, res);
  assert.equal(options.actorId, 7);
  assert.equal(status, 404);
  assert.equal(payload.message, "Nota inexistente");
});

test("Cobranzas lee ambos SKU persistidos sin consultar una fuente modificada", async () => {
  const service = new PaymentRecordService({
    repo: { async getConfirmationSource() { return {
      id_pedido: 1, numero_nota_venta: "24226",
      Detalle_pedido: ["A", "B"].map((code, i) => ({ id_detalle_pedido: i + 1,
        linea_origen: `snapshot:${i}`, codigo_origen: code, producto_origen: `Producto ${code}`,
        cantidad: 10, Tipo_Producto: { nombre_producto: "Tarjeta" } })),
    }; } },
    salesNoteSourceService: { async getByNumber() { assert.fail("el snapshot no depende de la fuente actual"); } },
  });
  const result = await service.getConfirmationDetails(1);
  assert.deepEqual(result.products.map((item) => item.code), ["A", "B"]);
});

test("HTTP integrado: permiso, controlador, validacion y creacion autoritativa", async (t) => {
  const { service, state } = setup();
  const app = express();
  app.use(express.json());
  app.use("/api/orders", createOrderRouter({
    authenticate(req, res, next) {
      if (!req.headers.authorization) return res.sendStatus(401);
      req.auth = { payload: payloadFor(undefined, req.headers.authorization === "denied" ? { permissions: [] } : {}) };
      req.currentUser = { idUsuario: 7 };
      next();
    },
    controller: new OrderController({ service }),
  }));
  const server = app.listen(0, "127.0.0.1");
  t.after(() => server.close());
  await once(server, "listening");
  const url = `http://127.0.0.1:${server.address().port}/api/orders`;
  for (const [authorization, expected] of [["", 401], ["denied", 403], ["allowed", 201]]) {
    const res = await fetch(url, { method: "POST", headers: { authorization, "content-type": "application/json" },
      body: JSON.stringify({ numeroNota: "NV-2026-24226", id_usuario: 999, items: { manipulated: true } }) });
    assert.equal(res.status, expected);
    await res.text();
  }
  assert.equal(state.transactions, 1);
  assert.equal(state.persisted.id_usuario, 7);
  const invalid = await fetch(url, { method: "POST", headers: { authorization: "allowed", "content-type": "application/json" }, body: '{"items":{}}' });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).message.includes("map"), false);
  assert.equal(state.transactions, 1);
});
