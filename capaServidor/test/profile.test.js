import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UserRepository } from '../src/modules/users/repo/users.repo.js';
import { createGetProfileHandler } from '../src/modules/auth/controller/auth.controller.js';

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
    assert.equal(res.code, 503);
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
