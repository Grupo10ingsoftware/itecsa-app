import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import express from 'express';
import Server from '../src/server.js';
import { requestContext, errorHandler } from '../src/errors/httpErrors.js';
import { createThrottleMiddleware } from '../src/middlewares/rateLimit.js';
import { MemoryThrottleService } from '../src/modules/security/service/securityThrottle.service.js';

const origin = 'https://frontend.example.invalid';
process.env.AUTH0_DOMAIN ||= 'auth.example.invalid';
process.env.AUTH0_AUDIENCE ||= 'https://api.example.invalid';

async function listen(app, t) {
  const server = app.listen(0, '127.0.0.1');
  t.after(() => server.close());
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}`;
}

function createServer() {
  return new Server({
    env: { ...process.env, FRONTEND_ORIGIN: origin, TRUST_PROXY: '0' },
    appEnvironment: 'test',
    logger: { info() {}, error() {} },
  });
}

function assertHeaders(response) {
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.equal(response.headers.get('strict-transport-security'), null);
  assert.equal(response.headers.get('content-security-policy'), null);
}

test('P13: headers, CORS and health on the real server', async (t) => {
  const base = await listen(createServer().app, t);
  const valid = await fetch(`${base}/api/health/live`, { headers: { Origin: origin } });
  assert.equal(valid.status, 200);
  assert.deepEqual(await valid.json(), { status: 'ok' });
  assertHeaders(valid);
  assert.equal(valid.headers.get('access-control-allow-origin'), origin);

  const invalid = await fetch(`${base}/api/health/live`, {
    headers: { Origin: 'https://other.example.invalid' },
  });
  assert.equal(invalid.status, 200);
  assertHeaders(invalid);
  assert.notEqual(invalid.headers.get('access-control-allow-origin'), 'https://other.example.invalid');

  const preflight = await fetch(`${base}/api/auth/verify`, {
    method: 'OPTIONS',
    headers: { Origin: origin, 'Access-Control-Request-Method': 'GET' },
  });
  assert.equal(preflight.status, 204);
  assertHeaders(preflight);
  assert.equal(preflight.headers.get('access-control-allow-origin'), origin);

  const legacy = await fetch(`${base}/api/health/db`);
  assert.equal(legacy.status, 404);
  assert.equal((await legacy.json()).code, 'NOT_FOUND');
  assertHeaders(legacy);

  const readiness = await fetch(`${base}/internal/ready`);
  assert.equal(readiness.status, 404);
  assertHeaders(readiness);
});

test('P13: JSON size, unauthenticated auth and missing routes retain safe HTTP responses', async (t) => {
  const base = await listen(createServer().app, t);
  const under = await fetch(`${base}/missing`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: 'a'.repeat(90_000) }),
  });
  assert.equal(under.status, 404);
  assert.equal((await under.json()).code, 'NOT_FOUND');
  assertHeaders(under);

  const over = await fetch(`${base}/missing`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: 'a'.repeat(110_000) }),
  });
  assert.equal(over.status, 413);
  assert.deepEqual(await over.json(), {
    code: 'PAYLOAD_TOO_LARGE', message: 'La solicitud supera el tamano permitido.',
  });
  assertHeaders(over);

  const unauthenticated = await fetch(`${base}/api/auth/verify`);
  assert.equal(unauthenticated.status, 401);
  assert.equal((await unauthenticated.json()).code, 'UNAUTHENTICATED');
  assertHeaders(unauthenticated);

  const missing = await fetch(`${base}/missing`);
  assert.equal(missing.status, 404);
  assertHeaders(missing);
});

test('P13: a 500 response hides internals while retaining a diagnostic request ID', async (t) => {
  const logs = [];
  class FailingServer extends Server {
    routes() {
      this.app.get('/failure', () => { throw new Error('private-db-password'); });
      super.routes();
    }
  }
  const instance = new FailingServer({
    env: { ...process.env, FRONTEND_ORIGIN: origin, TRUST_PROXY: '0' },
    appEnvironment: 'test', logger: { info() {}, error: (...entry) => logs.push(entry) },
  });
  const base = await listen(instance.app, t);
  const response = await fetch(`${base}/failure`);
  assert.equal(response.status, 500);
  assertHeaders(response);
  const body = await response.json();
  assert.equal(body.code, 'INTERNAL_ERROR');
  assert.equal(body.requestId, response.headers.get('x-request-id'));
  assert.doesNotMatch(JSON.stringify([body, logs]), /private-db-password/);
  assert.equal(logs[0][1].requestId, body.requestId);
});

test('P13: a quota returns 429 and recovers after its window', async (t) => {
  let now = new Date(1_000);
  const throttle = new MemoryThrottleService({ now: () => now });
  const app = express();
  app.use(requestContext);
  app.use(createThrottleMiddleware({ throttle, rules: (req) => [{
    scope: 'p13-http-test', subject: req.ip, limit: 2, windowMs: 1_000,
  }] }));
  app.get('/quota', (_req, res) => res.json({ status: 'ok' }));
  app.use(errorHandler);
  const base = await listen(app, t);
  for (let i = 0; i < 2; i++) assert.equal((await fetch(`${base}/quota`)).status, 200);
  const limited = await fetch(`${base}/quota`);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '1');
  assert.equal((await limited.json()).code, 'RATE_LIMITED');
  now = new Date(2_000);
  assert.equal((await fetch(`${base}/quota`)).status, 200);
});

test('P13: forwarded client IP is used only when the proxy hop is trusted', async (t) => {
  for (const [trustProxy, expected] of [[false, '127.0.0.1'], [1, '192.0.2.10']]) {
    const app = express();
    app.set('trust proxy', trustProxy);
    app.get('/ip', (req, res) => res.json({ ip: req.ip }));
    const base = await listen(app, t);
    const response = await fetch(`${base}/ip`, {
      headers: { 'X-Forwarded-For': '192.0.2.10' },
    });
    assert.deepEqual(await response.json(), { ip: expected });
  }
});
