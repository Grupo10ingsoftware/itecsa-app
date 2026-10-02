import assert from 'node:assert/strict';
import { test } from 'node:test';
import { listOrderViewsOperation, getOrderViewOperation, listPaymentViewsOperation } from '../src/modules/orders/repo/orderViewOperations.js';
import { pageResult, decodeCursor } from '../src/shared/pagination.js';
import { once } from 'node:events';
import express from 'express';
import { createOrderRouter } from '../src/modules/orders/routes/order.routes.js';
import OrderController from '../src/modules/orders/controller/orders.controller.js';
import { payloadFor } from './authorization.fixture.js';
import { ROLES } from '../../shared/authorization.js';

const row = (id) => ({
  id_pedido: id, numero_nota_venta: `NV-${id}`, fecha_creacion: new Date('2026-09-01'),
  fecha_estimada_termino: new Date('2026-10-01'), id_estado_pago: 2,
  Cliente: { nombre_cliente: 'Cliente', razon_social: 'Empresa', rut_cliente: '12345678-9' },
  Estado_Pedido: { orden_kanban: 2, nombre_etapa: 'En producción' },
  Estado_Pago: { nombre_estado_pago: 'Confirmado' },
  Detalle_pedido: [{ id_detalle_pedido: 7, cantidad: 3, fecha_estimada_termino: null, Tipo_Producto: { nombre_producto: 'Lanyard' } }],
  Pedido_Etiqueta: [{ etiqueta: { nombre_etiqueta: 'Urgencia' } }],
  observacion_interna: 'No debe viajar', Usuario: { correo_usuario: 'interno@example.test' },
});

test('Kanban pagina despues de excluir etapas cerradas y nunca envia datos internos', async () => {
  let received;
  const repository = { client: { pedidos: { async findMany(query) { received = query; return [row(102), row(101), row(100)]; } } } };
  const rows = await listOrderViewsOperation(repository, { view: 'kanban', limit: 2, cursor: null });
  const result = pageResult(rows, 2);
  assert.deepEqual(received.where.Estado_Pedido.is.nombre_etapa.notIn, ['Terminado', 'Cancelado']);
  assert.equal(received.take, 3);
  assert.equal(result.pageInfo.hasMore, true);
  assert.deepEqual(decodeCursor(result.pageInfo.nextCursor), { id: 101 });
  assert.deepEqual(Object.keys(result.items[0]).sort(), [
    'detalles', 'estado_pago', 'etiquetas', 'fecha_creacion', 'fecha_estimada_termino',
    'id_estado_pago', 'id_etapa_general', 'id_pedido', 'nombre_cliente',
    'nombre_etapa_general', 'numero_nota_venta',
  ].sort());
  assert.doesNotMatch(JSON.stringify(result), /12345678-9|No debe viajar|interno@example/);
});

test('Calendario aplica fecha y cursor antes de paginar y limita sus campos', async () => {
  let received;
  const repository = { client: { pedidos: { async findMany(query) { received = query; return [row(150), row(149)]; } } } };
  const rows = await listOrderViewsOperation(repository, {
    view: 'calendar', limit: 1, cursor: { id: 151 },
    from: new Date('2026-10-01'), to: new Date('2026-11-01'),
  });
  assert.equal(received.where.id_pedido.lt, 151);
  assert.equal(received.where.fecha_estimada_termino.gte.toISOString(), '2026-10-01T00:00:00.000Z');
  assert.equal(received.where.fecha_estimada_termino.lt.toISOString(), '2026-11-01T00:00:00.000Z');
  assert.equal(pageResult(rows, 1).pageInfo.hasMore, true);
  assert.deepEqual(Object.keys(rows[0]).sort(), [
    'detalles', 'etiquetas', 'fecha_estimada_termino', 'id_etapa_general', 'id_pedido', 'nombre_cliente', 'numero_nota_venta',
  ].sort());
  assert.doesNotMatch(JSON.stringify(rows), /12345678-9|No debe viajar|interno@example/);
});

test('detalle de Calendario tampoco lee snapshots o datos de pago', async () => {
  let received;
  const repository = { client: { pedidos: { async findUnique(query) { received = query; return { ...row(1), usuario_manager_origen: 'Ventas' }; } } } };
  const result = await getOrderViewOperation(repository, 1, 'calendar');
  assert.equal(received.select.id_estado_pago, undefined);
  assert.equal(received.select.Detalle_pedido.select.linea_origen, undefined);
  assert.equal(received.select.usuario_manager_origen, true);
  assert.equal(result.detalles[0].product, 'Lanyard');
  assert.equal(result.seller, 'Ventas');
  assert.equal(result.estado_pago, undefined);
});

test('detalle de Kanban admite esquema con y sin columnas de snapshot', async () => {
  for (const supported of [true, false]) {
    let select;
    const client = {
      $queryRaw: async () => supported ? Array.from({ length: 5 }, () => ({ name: 'column' })) : [],
      $queryRawUnsafe: async () => [],
      pedidos: { async findUnique(query) { select = query.select; return row(1); } },
    };
    const result = await getOrderViewOperation({ client }, 1, 'kanban');
    assert.equal(Object.hasOwn(select.Detalle_pedido.select, 'linea_origen'), supported);
    assert.equal(result.detalles[0].id_detalle_pedido, 7);
    assert.doesNotMatch(JSON.stringify(result), /12345678-9|No debe viajar|interno@example/);
  }
});

test('Pago pagina y mantiene contadores filtrados fuera del cursor', async () => {
  let listQuery;
  const counts = [];
  const repository = { client: { pedidos: {
    async findMany(query) { listQuery = query; return [row(2), row(1)]; },
    async count(query) { counts.push(query); return counts.length; },
  } } };
  const result = await listPaymentViewsOperation(repository, { limit: 1, cursor: { id: 3 }, status: 'Pendiente', search: 'Cliente' });
  assert.equal(listQuery.where.id_pedido.lt, 3);
  assert.equal(listQuery.where.Estado_Pago.is.nombre_estado_pago, 'Pendiente');
  assert.equal(counts.length, 3);
  assert.equal(counts[0].where.id_pedido, undefined);
  assert.deepEqual(result.counts, { pending: 1, rejected: 2, confirmed: 3 });
  assert.deepEqual(Object.keys(result.rows[0]).sort(), [
    'estado_pago', 'fecha_creacion', 'id_estado_pago', 'id_pedido', 'nombre_cliente',
    'numero_nota_venta', 'razon_social', 'rut_cliente',
  ].sort());
});

test('respuestas HTTP no entregan datos internos y Calendario exige su propia capacidad', async (t) => {
  const repository = { client: {
    $queryRaw: async () => [],
    pedidos: {
    async findMany(query) { return [row(2)].slice(0, query.take); },
    async findUnique() { return row(2); },
    async count() { return 1; },
  } } };
  const service = {
    async getAllOrders() { return pageResult(await listOrderViewsOperation(repository, { view: 'kanban', limit: 50 }), 50); },
    async getOrderViews(_query, view) { return pageResult(await listOrderViewsOperation(repository, { view, limit: 50 }), 50); },
    async getOrderViewById(id, view) { return getOrderViewOperation(repository, id, view); },
    async getPagedPaymentWorkspace() {
      const result = await listPaymentViewsOperation(repository, { limit: 50 });
      return { ...pageResult(result.rows, 50), counts: result.counts, paymentStatuses: [] };
    },
  };
  const app = express();
  const authenticate = (req, _res, next) => {
    req.auth = { payload: payloadFor(req.headers['x-test-role'] ?? ROLES.ADMINISTRADOR) };
    next();
  };
  app.use('/api/orders', createOrderRouter({ authenticate, controller: new OrderController({ service }) }));
  const server = app.listen(0, '127.0.0.1');
  t.after(() => server.close());
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api/orders`;
  const kanban = await fetch(`${base}/kanban-summary`, { headers: { 'x-test-role': ROLES.GERENCIA } });
  assert.equal(kanban.status, 200);
  assert.doesNotMatch(JSON.stringify(await kanban.json()), /12345678-9|No debe viajar|interno@example/);
  for (const path of ['', '/kanban', '/2', '/2/kanban-detail']) {
    const alias = await fetch(`${base}${path}`, { headers: { 'x-test-role': ROLES.GERENCIA } });
    assert.equal(alias.status, 200, path);
    assert.doesNotMatch(JSON.stringify(await alias.json()), /12345678-9|No debe viajar|interno@example/, path);
  }
  const deniedCalendar = await fetch(`${base}/calendar-summary`, { headers: { 'x-test-role': ROLES.GERENCIA } });
  assert.equal(deniedCalendar.status, 403);
  const calendar = await fetch(`${base}/calendar-summary`, { headers: { 'x-test-role': ROLES.VENTAS } });
  assert.equal(calendar.status, 200);
  assert.doesNotMatch(JSON.stringify(await calendar.json()), /12345678-9|No debe viajar|interno@example/);
  const deniedPayment = await fetch(`${base}/payments`, { headers: { 'x-test-role': ROLES.VENTAS } });
  assert.equal(deniedPayment.status, 403);
});
