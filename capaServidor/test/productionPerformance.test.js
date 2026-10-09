import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import express from 'express';
import MetricsService from '../src/modules/metrics/service/metrics.service.js';
import MetricsRepository from '../src/modules/metrics/repo/metrics.repo.js';
import MetricsController from '../src/modules/metrics/controller/metrics.controller.js';
import { createMetricsRouter } from '../src/modules/metrics/routes/metrics.routes.js';
import { createRequireActiveIdentity } from '../src/middlewares/requireActiveIdentity.js';
import { payloadFor } from './authorization.fixture.js';
import { ROLES } from '../../shared/authorization.js';

const period = { from: '2026-10-01', to: '2026-10-31' };
const order = (entry, due = '2026-10-02') => ({
  fecha_estimada_termino: due ? new Date(`${due}T00:00:00Z`) : null,
  Registros: entry ? [{ Registro_Etapas: { fecha_hora_entrada: new Date(entry) } }] : [],
});

test('RF70 clasifica por ingreso a Listo para entrega, día chileno y plazo completo', async () => {
  const service = new MetricsService({ repo: { async performanceOrders() { return [
    order('2026-10-02T14:00:00Z'), // same date, not late at midnight
    order('2026-10-03T02:59:59Z'), // still Oct 2 in Chile
    order('2026-10-03T03:00:00Z'), // Oct 3, late
    order('2026-10-01T03:00:00Z', '2026-10-10'), // early, inclusive start
    order('2026-11-01T02:59:59Z', '2026-10-31'), // inclusive end
    order('2026-10-05T12:00:00Z', null),
    order('2026-10-01T02:59:59Z'), // previous day
    order('2026-11-01T03:00:00Z'), // next day
    order(null),
  ]; } } });
  assert.deepEqual(await service.productionPerformance(period), {
    period, totalOrders: 6, deliveredOnTime: 4, deliveredLate: 1, missingDeadline: 1,
  });
});

test('RF70 usa horario de invierno y maneja un período sin datos', async () => {
  const service = new MetricsService({ repo: { async performanceOrders() {
    return [order('2026-07-01T03:59:59Z', '2026-07-01')];
  } } });
  assert.equal((await service.productionPerformance({ from: '2026-07-01', to: '2026-07-01' })).totalOrders, 0);
  const empty = new MetricsService({ repo: { async performanceOrders() { return []; } } });
  assert.deepEqual(await empty.productionPerformance(period), {
    period, totalOrders: 0, deliveredOnTime: 0, deliveredLate: 0, missingDeadline: 0,
  });
});

test('RF70 rechaza fechas inválidas y rangos excesivos antes de consultar', async () => {
  const service = new MetricsService({ repo: { performanceOrders() { assert.fail('No consultar'); } } });
  for (const range of [
    {}, { from: '2026-02-30', to: '2026-03-01' },
    { from: '2026-10-02', to: '2026-10-01' },
    { from: '2025-01-01', to: '2026-10-01' },
    { from: ['2026-10-01'], to: '2026-10-31' },
    { from: "' OR 1=1 --", to: '2026-10-31' },
  ]) await assert.rejects(service.productionPerformance(range), { statusCode: 400 });
});

test('RF70 consulta un evento por pedido y solo selecciona datos necesarios', async () => {
  let query;
  const repo = new MetricsRepository({ prisma: { pedidos: { async findMany(value) { query = value; return []; } } } });
  await repo.performanceOrders({ start: new Date('2026-10-01Z'), end: new Date('2026-11-01Z') });
  assert.equal(query.where.Registros.some.Registro_Etapas.Estado_Pedido.nombre_etapa, 'Listo para entrega');
  assert.equal(query.select.Registros.take, 1);
  assert.deepEqual(query.select.Registros.orderBy[0], { Registro_Etapas: { fecha_hora_entrada: 'desc' } });
  assert.deepEqual(Object.keys(query.select), ['fecha_estimada_termino', 'Registros']);
  assert.equal(query.where.Registros.some.Registro_Etapas.fecha_hora_entrada.lt.toISOString(), '2026-11-02T00:00:00.000Z');
});

test('RF70 exige sesión vinculada, rol y permiso; responde solo agregados sin caché', async t => {
  let calls = 0;
  const identity = createRequireActiveIdentity({ repository: {
    async findByAuth0Id(sub) { return { estadoUsuario: sub === 'inactive' ? 'Desvinculado' : 'Vinculado', rolUsuario: ROLES.GERENCIA }; },
  } });
  const app = express();
  app.use('/metrics', createMetricsRouter({
    authenticate(req, res, next) {
      if (!req.headers['x-user']) return res.sendStatus(401);
      req.auth = { payload: payloadFor(ROLES.GERENCIA, {
        sub: req.headers['x-user'], permissions: req.headers['x-no-permission'] ? [] : ['view:metrics'],
      }) };
      return identity(req, res, next);
    },
    controller: new MetricsController({ service: { async productionPerformance() { calls++; return { totalOrders: 0 }; } } }),
  }));
  const server = app.listen(0);
  t.after(() => server.close());
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/metrics/production-performance?from=2026-10-01&to=2026-10-31`;
  assert.equal((await fetch(url)).status, 401);
  assert.equal((await fetch(url, { headers: { 'x-user': 'inactive' } })).status, 403);
  assert.equal((await fetch(url, { headers: { 'x-user': 'active', 'x-no-permission': '1' } })).status, 403);
  assert.equal(calls, 0);
  const response = await fetch(url, { headers: { 'x-user': 'active' } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { totalOrders: 0 });
  assert.equal(calls, 1);
});
