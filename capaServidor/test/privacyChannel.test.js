import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { once } from 'node:events';
import { readPrivacyChannel, readPrivacyDocuments } from '../src/config/privacyChannel.js';
import PrivacyRequestService, { PrivacyChannelError } from '../src/modules/privacy/service/privacyRequest.service.js';
import PrivacyDeliveryService, { PrivacyDeliveryError } from '../src/modules/privacy/service/privacyDelivery.service.js';
import PrivacyController from '../src/modules/privacy/controller/privacy.controller.js';
import { createPrivacyRouter } from '../src/modules/privacy/routes/privacy.routes.js';
import { MemoryThrottleService } from '../src/modules/security/service/securityThrottle.service.js';
import { errorHandler } from '../src/errors/httpErrors.js';

const env = { PRIVACY_REQUEST_PROVIDER: 'resend', PRIVACY_REQUEST_RECIPIENT: 'area@example.test', PRIVACY_REQUEST_FROM: 'canal@example.test', RESEND_API_KEY: 'test-key', RATE_LIMIT_SECRET: 'technical-test-secret' };
const user = { idUsuario: 42, idAuth0: 'auth0|test-worker', correoUsuario: 'worker@example.test' };
const request = { requestId: '00000000-0000-4000-8000-000000000001', type: 'access', subject: 'Consulta de prueba', description: 'Descripción de prueba.', email: user.correoUsuario };

function fixture({ delivery, finish } = {}) {
    const rows = new Map();
    const deliveries = [];
    const repository = {
        async reserve(data) {
            if (rows.has(data.id)) return { row: { ...rows.get(data.id) }, created: false };
            rows.set(data.id, { ...data });
            return { row: { ...data }, created: true };
        },
        async claimRetry(id) { const row = rows.get(id); if (row.status !== 'failed') return false; row.status = 'sending'; return true; },
        async finish(id, data) { await finish?.(data); Object.assign(rows.get(id), data); return { ...rows.get(id) }; },
    };
    const service = new PrivacyRequestService({ env, repository, delivery: delivery ?? { async send(args) { deliveries.push(args); return 'provider-test-id'; } }, now: () => new Date('2026-10-02T15:00:00Z') });
    return { service, rows, deliveries };
}

test('remite con identidad del backend y conserva solo metadatos', async () => {
    const { service, rows, deliveries } = fixture();
    const result = await service.submit(request, user, user.idAuth0);
    assert.equal(result.status, 'sent');
    assert.equal(result.requestId, request.requestId);
    assert.equal(deliveries[0].request.email, user.correoUsuario);
    assert.equal(deliveries[0].userId, user.idUsuario);
    const row = rows.get(request.requestId);
    assert.equal(row.provider_id, 'provider-test-id');
    assert.equal(row.status, 'sent');
    assert.equal('subject' in row, false);
    assert.equal('description' in row, false);
    assert.equal('email' in row, false);
});

test('repetición y solicitudes concurrentes no duplican remisión', async () => {
    const { service, deliveries } = fixture();
    const result = await Promise.allSettled([service.submit(request, user, user.idAuth0), service.submit(request, user, user.idAuth0)]);
    assert.equal(result.filter(item => item.status === 'fulfilled').length, 1);
    assert.equal(deliveries.length, 1);
    assert.equal((await service.submit(request, user, user.idAuth0)).status, 'sent');
    assert.equal(deliveries.length, 1);
});

test('no reutiliza un identificador para otro contenido ni otro titular', async () => {
    const { service, deliveries } = fixture();
    await service.submit(request, user, user.idAuth0);
    await assert.rejects(service.submit({ ...request, subject: 'Otro asunto' }, user, user.idAuth0), error => error.statusCode === 409);
    await assert.rejects(service.submit(request, { ...user, idUsuario: 43 }, user.idAuth0), error => error.statusCode === 409);
    assert.equal(deliveries.length, 1);
});

for (const [name, body] of [
    ['identidad indicada por frontend', { ...request, userId: 43 }],
    ['destinatario indicado por frontend', { ...request, recipient: 'otra@example.test' }],
    ['otro contacto', { ...request, email: 'otra@example.test' }],
    ['adjuntos no admitidos', { ...request, attachment: 'base64' }],
    ['tipo inválido', { ...request, type: 'delete_everything' }],
    ['asunto vacío', { ...request, subject: ' ' }],
    ['inyección de cabeceras', { ...request, subject: 'Asunto\r\nBcc: otra@example.test' }],
    ['descripción excesiva', { ...request, description: 'a'.repeat(1001) }],
    ['identificador inválido', { ...request, requestId: 'no-uuid' }],
]) test(`rechaza ${name} sin enviar correo`, async () => {
    const { service, deliveries, rows } = fixture();
    await assert.rejects(service.submit(body, user, user.idAuth0), error => error.statusCode === 400);
    assert.equal(deliveries.length, 0);
    assert.equal(rows.size, 0);
});

test('rechaza identidad local distinta de la sesión', async () => {
    const { service } = fixture();
    await assert.rejects(service.submit(request, user, 'auth0|another'), error => error.statusCode === 403);
});

test('fallo explícito permite reintentar con el mismo identificador', async () => {
    let calls = 0;
    const { service, rows } = fixture({ delivery: { async send() { if (++calls === 1) throw new PrivacyDeliveryError('DELIVERY_REJECTED', true); return 'retry-id'; } } });
    await assert.rejects(service.submit(request, user, user.idAuth0), error => error instanceof PrivacyChannelError && error.code === 'PRIVACY_DELIVERY_FAILED');
    assert.equal(rows.get(request.requestId).status, 'failed');
    assert.equal((await service.submit(request, user, user.idAuth0)).status, 'sent');
    assert.equal(calls, 2);
});

test('resultado incierto y fallo al registrar aceptación no confirman éxito ni reenvían', async () => {
    for (const options of [
        { delivery: { async send() { throw new PrivacyDeliveryError('DELIVERY_UNCONFIRMED'); } } },
        { finish: data => { if (data.status === 'sent') throw new Error('persistencia'); } },
    ]) {
        const { service, rows } = fixture(options);
        await assert.rejects(service.submit(request, user, user.idAuth0), error => error.code === 'PRIVACY_REVIEW_DELIVERY');
        assert.notEqual(rows.get(request.requestId).status, 'sent');
        await assert.rejects(service.submit(request, user, user.idAuth0), error => error.statusCode === 409);
    }
});

test('canal deshabilitado no crea evidencia ni envía', async () => {
    const { service, rows } = fixture(); service.env = {};
    await assert.rejects(service.submit(request, user, user.idAuth0), error => error.code === 'PRIVACY_CHANNEL_UNAVAILABLE');
    assert.equal(rows.size, 0);
    assert.equal(readPrivacyChannel({}).enabled, false);
    assert.throws(() => readPrivacyChannel({ ...env, PRIVACY_REQUEST_RECIPIENT: 'a\r\nb@example.test' }));
});

test('documentos ausentes quedan pendientes; solo permite enlaces seguros', () => {
    assert.equal(readPrivacyDocuments({}).every(document => document.url === null), true);
    for (const url of ['javascript:alert(1)', 'http://externo.test/doc', '//externo.test/doc', '/../../secret', '/a%2fsecret', '/bad\\path']) {
        assert.throws(() => readPrivacyDocuments({ PRIVACY_DOCUMENT_NOTICE_URL: url }));
    }
    assert.equal(readPrivacyDocuments({ PRIVACY_DOCUMENT_NOTICE_URL: '/legal/aviso.pdf' })[0].url, '/legal/aviso.pdf');
});

test('adaptador usa texto, contacto verificado e idempotencia sin filtrar errores', async () => {
    let sent;
    const adapter = new PrivacyDeliveryService({ fetchImpl: async (url, options) => { sent = { url, ...options }; return new Response(JSON.stringify({ id: 'test-id' }), { status: 200 }); } });
    assert.equal(await adapter.send({ config: readPrivacyChannel(env), request, userId: 42, receivedAt: new Date('2026-10-02') }), 'test-id');
    const body = JSON.parse(sent.body);
    assert.equal(body.reply_to, user.correoUsuario);
    assert.deepEqual(body.to, [env.PRIVACY_REQUEST_RECIPIENT]);
    assert.equal(body.html, undefined);
    assert.equal(sent.headers['Idempotency-Key'], `privacy-request/${request.requestId}`);
    const failing = new PrivacyDeliveryService({ fetchImpl: async () => { throw new Error('secret@example.test'); } });
    await assert.rejects(failing.send({ config: readPrivacyChannel(env), request, userId: 42, receivedAt: new Date() }), error => !error.message.includes('secret@'));
});

test('rutas: documentos disponibles sin sesión; POST exige autenticación y cuotas', async t => {
    const { service, deliveries } = fixture();
    const app = express(); app.locals.errorLogger = { error() {} };
    app.use(express.json());
    const authenticate = (req, res, next) => {
        if (req.get('Authorization') !== 'Bearer test') return res.sendStatus(401);
        req.auth = { payload: { sub: user.idAuth0 } }; req.currentUser = user; next();
    };
    app.use('/api/privacy', createPrivacyRouter({ authenticate, controller: new PrivacyController({ service }), throttle: new MemoryThrottleService({ secret: 'test-secret' }) }));
    app.use(errorHandler);
    const server = app.listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => new Promise(resolve => server.close(resolve)));
    const base = `http://127.0.0.1:${server.address().port}/api/privacy`;
    const documents = await fetch(`${base}/documents`);
    assert.equal(documents.status, 200);
    assert.equal((await documents.json()).documents.length, 4);
    assert.equal((await fetch(`${base}/requests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) })).status, 401);
    for (let index = 0; index < 6; index++) {
        const result = await fetch(`${base}/requests`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' }, body: JSON.stringify(request) });
        assert.equal(result.status, index === 5 ? 429 : 200);
    }
    assert.equal(deliveries.length, 1);
});
