import assert from 'node:assert/strict';
import { test } from 'node:test';
import OrderRepository from '../src/modules/orders/repo/orders.repo.js';
import { ROLES } from '../src/config/roles.js';

for (const [method, role] of [
  ['notifyProductionAdministrators', ROLES.ADMINISTRADOR],
  ['notifyCollectionsAdministrators', ROLES.ADMIN_COBRANZAS],
]) {
  test(`${method}: filtra destinatarios y asigna un solo mensaje por lote`, async () => {
    let messageCount = 0;
    let assignmentCount = 0;
    const repo = new OrderRepository({ prisma: {
      usuario: { async findMany({ where, select }) {
        assert.deepEqual(where, { rol_usuario: role, NOT: { estado_usuario: 'Desvinculado' } });
        assert.deepEqual(select, { id_usuario: true });
        return [{ id_usuario: 3 }, { id_usuario: 7 }];
      } },
      mensaje: { async create({ data }) {
        messageCount++;
        assert.equal(data.id_pedido, 101);
        assert.equal(data.Asunto, 'Aviso');
        return { id_mensaje: 42 };
      } },
      mENSAJE_USUARIO: { async createMany({ data }) {
        assignmentCount++;
        assert.deepEqual(data, [3, 7].map(id_usuario => ({ id_usuario, id_mensaje: 42, leido_: false, oculto_: false })));
      } },
    } });
    await repo[method]({ orderId: 101, subject: 'Aviso', content: 'Contenido' });
    assert.equal(messageCount, 1);
    assert.equal(assignmentCount, 1);
  });

  test(`${method}: no crea mensajes sin destinatarios`, async () => {
    const repo = new OrderRepository({ prisma: {
      usuario: { async findMany() { return []; } },
      mensaje: { async create() { assert.fail('No debe crear un mensaje huérfano'); } },
    } });
    assert.equal(await repo[method]({ orderId: 101 }), null);
  });
}
