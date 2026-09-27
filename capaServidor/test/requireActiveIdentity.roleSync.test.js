import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequireActiveIdentity } from '../src/middlewares/requireActiveIdentity.js';
import { ROLES, ROLES_CLAIM } from '../../shared/authorization.js';

const OLD_ROLE = ROLES.VENTAS;
const NEW_ROLE = ROLES.ADMIN_VENTAS;

function createFixture({ tokenRole = NEW_ROLE, storedRole = OLD_ROLE, status = 'Activo', auth0Role = NEW_ROLE, auth0Error, afterUpdate } = {}) {
  let user = { idAuth0: 'auth0|user', rolUsuario: storedRole, estadoUsuario: status };
  const calls = { resolve: 0, update: 0 };
  const repository = {
    async findByAuth0Id() { return user; },
    async updateRoleIfCurrent(_userId, currentRole, nextRole) {
      calls.update += 1;
      if (user.rolUsuario === currentRole && user.estadoUsuario === 'Activo') {
        user = { ...user, rolUsuario: nextRole };
      }
      if (afterUpdate) user = afterUpdate(user);
      return user;
    },
  };
  const middleware = createRequireActiveIdentity({
    repository,
    async resolveAuth0Role() {
      calls.resolve += 1;
      if (auth0Error) throw auth0Error;
      return auth0Role;
    },
  });
  async function request(role = tokenRole) {
    const req = { auth: { payload: { sub: 'auth0|user', [ROLES_CLAIM]: [role], permissions: ['read:own-profile'] } } };
    let status;
    const res = { status(value) { status = value; return this; }, json() { return this; } };
    await middleware(req, res, () => { status = 200; });
    return { status, currentUser: req.currentUser };
  }
  return { request, calls, getUser: () => user };
}

test('sincroniza el rol vigente de Auth0 antes de autorizar', async () => {
  const fixture = createFixture();
  const result = await fixture.request();
  assert.equal(result.status, 200);
  assert.equal(result.currentUser.rolUsuario, NEW_ROLE);
  assert.equal(fixture.getUser().rolUsuario, NEW_ROLE);
  assert.deepEqual(fixture.calls, { resolve: 1, update: 1 });
});

test('un token antiguo no revierte el rol sincronizado', async () => {
  const fixture = createFixture();
  await fixture.request();
  const result = await fixture.request(OLD_ROLE);
  assert.equal(result.status, 403);
  assert.equal(fixture.getUser().rolUsuario, NEW_ROLE);
  assert.deepEqual(fixture.calls, { resolve: 2, update: 1 });
});

test('rechaza token distinto del rol vigente en Auth0 sin escribir', async () => {
  const fixture = createFixture({ auth0Role: OLD_ROLE });
  assert.equal((await fixture.request()).status, 403);
  assert.deepEqual(fixture.calls, { resolve: 1, update: 0 });
});

test('no consulta Auth0 ni escribe para una cuenta desvinculada', async () => {
  const fixture = createFixture({ status: 'Desvinculado' });
  assert.equal((await fixture.request()).status, 403);
  assert.deepEqual(fixture.calls, { resolve: 0, update: 0 });
});

test('un fallo de Auth0 produce error temporal sin escribir', async () => {
  const fixture = createFixture({ auth0Error: new Error('offline') });
  assert.equal((await fixture.request()).status, 503);
  assert.deepEqual(fixture.calls, { resolve: 1, update: 0 });
});

test('una actualización concurrente de estado impide autorizar', async () => {
  const fixture = createFixture({ afterUpdate: (user) => ({ ...user, estadoUsuario: 'Desvinculado' }) });
  assert.equal((await fixture.request()).status, 403);
});
