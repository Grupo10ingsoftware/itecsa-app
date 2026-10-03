import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { once } from 'node:events';
import { INCIDENT_MODULES, observationToUtc, validObservation } from '../../shared/incidentReports.js';
import { readIncidentChannel } from '../src/config/incidentChannel.js';
import IncidentReportService from '../src/modules/security/service/incidentReport.service.js';
import IncidentDeliveryService from '../src/modules/security/service/incidentDelivery.service.js';
import IncidentReportRepo from '../src/modules/security/repo/incidentReport.repo.js';
import SecurityAuditRepository from '../src/modules/security/repo/securityAudit.repo.js';
import IncidentReportController from '../src/modules/security/controller/incidentReport.controller.js';
import { createIncidentReportRouter } from '../src/modules/security/routes/incidentReport.routes.js';
import { TextDeliveryError } from '../src/shared/resendTextDelivery.js';
import { MemoryThrottleService } from '../src/modules/security/service/securityThrottle.service.js';
import { errorHandler } from '../src/errors/httpErrors.js';

const env = { SECURITY_INCIDENT_PROVIDER: 'resend', SECURITY_INCIDENT_RECIPIENT: 'responsable@example.test', SECURITY_INCIDENT_FROM: 'canal@example.test', RESEND_API_KEY: 'test-key', RATE_LIMIT_SECRET: 'test-digest-secret' };
const user = { idUsuario: 42, idAuth0: 'auth0|worker', correoUsuario: 'worker@example.test' };
const report = { reportId: '00000000-0000-4000-8000-000000000001', description: 'Observé una pantalla inusual.', observedAt: '2026-10-01T15:00:00.000Z', module: 'kanban', technicalReference: 'requestId de prueba' };
const currentTime = new Date('2026-10-02T15:00:00Z');
function fixture({ delivery, finish, reserve, events = [] } = {}) {
    const deliveries = [], logs = [];
    const database = { securityAuditEvent: {
        async create({ data }) {
            if (data.event_key && events.some(event => event.event_key === data.event_key)) {
                const error = new Error('Duplicate event'); error.code = 'P2002'; throw error;
            }
            const event = structuredClone({ ...data, id_security_audit_event: BigInt(events.length + 1) });
            events.push(event); return structuredClone(event);
        },
        async findMany({ where }) {
            return events.filter(event => event.request_id === where.request_id && event.resource_id === where.resource_id &&
                event.resource_type === where.resource_type && where.event_type.in.includes(event.event_type)).map(event => structuredClone(event));
        },
    } };
    const repository = new IncidentReportRepo({ database: () => database });
    const reserveEvent = repository.reserve.bind(repository), finishEvent = repository.finish.bind(repository);
    repository.reserve = async data => { await reserve?.(data); return reserveEvent(data); };
    repository.finish = async (id, attempt, data) => { await finish?.(data); return finishEvent(id, attempt, data); };
    const service = new IncidentReportService({ env, repository, delivery: delivery ?? { async send(args) { deliveries.push(args); return 'test-provider-id'; } }, now: () => currentTime, logger: { info(event, fields) { logs.push({ event, ...fields }); } } });
    return { service, deliveries, logs, events, repository, database };
}
test('identidad del backend, fechas distintas, evidencia mínima y logs sin contenido', async () => {
    const { service, repository, events, deliveries, logs } = fixture();
    const result = await service.submit(report, user, user.idAuth0);
    assert.equal(result.status, 'sent');
    assert.equal(result.observedAt, report.observedAt);
    assert.equal(result.receivedAt, currentTime.toISOString());
    assert.equal(deliveries[0].report.email, user.correoUsuario);
    assert.equal(deliveries[0].userId, user.idUsuario);
    const row = await repository.read(report.reportId);
    for (const field of ['description', 'email', 'technicalReference', 'severity', 'resolution']) assert.equal(field in row, false);
    assert.equal(row.payload_digest.length, 64);
    assert.equal(row.status, 'sent');
    assert.equal(events.length, 2);
    assert.equal(JSON.stringify(logs).includes(report.description), false);
    assert.equal(JSON.stringify(logs).includes(user.correoUsuario), false);
    assert.equal(logs[0].resourceId, report.reportId);
});
test('metadatos autenticados solo muestran disponibilidad y contacto propio', () => {
    const { service } = fixture();
    assert.deepEqual(service.configuration(user), { reportsEnabled: true, contactEmail: user.correoUsuario });
    service.env = {}; assert.equal(service.configuration(user).reportsEnabled, false);
    service.env = { ...env, SECURITY_INCIDENT_RECIPIENT: 'invalid' }; assert.equal(service.configuration(user).reportsEnabled, false);
});
for (const [name, body] of [
    ['otro usuario', { ...report, userId: 43 }], ['rol', { ...report, role: 'Soporte' }],
    ['correo indicado por cliente', { ...report, email: user.correoUsuario }], ['destinatario', { ...report, recipient: 'otra@example.test' }],
    ['adjunto', { ...report, attachment: 'base64' }], ['severidad jurídica', { ...report, severity: 'critical' }],
    ['descripción vacía', { ...report, description: '' }], ['descripción corta', { ...report, description: '  breve ' }],
    ['descripción extensa', { ...report, description: 'a'.repeat(1001) }], ['controles', { ...report, description: 'Texto válido\u0000' }],
    ['módulo inexistente', { ...report, module: 'delete-users' }], ['fecha vacía', { ...report, observedAt: '' }],
    ['fecha sin zona', { ...report, observedAt: '2026-10-01T10:00' }], ['fecha normalizada inválida', { ...report, observedAt: '2026-02-30T15:00:00.000Z' }],
    ['fecha futura', { ...report, observedAt: '2026-10-03T15:00:00.000Z' }], ['fecha fuera de rango', { ...report, observedAt: '0000-01-01T00:00:00.000Z' }],
    ['referencia extensa', { ...report, technicalReference: 'a'.repeat(301) }], ['referencia multilinea', { ...report, technicalReference: 'ID\r\nBcc: otra@example.test' }],
    ['UUID inválido', { ...report, reportId: 'not-uuid' }], ['cuerpo nulo', null], ['cuerpo lista', []],
]) test(`rechaza ${name} antes de persistir/remitir`, async () => {
    const { service, events, deliveries } = fixture();
    await assert.rejects(service.submit(body, user, user.idAuth0), error => error.statusCode === 400);
    assert.equal(events.length, 0); assert.equal(deliveries.length, 0);
});
test('referencia opcional y todos los módulos reales son admitidos', async () => {
    for (const module of INCIDENT_MODULES) {
        const { service, deliveries } = fixture();
        const body = { ...report, module: module.value }; delete body.technicalReference;
        await service.submit(body, user, user.idAuth0);
        assert.equal(deliveries[0].report.technicalReference, '');
    }
});
test('fecha local valida calendario y conversión; UTC valida tolerancia técnica', () => {
    assert.equal(observationToUtc('2026-02-30T12:00'), null);
    assert.equal(observationToUtc('2026-01-01'), null);
    assert.equal(observationToUtc('2026-10-01T12:30'), new Date('2026-10-01T12:30').toISOString());
    assert.equal(validObservation('2026-10-02T15:05:00.000Z', currentTime), true);
    assert.equal(validObservation('2026-10-02T15:05:00.001Z', currentTime), false);
});
test('identidad local debe corresponder al JWT y tener correo válido', async () => {
    const { service } = fixture();
    await assert.rejects(service.submit(report, user, 'auth0|other'), error => error.statusCode === 403);
    await assert.rejects(service.submit(report, { ...user, correoUsuario: 'invalid' }, user.idAuth0), error => error.statusCode === 400);
});
test('doble envío concurrente y repetición tras reinicio no duplican correo', async () => {
    const { service, deliveries, events } = fixture();
    const results = await Promise.allSettled([service.submit(report, user, user.idAuth0), service.submit(report, user, user.idAuth0)]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(deliveries.length, 1);
    const restarted = fixture({ events });
    assert.equal((await restarted.service.submit(report, user, user.idAuth0)).status, 'sent');
    assert.equal(restarted.deliveries.length, 0);
});
test('no permite reutilizar UUID con otro contenido o reportante', async () => {
    const { service } = fixture(); await service.submit(report, user, user.idAuth0);
    await assert.rejects(service.submit({ ...report, description: 'Otro contenido de reporte.' }, user, user.idAuth0), error => error.statusCode === 409);
    await assert.rejects(service.submit(report, { ...user, idUsuario: 43 }, user.idAuth0), error => error.statusCode === 409);
});
test('rechazo explícito permite reintento; destinatario nuevo/23 horas no reenvían', async () => {
    let calls = 0;
    const { service, repository } = fixture({ delivery: { async send() { if (++calls === 1) throw new TextDeliveryError('DELIVERY_REJECTED', true); return 'retry-id'; } } });
    await assert.rejects(service.submit(report, user, user.idAuth0), error => error.code === 'INCIDENT_DELIVERY_FAILED');
    service.env = { ...env, SECURITY_INCIDENT_RECIPIENT: 'nuevo@example.test' };
    await assert.rejects(service.submit(report, user, user.idAuth0), error => error.code === 'INCIDENT_REVIEW_DELIVERY');
    service.env = env;
    assert.equal((await service.submit(report, user, user.idAuth0)).status, 'sent');
    assert.equal(calls, 2);
    assert.equal((await repository.read(report.reportId)).attempt, 1);
    const expired = fixture({ delivery: { async send() { throw new TextDeliveryError('DELIVERY_REJECTED', true); } } });
    await assert.rejects(expired.service.submit(report, user, user.idAuth0), error => error.code === 'INCIDENT_DELIVERY_FAILED');
    expired.service.now = () => new Date(+currentTime + 23 * 60 * 60_000);
    await assert.rejects(expired.service.submit(report, user, user.idAuth0), error => error.code === 'INCIDENT_REVIEW_DELIVERY');
    assert.equal(expired.events.length, 2);
    assert.equal(calls, 2);
});
test('resultados inciertos/fallo de persistencia nunca confirman ni reenvían', async () => {
    for (const options of [
        { delivery: { async send() { throw new TextDeliveryError('DELIVERY_UNCONFIRMED'); } } },
        { finish: data => { if (data.status === 'sent') throw new Error('secret persistence error'); } },
        { delivery: { async send() { throw new TextDeliveryError('DELIVERY_REJECTED', true); } }, finish() { throw new Error('secret'); } },
    ]) {
        const { service, repository } = fixture(options);
        await assert.rejects(service.submit(report, user, user.idAuth0), error => error.code === 'INCIDENT_REVIEW_DELIVERY' && error.reference === report.reportId && !error.message.includes('secret'));
        assert.notEqual((await repository.read(report.reportId)).status, 'sent');
        await assert.rejects(service.submit(report, user, user.idAuth0), error => error.code === 'INCIDENT_REVIEW_DELIVERY');
    }
});
test('sin persistencia no remite y sin configuración no crea registro', async () => {
    const failure = fixture({ reserve() { throw new Error('database'); } });
    await assert.rejects(failure.service.submit(report, user, user.idAuth0)); assert.equal(failure.deliveries.length, 0);
    const disabled = fixture(); disabled.service.env = {};
    await assert.rejects(disabled.service.submit(report, user, user.idAuth0), error => error.code === 'INCIDENT_CHANNEL_UNAVAILABLE');
    assert.equal(disabled.events.length, 0);
    assert.equal(readIncidentChannel({}).enabled, false);
    assert.throws(() => readIncidentChannel({ ...env, SECURITY_INCIDENT_RECIPIENT: 'a\r\nb@example.test' }));
    assert.throws(() => readIncidentChannel({ ...env, SECURITY_INCIDENT_PROVIDER: 'console' }));
});
test('correo de texto con fechas, módulo, contacto y namespace propio sin evaluar sospecha', async () => {
    let sent;
    const adapter = new IncidentDeliveryService({ fetchImpl: async (url, options) => { sent = { url, ...options }; return new Response(JSON.stringify({ id: 'mail-id' }), { status: 200 }); } });
    await adapter.send({ config: readIncidentChannel(env), report: { ...report, email: user.correoUsuario }, userId: user.idUsuario, receivedAt: currentTime });
    const body = JSON.parse(sent.body);
    assert.equal(body.html, undefined); assert.equal(body.reply_to, user.correoUsuario);
    assert.deepEqual(body.to, [env.SECURITY_INCIDENT_RECIPIENT]);
    assert.ok(body.text.includes(report.observedAt)); assert.ok(body.text.includes('Principal/Kanban'));
    assert.equal(sent.headers['Idempotency-Key'], `incident-report/${report.reportId}`);
});
test('transportes distinguen rechazo de incertidumbre y nunca filtran respuesta proveedor', async () => {
    for (const status of [400, 401, 403, 422, 429, 409, 500]) {
        const adapter = new IncidentDeliveryService({ fetchImpl: async () => new Response('secret body', { status }) });
        await assert.rejects(adapter.send({ config: readIncidentChannel(env), report: { ...report, email: user.correoUsuario }, userId: 42, receivedAt: currentTime }), error => error instanceof TextDeliveryError && error.retryable === [400, 401, 403, 422, 429].includes(status) && !error.message.includes('secret'));
    }
});
test('auditoría existente permanece intacta y la evidencia excluye contenido y correo personal', async () => {
    const { service, database, events } = fixture();
    const audit = new SecurityAuditRepository({ prisma: database });
    await audit.record({ eventType: 'support.resource', actorUserId: user.idUsuario, resourceType: 'orders',
        resourceId: report.reportId, requestId: report.reportId, outcome: 'success', metadata: { description: 'should not persist' } });
    const historic = structuredClone(events[0]);
    await service.submit(report, user, user.idAuth0);
    assert.deepEqual(events[0], historic);
    assert.equal(events[0].metadata, undefined);
    assert.equal(events[0].event_key, undefined);
    assert.deepEqual(events.slice(1).map(event => [event.event_type, event.outcome]), [
        ['incident_report.attempt', 'sending'], ['incident_report.delivery', 'sent'],
    ]);
    for (const event of events.slice(1)) {
        for (const field of ['description', 'email', 'technicalReference', 'severity', 'resolution']) assert.equal(field in event.metadata, false);
    }
    assert.equal(events[1].metadata.payloadDigest.length, 64);
    assert.equal(events[2].metadata.providerId, 'test-provider-id');
    await audit.record({ eventType: 'incident_report.delivery', eventKey: 'allowlist-test', outcome: 'sent',
        metadata: { description: report.description, email: user.correoUsuario, technicalReference: report.technicalReference, attempt: 0 } });
    assert.deepEqual(events.at(-1).metadata, { attempt: 0 });
});
test('reintentos concurrentes se serializan en auditoría sin modificar intentos anteriores', async () => {
    let calls = 0;
    const { service, repository, events } = fixture({ delivery: { async send() {
        if (++calls === 1) throw new TextDeliveryError('DELIVERY_REJECTED', true);
        return 'retry-id';
    } } });
    await assert.rejects(service.submit(report, user, user.idAuth0), error => error.code === 'INCIDENT_DELIVERY_FAILED');
    const firstAttempt = structuredClone(events);
    const results = await Promise.allSettled([service.submit(report, user, user.idAuth0), service.submit(report, user, user.idAuth0)]);
    assert.ok(results.some(result => result.status === 'fulfilled'));
    assert.equal(calls, 2);
    assert.deepEqual(events.slice(0, 2), firstAttempt);
    assert.deepEqual(events.map(event => [event.metadata.attempt, event.outcome]), [[0, 'sending'], [0, 'failed'], [1, 'sending'], [1, 'sent']]);
    assert.equal(new Set(events.map(event => event.event_key)).size, 4);
    assert.equal((await repository.read(report.reportId)).status, 'sent');
    assert.equal(await repository.claimRetry(report.reportId, 0), null);
    await assert.rejects(repository.finish(report.reportId, 0, { status: 'sent' }));
    const restarted = fixture({ events });
    await restarted.service.submit(report, user, user.idAuth0);
    assert.equal(restarted.deliveries.length, 0);
});
test('HTTP exige sesión en config/POST, rechaza suplantación y respeta cuotas', async t => {
    const { service, deliveries } = fixture();
    const app = express(); app.locals.errorLogger = { error() {} }; app.use(express.json());
    const authenticate = (req, res, next) => { if (req.get('Authorization') !== 'Bearer test') return res.sendStatus(401); req.auth = { payload: { sub: user.idAuth0 } }; req.currentUser = user; next(); };
    app.use('/api/security/incident-reports', createIncidentReportRouter({ authenticate, controller: new IncidentReportController({ service }), throttle: new MemoryThrottleService({ secret: 'test-secret' }) })); app.use(errorHandler);
    const server = app.listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => new Promise(resolve => server.close(resolve)));
    const base = `http://127.0.0.1:${server.address().port}/api/security/incident-reports`;
    assert.equal((await fetch(`${base}/config`)).status, 401);
    assert.equal((await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(report) })).status, 401);
    const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer test' };
    const config = await fetch(`${base}/config`, { headers }); assert.equal(config.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual(await config.json(), service.configuration(user));
    assert.equal((await fetch(base, { method: 'POST', headers, body: JSON.stringify({ ...report, userId: 43 }) })).status, 400);
    for (let index = 0; index < 5; index++) assert.equal((await fetch(base, { method: 'POST', headers, body: JSON.stringify(report) })).status, index === 4 ? 429 : 200);
    assert.equal(deliveries.length, 1);
});
