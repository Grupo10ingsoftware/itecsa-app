import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import getPrismaClient, { disconnectPrismaClient } from '../src/database/prisma.js';
import OrderService from '../src/modules/orders/service/order.service.js';
import { UserRepository } from '../src/modules/users/repo/users.repo.js';

const enabled = process.env.RUN_PHYSICAL_REGRESSIONS === 'true';

function assertIsolatedTarget() {
  const url = new URL(process.env.DATABASE_URL);
  assert.equal(process.env.APP_ENV, 'test');
  assert.equal(process.env.NODE_ENV, 'test');
  assert.equal(process.env.DB_SSL_MODE, 'disabled');
  assert.equal(process.env.DB_HOST, '127.0.0.1');
  assert.equal(process.env.DB_PORT, '33307');
  assert.equal(process.env.DB_NAME, 'itecsa_physical_test');
  assert.equal(process.env.DB_USER, 'itecsa_test');
  assert.equal(process.env.SALES_NOTE_SOURCE, 'fixture');
  assert.equal(url.protocol, 'mysql:');
  assert.equal(url.hostname, process.env.DB_HOST);
  assert.equal(url.port, process.env.DB_PORT);
  assert.equal(url.pathname, `/${process.env.DB_NAME}`);
  assert.equal(url.username, process.env.DB_USER);
  assert.equal(decodeURIComponent(url.password), process.env.DB_PASSWORD);
}

const rawOrder = (db, id) => db.pedidos.findUnique({
  where: { id_pedido: id },
  include: { Detalle_pedido: { orderBy: { id_detalle_pedido: 'asc' } } },
});
const day = (value) => value?.toISOString().slice(0, 10) ?? null;

after(async () => {
  if (enabled) await disconnectPrismaClient();
});

test('flujos físicos de regresiones en MySQL desechable', { skip: !enabled }, async () => {
  assertIsolatedTarget();
  const db = getPrismaClient();
  const database = await db.$queryRaw`SELECT DATABASE() AS name`;
  assert.equal(database[0].name, 'itecsa_physical_test');
  assert.equal(await db.pedidos.count(), 0, 'La base de prueba debe estar vacía');
  assert.equal(await db.usuario.count(), 0, 'La base de prueba debe estar vacía');

  await db.estado_Pago.createMany({ data: [
    { id_estado_pago: 1, nombre_estado_pago: 'Pendiente' },
    { id_estado_pago: 2, nombre_estado_pago: 'Confirmado' },
    { id_estado_pago: 3, nombre_estado_pago: 'Rechazado' },
  ] });
  await db.estado_Pedido.createMany({ data: [
    { id_estado_pedido: 1, nombre_etapa: 'Confirmacion de pago', orden_kanban: 0 },
    { id_estado_pedido: 2, nombre_etapa: 'Listo para produccion', orden_kanban: 1 },
    { id_estado_pedido: 3, nombre_etapa: 'En produccion', orden_kanban: 2 },
    { id_estado_pedido: 4, nombre_etapa: 'Listo para entrega', orden_kanban: 3 },
    { id_estado_pedido: 5, nombre_etapa: 'Entregado', orden_kanban: 4 },
    { id_estado_pedido: 6, nombre_etapa: 'En revisión', orden_kanban: 6 },
  ] });
  await db.tipo_Producto.createMany({ data: [
    { id_tipo_producto: 1, nombre_producto: 'Yoyo' },
    { id_tipo_producto: 2, nombre_producto: 'Lanyard' },
    { id_tipo_producto: 3, nombre_producto: 'Tarjeta' },
  ] });
  await db.etiqueta.create({ data: {
    id_etiqueta: 1, nombre_etiqueta: 'Urgencia', esta_activa: 1,
  } });

  const users = new UserRepository({ prisma: db });
  const actor = await users.create({
    auth0UserId: 'auth0|physical-soporte',
    correoUsuario: 'physical-soporte@example.test',
    rolUsuario: 'Soporte',
    estadoUsuario: 'Activo',
  });
  const pending = await users.create({
    auth0UserId: 'auth0|physical-ventas',
    correoUsuario: 'physical-ventas@example.test',
    rolUsuario: 'Ventas',
    estadoUsuario: 'Pendiente',
  });
  assert.equal(pending.estadoUsuario, 'Pendiente');
  assert.equal((await users.activateOnFirstAccess(pending.idAuth0, 'Soporte')).estadoUsuario, 'Pendiente');
  const concurrentAccess = await Promise.all([
    users.activateOnFirstAccess(pending.idAuth0, 'Ventas'),
    users.activateOnFirstAccess(pending.idAuth0, 'Ventas'),
  ]);
  assert.ok(concurrentAccess.every((user) => user.estadoUsuario === 'Activo'));
  assert.equal((await db.usuario.findUnique({ where: { id_auth0: pending.idAuth0 } })).estado_usuario, 'Activo');

  const orders = new OrderService({ prisma: db });
  const preview = await orders.getSalesNoteByNumber('24226');
  assert.equal(preview.numeroNota, '24226');
  assert.equal(preview.fechaEntregaTentativaOrigen, '2026-09-17');
  assert.ok(preview.items.length > 0);

  const created = await orders.createOrder({
    numeroNota: '24226', priority: 'urgent', observacionInterna: 'Prueba física sintética',
  }, { actorId: actor.idUsuario });
  const orderId = created.id_pedido;
  assert.ok(Number.isInteger(orderId) && orderId > 0);
  let persisted = await rawOrder(db, orderId);
  assert.equal(persisted.numero_nota_venta, '24226');
  assert.equal(persisted.fecha_estimada_termino, null);
  assert.ok(persisted.Detalle_pedido.length > 0);
  assert.ok(persisted.Detalle_pedido.every((detail) => detail.fecha_estimada_termino === null));
  assert.equal(await db.pedido_Etiqueta.count({ where: { id_pedido: orderId } }), 1);
  const unscheduled = await orders.getOrderViews({ unscheduled: 'true' }, 'calendar');
  assert.ok(unscheduled.items.some((item) => item.id_pedido === orderId));

  await assert.rejects(
    orders.createOrder({ numeroNota: '24226' }, { actorId: actor.idUsuario }),
    (error) => error.statusCode === 409 || error.status === 409,
  );
  assert.equal(await db.pedidos.count({ where: { numero_nota_venta: '24226' } }), 1);

  await orders.updateDeliveryDate(orderId, '2026-10-12', { actor: { idUsuario: actor.idUsuario } });
  persisted = await rawOrder(db, orderId);
  assert.equal(day(persisted.fecha_estimada_termino), '2026-10-12');
  assert.ok(persisted.Detalle_pedido.every((detail) => day(detail.fecha_estimada_termino) === '2026-10-12'));

  await orders.updPaymentState(orderId, 2, { actor: { idUsuario: actor.idUsuario }, role: 'Soporte' });
  persisted = await rawOrder(db, orderId);
  assert.equal(persisted.id_estado_pago, 2);
  assert.equal(persisted.id_estado_pedido, 2);
  assert.equal(await db.registro_Pago.count(), 1);

  await orders.sendToReview(orderId, 'Verificar la nota de origen', { auth0UserId: actor.idAuth0 });
  const revisedSource = {
    ...await orders.salesNoteSourceService.getByNumber('24226'),
    fechaEntregaTentativaOrigen: '2026-11-20',
  };
  revisedSource.items = [
    ...revisedSource.items,
    { codigo: 'PHYSICAL-NEW-LINE', producto: 'Tarjeta sintética', cantidad: 5,
      familia: 'TARJETAS', subfamilia: 'TARJETAS', tipoProducto: 'Tarjeta' },
  ];
  orders.salesNoteSourceService = { getByNumber: async () => revisedSource };
  await orders.reevaluateOrder(orderId, { auth0UserId: actor.idAuth0 });
  persisted = await rawOrder(db, orderId);
  assert.equal(day(persisted.fecha_estimada_termino), '2026-10-12');
  assert.equal(persisted.Detalle_pedido.length, 2);
  assert.ok(persisted.Detalle_pedido.every((detail) => day(detail.fecha_estimada_termino) === '2026-10-12'));
  assert.equal(persisted.id_estado_pedido, 2);
});
