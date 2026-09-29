import assert from "node:assert/strict";
import { test } from "node:test";
import {
    USER_RESPONSE_SELECT,
    UserRepository,
} from "../src/modules/users/repo/users.repo.js";

const DATABASE_USER = {
    id_usuario: 7,
    id_auth0: "auth0|user-id",
    correo_usuario: "usuario@example.cl",
    rut_usuario: "12.345.678-9",
    nombre_usuario: "Dana",
    apellido_usuario: "Gadansky",
    rol_usuario: "Administrador Produccion",
    estado_usuario: "Activo",
};

test('updateRoleIfCurrent condiciona el cambio al rol y estado previos', async () => {
    let where;
    const repository = new UserRepository({ prisma: { usuario: {
        async updateMany(payload) { where = payload; return { count: 1 }; },
        async findUnique() { return { ...DATABASE_USER, rol_usuario: 'Administrador Ventas' }; },
    } } });
    const user = await repository.updateRoleIfCurrent('auth0|user-id', 'Operario Ventas', 'Administrador Ventas');
    assert.deepEqual(where, {
        where: {
            id_auth0: 'auth0|user-id',
            rol_usuario: 'Operario Ventas',
            estado_usuario: { in: ['Activo', 'Vinculado'] },
        },
        data: { rol_usuario: 'Administrador Ventas' },
    });
    assert.equal(user.rolUsuario, 'Administrador Ventas');
});

test('transicion de rol usa compare-and-set y solo reactiva desde pendiente', async () => {
    const updates = [];
    const repository = new UserRepository({ prisma: { usuario: {
        async updateMany(payload) { updates.push(payload); return { count: 1 }; },
        async findUnique() {
            return {
                ...DATABASE_USER,
                rol_usuario: 'Gerencia',
                estado_usuario: 'Activo',
            };
        },
    } } });

    await repository.beginRoleTransition('auth0|user-id', 'Operario Ventas');
    const user = await repository.completeRoleTransition(
        'auth0|user-id',
        'Operario Ventas',
        {
            nombreUsuario: 'Dana',
            apellidoUsuario: 'Gadansky',
            correoUsuario: 'NUEVO@EXAMPLE.CL',
            rolUsuario: 'Gerencia',
        },
    );

    assert.deepEqual(updates, [
        {
            where: {
                id_auth0: 'auth0|user-id',
                rol_usuario: 'Operario Ventas',
                estado_usuario: { in: ['Activo', 'Vinculado'] },
            },
            data: { estado_usuario: 'Pendiente rol' },
        },
        {
            where: {
                id_auth0: 'auth0|user-id',
                rol_usuario: 'Operario Ventas',
                estado_usuario: 'Pendiente rol',
            },
            data: {
                correo_usuario: 'nuevo@example.cl',
                nombre_usuario: 'Dana',
                apellido_usuario: 'Gadansky',
                rol_usuario: 'Gerencia',
                estado_usuario: 'Activo',
            },
        },
    ]);
    assert.equal(user.rolUsuario, 'Gerencia');
});

test('transicion de rol rechaza cambios concurrentes', async () => {
    const repository = new UserRepository({ prisma: { usuario: {
        async updateMany() { return { count: 0 }; },
    } } });

    await assert.rejects(
        repository.beginRoleTransition('auth0|user-id', 'Operario Ventas'),
        { code: 'USER_CONCURRENT_UPDATE' },
    );
});

test('cancelar transicion solo reactiva el rol original pendiente', async () => {
    let update;
    const repository = new UserRepository({ prisma: { usuario: {
        async updateMany(payload) { update = payload; return { count: 1 }; },
    } } });

    await repository.cancelRoleTransition('auth0|user-id', 'Operario Ventas');
    assert.deepEqual(update, {
        where: {
            id_auth0: 'auth0|user-id',
            rol_usuario: 'Operario Ventas',
            estado_usuario: 'Pendiente rol',
        },
        data: { estado_usuario: 'Activo' },
    });
});

test('cambio de estado usa compare-and-set', async () => {
    let update;
    const repository = new UserRepository({ prisma: { usuario: {
        async updateMany(payload) { update = payload; return { count: 1 }; },
        async findUnique() {
            return { ...DATABASE_USER, estado_usuario: 'Desvinculado' };
        },
    } } });

    const user = await repository.updateStatusIfCurrent(
        'auth0|user-id',
        'Activo',
        'Desvinculado',
    );
    assert.deepEqual(update, {
        where: { id_auth0: 'auth0|user-id', estado_usuario: 'Activo' },
        data: { estado_usuario: 'Desvinculado' },
    });
    assert.equal(user.estadoUsuario, 'Desvinculado');
});

test('consultas administrativas proyectan identidad sin material PIN', async () => {
    const calls = [];
    const repository = new UserRepository({ prisma: { usuario: {
        async findUnique(query) { calls.push(['findUnique', query]); return DATABASE_USER; },
        async findMany(query) { calls.push(['findMany', query]); return [DATABASE_USER]; },
        async count() { return 1; },
    } } });

    await repository.findByAuth0Id(DATABASE_USER.id_auth0);
    await repository.findByEmail(DATABASE_USER.correo_usuario);
    await repository.list();

    for (const [, query] of calls) {
        assert.deepEqual(query.select, USER_RESPONSE_SELECT);
        assert.equal('pin_hash' in query.select, false);
        assert.equal('pin_salt' in query.select, false);
        assert.equal('pin_pending_ciphertext' in query.select, false);
    }
});

test('filtros de estado distinguen activos, pendientes y desvinculados', () => {
    const repository = new UserRepository({ prisma: {} });

    assert.deepEqual(repository.buildListWhere({ estadoUsuario: 'Vinculado' }), {
        estado_usuario: { in: ['Activo', 'Vinculado'] },
    });
    assert.deepEqual(repository.buildListWhere({ estadoUsuario: 'Pendiente rol' }), {
        estado_usuario: 'Pendiente rol',
    });
    assert.deepEqual(repository.buildListWhere({ estadoUsuario: 'Desvinculado' }), {
        estado_usuario: 'Desvinculado',
    });
});

test('summary explicita estados visibles en una consulta', async () => {
    let receivedQuery;
    const repository = new UserRepository({ prisma: { usuario: {
        async groupBy(query) {
            receivedQuery = query;
            return [
                { estado_usuario: 'Activo', _count: { _all: 3 } },
                { estado_usuario: 'Vinculado', _count: { _all: 2 } },
                { estado_usuario: 'Desvinculado', _count: { _all: 1 } },
                { estado_usuario: 'Pendiente rol', _count: { _all: 4 } },
                { estado_usuario: 'Estado inesperado', _count: { _all: 1 } },
                { estado_usuario: null, _count: { _all: 1 } },
            ];
        },
    } } });

    const summary = await repository.getSummary({ allowedRoles: ['Operario Ventas'] });

    assert.deepEqual(receivedQuery, {
        by: ['estado_usuario'],
        where: { rol_usuario: { in: ['Operario Ventas'] } },
        _count: { _all: true },
    });
    assert.deepEqual(summary, {
        totalUsuarios: 12,
        vinculados: 5,
        desvinculados: 1,
        pendientes: 4,
    });
});
