import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAdminUserMovementsHandler } from '../src/modules/users/controller/adminUsers.controller.js';
import { UserRepository } from '../src/modules/users/repo/users.repo.js';
import { payloadFor } from './authorization.fixture.js';
import { ROLES } from '../../shared/authorization.js';

function response() {
    return { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}
function request(query = {}) {
    return { params: { userId: 'auth0|target' }, query, auth: { payload: payloadFor(ROLES.ADMINISTRADOR) } };
}
test('movements returns records and empty history for users in the department', async () => {
    for (const records of [[], [{ id: 1, detail: 'Etapa del pedido: Producción' }]]) {
        const res = response();
        await createAdminUserMovementsHandler({ users: {
            async findByAuth0Id(id) {
                assert.equal(id, 'auth0|target');
                return { idUsuario: 8, rolUsuario: ROLES.PRODUCCION };
            },
            async listMovements(id, pagination) {
                assert.equal(id, 8);
                assert.deepEqual(pagination, { page: 2, perPage: 10 });
                return { records, total: records.length, ...pagination };
            },
        } })(request({ page: '2' }), res);
        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body.records, records);
    }
});
test('movements denies another department and handles missing users without querying records', async () => {
    for (const [target, status] of [[{ rolUsuario: ROLES.VENTAS }, 403], [null, 404]]) {
        const res = response();
        await createAdminUserMovementsHandler({ users: {
            async findByAuth0Id() { return target; },
            async listMovements() { assert.fail('Must not query records'); },
        } })(request(), res);
        assert.equal(res.statusCode, status);
    }
});
test('movements validates pagination and reports database errors', async () => {
    const handler = createAdminUserMovementsHandler({ users: {
        async findByAuth0Id() { throw new Error('database unavailable'); },
    } });
    const invalid = response();
    await handler(request({ page: '0' }), invalid);
    assert.equal(invalid.statusCode, 400);
    const failed = response();
    await handler(request(), failed);
    assert.equal(failed.statusCode, 500);
    assert.equal(failed.body.message, 'No fue posible consultar los movimientos del usuario.');
});
test('movement repository filters by user, sorts and paginates while preserving profile defaults', async () => {
    const calls = [];
    const repo = new UserRepository({ prisma: { registros: {
        async findMany(query) {
            calls.push(query);
            return [{ ID_REGISTRO: 2, FECHA_HORA: '2026-09-11T12:00:00Z', observacion: 'Fecha actualizada' }];
        },
        async count(query) {
            assert.deepEqual(query, { where: { id_usuario: 8 } });
            return 23;
        },
    } } });
    const result = await repo.listMovements(8, { page: 2, perPage: 10 });
    assert.equal(result.total, 23);
    assert.equal(result.records[0].detail, 'Fecha actualizada');
    assert.deepEqual(calls[0].where, { id_usuario: 8 });
    assert.deepEqual(calls[0].orderBy, [{ FECHA_HORA: 'desc' }, { ID_REGISTRO: 'desc' }]);
    assert.equal(calls[0].skip, 10);
    assert.equal(calls[0].take, 10);
    await repo.listRecentRecords(8);
    assert.equal(calls[1].skip, 0);
    assert.equal(calls[1].take, 10);
});
