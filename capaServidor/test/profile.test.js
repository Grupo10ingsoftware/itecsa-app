import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UserRepository } from '../src/modules/users/repo/users.repo.js';
import { createGetProfileHandler, createGetProfileMovementsHandler } from '../src/modules/auth/controller/auth.controller.js';
import { createAuthRouter } from '../src/modules/auth/routes/auth.routes.js';
import express from 'express';
import { once } from 'node:events';
import { payloadFor } from './authorization.fixture.js';

const user = { idUsuario: 7, idAuth0: 'auth0|self', nombreUsuario: 'Francisco', apellidoUsuario: 'Tassara', correoUsuario: 'user@example.cl', rolUsuario: 'Operario Ventas' };
function response() {
    return { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}
test('perfil usa la identidad validada e ignora identificadores enviados por el cliente', async () => {
    const res = response();
    await createGetProfileHandler({ users: { async listRecentRecords(id) {
        assert.equal(id, 7);
        return [{ id: 23, dateTime: '2026-09-07T12:00:00Z' }];
    } } })({ currentUser: user, auth: { payload: { sub: user.idAuth0 } }, query: { idUsuario: 99 } }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.primerNombre, 'Francisco');
    assert.equal(res.body.apellidoPaterno, 'Tassara');
    assert.equal(res.body.records[0].id, 23);
});
test('perfil rechaza identidad ausente o inconsistente sin consultar registros', async () => {
    const handler = createGetProfileHandler({ users: { listRecentRecords() { assert.fail('No debe consultar'); } } });
    for (const req of [{}, { currentUser: user, auth: { payload: { sub: 'other' } } }]) {
        const res = response();
        await handler(req, res);
        assert.equal(res.code, 401);
    }
});
test('perfil informa fallo de carga sin inventar registros', async () => {
    const res = response();
    await createGetProfileHandler({ users: { async listRecentRecords() { throw new Error('offline'); } } })({ currentUser: user, auth: { payload: { sub: user.idAuth0 } } }, res);
    assert.equal(res.code, 500);
    assert.equal(res.body.code, 'INTERNAL_ERROR');
    assert.match(res.body.requestId, /^[0-9a-f-]{36}$/);
});
test('repositorio filtra por usuario y limita a diez registros ordenados por fecha e identificador descendente', async () => {
    const repository = new UserRepository({ prisma: { registros: { async findMany(query) {
        assert.deepEqual(query.where, { id_usuario: 7 });
        assert.deepEqual(query.orderBy, [{ FECHA_HORA: 'desc' }, { ID_REGISTRO: 'desc' }]);
        assert.equal(query.take, 10);
        return [{ ID_REGISTRO: 23, FECHA_HORA: '2026-09-07T12:00:00Z' }];
    } } } });
    assert.deepEqual(await repository.listRecentRecords(7), [{ id: 23, dateTime: '2026-09-07T12:00:00Z', detail: 'Actividad del pedido' }]);
    await assert.rejects(() => repository.listRecentRecords(undefined));
});

test('perfil describe el estado histórico de pago, etapas, subprocesos y observaciones', async () => {
    const records = [
        { Registro_Pago: { Estado_Pago_Registro_Pago_id_estado_pago_nuevoToEstado_Pago: { nombre_estado_pago: 'Confirmado' } } },
        { Registro_Etapas: { Estado_Pedido: { nombre_etapa: 'Producción' } } },
        { registro_subprocesos: { Estado_Subprocesos: { nombre_estado: 'Impresión' } } },
        { observacion: 'Se agregó una observación.' },
        { Registro_Pago: {} },
    ];
    const repository = new UserRepository({ prisma: { registros: { async findMany() { return records; } } } });
    assert.deepEqual((await repository.listRecentRecords(7)).map((record) => record.detail), [
        'Estado de pago: Confirmado', 'Etapa del pedido: Producción', 'Subproceso: Impresión',
        'Se agregó una observación.', 'Estado de pago: No informado',
    ]);
});

test('historial propio usa solo la identidad de sesión y valida paginación/búsqueda antes de consultar', async () => {
    const queries = [];
    const handler = createGetProfileMovementsHandler({ users: { async listMovements(id, query) {
        assert.equal(id, 7); queries.push(query); return { records: [], total: 0, ...query };
    } } });
    const req = { currentUser: user, auth: { payload: { sub: user.idAuth0 } }, query: { page: '2', perPage: '20', search: ' Confirmado ', userId: 'other', idUsuario: '99' } };
    const res = response(); await handler(req, res);
    assert.equal(res.code, 200); assert.deepEqual(queries, [{ page: 2, perPage: 20, search: 'Confirmado' }]);
    for (const query of [{ page: '0' }, { perPage: '51' }, { search: ['bad'] }, { search: 'x'.repeat(121) }]) {
        const invalid = response(); await handler({ ...req, query }, invalid); assert.equal(invalid.code, 400);
    }
    assert.equal(queries.length, 1);
    for (const invalid of [{}, { currentUser: user }, { ...req, auth: { payload: { sub: 'other' } } }]) {
        const denied = response(); await handler(invalid, denied); assert.equal(denied.code, 401);
    }
});

test('historial propio requiere JWT y read:own-profile, sin exigir permiso administrativo', async t => {
    let reads = 0;
    const app = express();
    app.use('/auth', createAuthRouter({
        authenticate(req, res, next) {
            if (!req.headers['x-auth']) return res.sendStatus(401);
            req.currentUser = user;
            req.auth = { payload: payloadFor(user.rolUsuario, { sub: user.idAuth0,
                permissions: req.headers['x-permit'] ? ['read:own-profile'] : [] }) }; next();
        }, users: { async listMovements(id) { assert.equal(id, 7); reads++; return { records: [], total: 0, page: 1, perPage: 10 }; } },
    }));
    const server = app.listen(0); t.after(() => server.close()); await once(server, 'listening');
    const url = `http://127.0.0.1:${server.address().port}/auth/profile/movements`;
    assert.equal((await fetch(url)).status, 401);
    assert.equal((await fetch(url, { headers: { 'x-auth': '1' } })).status, 403);
    assert.equal(reads, 0);
    assert.equal((await fetch(url, { headers: { 'x-auth': '1', 'x-permit': '1' } })).status, 200);
    assert.equal(reads, 1);
});

test('búsqueda y conteo del historial mantienen el filtro del titular y el orden estable', async () => {
    const where = [];
    const repo = new UserRepository({ prisma: { registros: {
        async findMany(query) { where.push(query.where); assert.equal(query.take, 20); assert.equal(query.skip, 20); return []; },
        async count(query) { where.push(query.where); return 45; },
    } } });
    const result = await repo.listMovements(7, { page: 2, perPage: 20, search: 'Estado de pago: Confirmado' });
    assert.equal(result.total, 45); assert.deepEqual(where[0], where[1]); assert.equal(where[0].id_usuario, 7);
    assert.ok(JSON.stringify(where[0]).includes('Confirmado'));
    assert.deepEqual(repo.buildRecordsWhere(7, { search: '425' }).OR[0], { ID_REGISTRO: 425 });
});
