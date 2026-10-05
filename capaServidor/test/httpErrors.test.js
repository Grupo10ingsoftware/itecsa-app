import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import express from 'express';
import { UnauthorizedError, InsufficientScopeError } from 'express-oauth2-jwt-bearer';
import { AppError } from '../src/errors/AppError.js';
import { requestContext, respondError, errorHandler } from '../src/errors/httpErrors.js';
import { Auth0ServiceError } from '../src/modules/users/service/auth0Management.service.js';
import { PinServiceError } from '../src/modules/auth/service/pin.service.js';
import { UserRepository } from '../src/modules/users/repo/users.repo.js';
import OrderController from '../src/modules/orders/controller/orders.controller.js';
import OrderService from '../src/modules/orders/service/order.service.js';
import ClientController from '../src/modules/clients/controller/clients.controller.js';
import PaymentRecordController from '../src/modules/payments/controller/paymentRecord.controller.js';
import MessageController from '../src/modules/messages/controller/message.controller.js';
import HistoryController from '../src/modules/history/controller/orderHistory.controller.js';
import MetricsController from '../src/modules/metrics/controller/metrics.controller.js';
import CapacityController from '../src/modules/productionCapacity/controller/productionCapacity.controller.js';
import LoadController from '../src/modules/productionLoad/controller/productionLoad.controller.js';
import { createGetProfileHandler } from '../src/modules/auth/controller/auth.controller.js';
import { createAdminUserMovementsHandler } from '../src/modules/users/controller/adminUsers.controller.js';
import Server from '../src/server.js';
import { payloadFor } from './authorization.fixture.js';

const SECRET = 'SELECT users FROM secret_table /var/app/internal.js';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function fixture() {
    const logs = [];
    const req = { method: 'GET', params: { orderId: 1, clientId: 1, userId: 'auth0|target' }, query: {},
        body: { pin: '654321', code: '123456', password: 'secret-password' },
        auth: { payload: payloadFor() }, originalUrl: '/orders/private@example.invalid?token=secret-token',
        route: { path: '/orders/:orderId' }, headers: { authorization: 'Bearer secret-token', 'x-request-id': 'forged' },
        app: { locals: { errorLogger: { error: (...args) => logs.push(args) } } } };
    const res = { headers: {}, setHeader(k,v) { this.headers[k] = v; },
        status(status) { this.statusCode = status; return this; }, json(body) { this.body = body; return this; } };
    return { req, res, logs };
}
function assertInternal(f) {
    assert.equal(f.res.statusCode, 500);
    assert.deepEqual(f.res.body, { code: 'INTERNAL_ERROR', message: 'Ocurrio un error interno.', requestId: f.res.body.requestId });
    assert.match(f.res.body.requestId, UUID);
    assert.equal(f.res.headers['X-Request-Id'], f.res.body.requestId);
    assert.equal(f.logs[0][1].requestId, f.res.body.requestId);
    for (const token of ['secret_table', '/var/app', '654321', '123456', 'secret-token', 'secret-password', 'private@example.invalid']) {
        assert.equal(JSON.stringify([f.res.body, f.logs]).includes(token), false);
    }
}

for (const [Controller, method] of [[OrderController, 'getOrder'], [ClientController, 'getClient'],
    [PaymentRecordController, 'getPaymentRecord'], [MessageController, 'getInbox'],
    [HistoryController, 'listOrders'], [MetricsController, 'summary'], [CapacityController, 'list'], [LoadController, 'getToday']]) {
    test(`${Controller.name} hides unexpected service errors`, async () => {
        const f = fixture();
        const controller = new Controller();
        controller.service = new Proxy({}, { get: () => async () => { throw Error(SECRET); } });
        await controller[method](f.req, f.res);
        assertInternal(f);
    });
}

test('auth profile and admin failures use the same internal policy', async () => {
    for (const handler of [createGetProfileHandler({ users: { async listRecentRecords() { throw Error(SECRET); } } }),
        createAdminUserMovementsHandler({ users: { async findByAuth0Id() { throw Error(SECRET); } } })]) {
        const f = fixture();
        f.req.currentUser = { idUsuario: 1, idAuth0: f.req.auth.payload.sub };
        await handler(f.req, f.res);
        assertInternal(f);
    }
});

test('real order service keeps missing order 404 and validation 400', async () => {
    const service = new OrderService({ repo: { async getOrderView() { return null; } } });
    const controller = new OrderController({ service });
    for (const [id,status] of [[1,404], [null,400]]) {
        const f = fixture(); f.req.params.orderId = id;
        await controller.getOrder(f.req, f.res);
        assert.equal(f.res.statusCode, status);
        assert.equal(f.res.body.code, status === 404 ? 'ORDER_NOT_FOUND' : 'VALIDATION_ERROR');
    }
});

for (const status of [400,403,409]) {
    test(`typed business error preserves ${status}`, () => {
        const f = fixture();
        respondError(new AppError(status, 'Mensaje funcional seguro.'), f.req, f.res);
        assert.equal(f.res.statusCode, status);
        assert.equal(f.res.body.message, 'Mensaje funcional seguro.');
        assert.equal(typeof f.res.body.code, 'string');
    });
}

test('untrusted status/message and synthetic Prisma metadata are not public', () => {
    for (const error of [Object.assign(Error(SECRET), { statusCode: 400 }),
        Object.assign(Error(SECRET), { code: 'P2002', meta: { target: ['secret_table'], value: '123456' } }),
        new Auth0ServiceError('unexpected-private-code', SECRET, { details: { access_token: 'secret-token' } }),
        new PinServiceError('PIN_CONFIGURATION_ERROR', SECRET, { status: 500 })]) {
        const f = fixture(); respondError(error, f.req, f.res); assertInternal(f);
    }
});

test('fuente de Notas de Venta indisponible responde 503 identificable', () => {
    const f = fixture();
    respondError(Object.assign(new Error(SECRET), { code: 'SALES_NOTE_SOURCE_UNAVAILABLE' }), f.req, f.res);
    assert.equal(f.res.statusCode, 503);
    assert.equal(f.res.body.code, 'SALES_NOTE_SOURCE_UNAVAILABLE');
    assert.equal(JSON.stringify(f.res.body).includes(SECRET), false);
});

test('existing user repository duplicate constraint maps to a functional conflict', async () => {
    const users = new UserRepository({ prisma: { usuario: { async update() { throw Object.assign(Error(SECRET), { code: 'P2002', meta: { target: ['secret_table'] } }); } } } });
    const f = fixture();
    try { await users.updateByAuth0Id('auth0|test', { correoUsuario: 'test@example.invalid' }); assert.fail('Expected constraint error'); }
    catch (error) { respondError(error, f.req, f.res); }
    assert.equal(f.res.statusCode, 409);
    assert.equal(f.res.body.code, 'USER_ALREADY_EXISTS');
    assert.equal(JSON.stringify([f.res.body,f.logs]).includes('secret_table'), false);
});

test('request IDs are unique, backend-generated and reused for one request', () => {
    const a = fixture(), b = fixture();
    requestContext(a.req, a.res, () => {});
    const id = a.req.requestId;
    a.req.requestId = 'spoofed';
    respondError(Error(SECRET), a.req, a.res);
    respondError(Error(SECRET), b.req, b.res);
    assertInternal(a); assertInternal(b);
    assert.equal(a.res.body.requestId, id);
    assert.notEqual(a.res.body.requestId, b.res.body.requestId);
});

test('H07: controlled PIN error permits only numeric retry and never logs OTP or raw details', () => {
    const f = fixture();
    respondError(new PinServiceError('PIN_LOCKED', '123456 private@example.invalid',
        { status: 423, details: { retryAfterSeconds: 60, code: '123456', recipient: 'private@example.invalid', stack: SECRET } }), f.req, f.res);
    assert.equal(f.res.statusCode, 423);
    assert.deepEqual(f.res.body, { code: 'PIN_LOCKED', message: 'El PIN esta temporalmente bloqueado.', retryAfterSeconds: 60 });
    assert.equal(JSON.stringify(f.logs).includes('123456'), false);
});

async function listen(app,t) {
    const server = app.listen(0);
    t.after(() => server.close());
    await once(server, 'listening');
    return `http://127.0.0.1:${server.address().port}`;
}

test('Express async rejection and parser errors reach the final handler without NODE_ENV', async t => {
    const previous = process.env.NODE_ENV; delete process.env.NODE_ENV;
    t.after(() => { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; });
    const logs=[];
    const app=express(); app.locals.errorLogger={error:(...args)=>logs.push(args)};
    app.use(requestContext); app.use(express.json());
    app.post('/orders/:orderId', async () => { throw Error(SECRET); });
    app.use(errorHandler);
    const base = await listen(app,t);
    const result = await fetch(base+'/orders/private@example.invalid', {method:'POST',headers:{'content-type':'application/json','x-request-id':'forged'}, body:'{}'});
    const body=await result.json();
    assert.equal(result.status,500); assert.match(body.requestId,UUID);
    assert.equal(logs[0][1].requestId,body.requestId);
    assert.equal(logs[0][1].route,'/orders/:orderId');
    const invalid=await fetch(base+'/orders/1',{method:'POST',headers:{'content-type':'application/json'},body:'{"secret-token":'});
    assert.equal(invalid.status,400);
    assert.deepEqual(await invalid.json(),{code:'INVALID_JSON',message:'El cuerpo JSON no es valido.'});
    assert.equal(JSON.stringify(logs).includes('private@example.invalid'),false);
    assert.equal(JSON.stringify(logs).includes('secret-token'),false);
});

test('real Server mounts handler after routes and parses malformed JSON safely', async t => {
    const server = new Server(); server.app.locals.errorLogger={error(){}};
    const base=await listen(server.app,t);
    const response=await fetch(base+'/api/auth/pin-recovery/request',{method:'POST',headers:{'content-type':'application/json'},body:'{"code":"123456",'});
    assert.equal(response.status,400);
    assert.deepEqual(await response.json(),{code:'INVALID_JSON',message:'El cuerpo JSON no es valido.'});
    assert.match(response.headers.get('x-request-id'),UUID);
});

for (const [error,status] of [[new UnauthorizedError(SECRET),401],[new InsufficientScopeError(["read:test"], SECRET),403]]) {
    test(`JWT error keeps ${status} without token/debug details`, () => {
        const f=fixture(); respondError(error,f.req,f.res);
        assert.equal(f.res.statusCode,status);
        assert.equal(JSON.stringify([f.logs,f.res.body]).includes('secret_table'),false);
    });
}

test('already-sent response is closed without passing secrets to Express default logger', () => {
    const f=fixture(); f.res.headersSent=true; let destroyed=false; f.res.destroy=()=>{destroyed=true;};
    respondError(Error(SECRET),f.req,f.res);
    assert.equal(destroyed,true); assert.equal(f.res.body,undefined);
    assert.equal(JSON.stringify(f.logs).includes('secret_table'),false);
});

test('diagnostic code is logged only from a closed allowlist and never exposed publicly', () => {
    for (const [code, expected] of [['P2022', 'P2022'], ['123456-private@example.invalid', undefined]]) {
        const f = fixture();
        respondError(Object.assign(Error(SECRET), { code }), f.req, f.res);
        assertInternal(f);
        assert.equal(f.logs[0][1].internalCode, expected);
        assert.equal(f.res.body.internalCode, undefined);
    }
});
