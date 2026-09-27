import assert from 'node:assert/strict';
import { test } from 'node:test';
import OrderService, { DUPLICATE_SALES_NOTE_MESSAGE } from '../src/modules/orders/service/order.service.js';
import OrderController from '../src/modules/orders/controller/orders.controller.js';

function setup() {
  const state = { reads: [], writes: [], labels: [], duplicate: false, note: {
    numeroNota: '123', cliente: { rut: '12.345.678-9', nombre: 'Empresa Real' },
    origen: { usuarioManager: 'vendedor-fuente' }, observaciones: 'Observacion fuente',
    fechaEntregaTentativaOrigen: '2026-10-01',
    items: [{ codigo: 'L1', producto: 'Lanyard original', cantidad: 500, tipoProducto: 'Lanyard', familia: 'LANYARD', subfamilia: 'LANYARD' }],
    itemsSinSeguimientoProductivo: [{ codigo: 'X1', producto: 'Complemento', cantidad: 2, subfamilia: 'EXTRA' }],
  } };
  const service = new OrderService({
    salesNoteSourceService: { async getByNumber(number) { state.reads.push(number); return structuredClone(state.note); } },
    userRepo: { async findByAuth0Id(sub) { assert.equal(sub, 'auth0|actor'); return { idUsuario: 8 }; } },
    clientService: { async findOrCreateClient(data) { state.client = data; return { id_cliente: 15 }; } },
    productTypeService: { async getProductTypeByName(name) { state.productType = name; return { id_tipo_producto: 2 }; } },
    orderDetailService: { async createOrderDetail(id, data) { state.detail = data; return { ...data, id_detalle_pedido: 10 }; } },
    repoClient: { etiqueta: { async findMany({ where }) { state.labels = where.nombre_etiqueta.in; return state.labels.map((name, i) => ({ id_etiqueta: i + 1 })); } } },
    repo: {
      async existsBySalesNoteNumber(number) { assert.equal(number, '123'); return state.duplicate; },
      async create(data) { state.writes.push(data); return { id_pedido: 1 }; },
      async get() { return { ...state.writes.at(-1), id_pedido: 1 }; },
      async getProductSubprocesses() { return [{ id_estado_subproceso: 3 }]; },
      async createUntrackedItems(id, items) { state.untracked = items; return items; },
      async addLabels(id, labels, actor) { assert.equal(actor, 8); },
      async notifyCollectionsAdministrators() {}, async notifyProductionAdministrators() {},
    },
  });
  const create = (input = {}) => service.createOrder({ numeroNota: 'NV-2026-123', ...input }, { auth0UserId: 'auth0|actor' });
  return { state, service, create };
}

test('creacion valida reconsulta backend y conserva datos canonicos y estados internos', async () => {
  const { state, create } = setup();
  const order = await create();
  assert.deepEqual(state.reads, ['123']);
  assert.equal(state.client.rut_cliente, '12.345.678-9');
  assert.equal(state.client.razon_social, 'Empresa Real');
  assert.equal(state.detail.cantidad, 500);
  assert.equal(state.productType, 'Lanyard');
  assert.equal(order.detalles[0].producto, 'Lanyard original');
  assert.equal(order.id_usuario, 8);
  assert.equal(order.usuario_manager_origen, 'vendedor-fuente');
  assert.equal(order.observacion_origen, 'Observacion fuente');
  assert.equal(order.fecha_estimada_termino, null);
});

for (const [name, input] of Object.entries({
  rut: { cliente: { rut: '99.999.999-9' } },
  razonSocial: { cliente: { nombre: 'Empresa Manipulada' }, razonSocial: 'Falso' },
  cantidad: { items: [{ cantidad: 9999 }], cantidad: 9999 },
  producto: { items: [{ tipoProducto: 'Tarjeta', producto: 'Falso', codigo: 'FALSO', familia: 'FALSA' }] },
  vendedor: { origen: { usuarioManager: 'intruso' }, usuario_manager_origen: 'intruso' },
  observacionFuente: { observaciones: 'Falsa', observacion_origen: 'Falsa' },
  noProductivos: { itemsSinSeguimientoProductivo: [{ producto: 'Falso', cantidad: 999 }] },
  atributosInternos: { campoInterno: 'MANIPULADO', estadoPago: 'Confirmado', id_estado_pago: 2, id_estado_pedido: 99, idUsuarioOrigen: 999, id_usuario: 999, id_cliente: 999, id_etiqueta: 999, fechaEntregaTentativaOrigen: '2099-01-01', fecha_estimada_termino: '2099-01-01' },
})) {
  test(`request manipulado: ${name} no sustituye datos canonicos`, async () => {
    const baseline = setup();
    const expected = await baseline.create();
    const altered = setup();
    assert.deepEqual(await altered.create(input), expected);
    assert.deepEqual(altered.state.client, baseline.state.client);
    assert.deepEqual(altered.state.detail, baseline.state.detail);
    assert.deepEqual(altered.state.untracked, baseline.state.untracked);
    assert.deepEqual(altered.state.labels, []);
  });
}

for (const priority of ['urgent', 'contract', ['urgent', 'contract']]) {
  test(`conserva prioridad ${priority} y observacion RF45 separada`, async () => {
    const { state, create } = setup();
    const order = await create({ priority, observacionInterna: ' Comentario legitimo ' });
    assert.equal(order.observacion_interna, 'Comentario legitimo');
    assert.equal(order.observacion_origen, 'Observacion fuente');
    assert.deepEqual(state.labels, Array.isArray(priority) ? ['Urgencia', 'Prioridad por contrato'] : [priority === 'urgent' ? 'Urgencia' : 'Prioridad por contrato']);
  });
}

test('nota inexistente no escribe aunque el navegador envie una copia completa', async () => {
  const { state, create } = setup(); const old = state.note; state.note = null;
  await assert.rejects(create(old), { statusCode: 404 });
  assert.deepEqual(state.writes, []);
});

test('duplicado conserva rechazo 409 y mensaje sin escrituras', async () => {
  const { state, create } = setup(); state.duplicate = true;
  await assert.rejects(create(), { statusCode: 409, message: DUPLICATE_SALES_NOTE_MESSAGE });
  assert.deepEqual(state.writes, []);
});

test('cambio entre preview y confirmacion usa ultima version consultada', async () => {
  const { state, service, create } = setup();
  const preview = await service.getSalesNoteByNumber('123');
  state.note.cliente.nombre = 'Empresa Actualizada';
  state.note.items[0].cantidad = 700;
  const order = await create(preview);
  assert.deepEqual(state.reads, ['123', '123']);
  assert.equal(state.client.razon_social, 'Empresa Actualizada');
  assert.equal(order.detalles[0].cantidad, 700);
});

test('sin referencia no hay via alternativa de creacion legacy', async () => {
  const { state, service } = setup();
  await assert.rejects(service.createOrder({ rut_cliente: '99', productos: [{ nombre_producto: 'Tarjeta', cantidad: 1 }] }, { auth0UserId: 'auth0|actor' }), { statusCode: 400 });
  assert.deepEqual(state.reads, []); assert.deepEqual(state.writes, []);
});

for (const input of [{ numeroNota: {} }, { numeroNota: ' ' }, { numeroNota: 'a'.repeat(51) }, { priority: 'admin' }, { observacionInterna: {} }]) {
  test(`rechaza input invalido ${JSON.stringify(input)}`, async () => {
    const { create, state } = setup();
    await assert.rejects(create(input), { statusCode: 400 });
    assert.deepEqual(state.writes, []);
  });
}

test('controlador real usa sesion y reconsulta aun con body completo manipulado', async () => {
  const { service, state } = setup();
  const controller = new OrderController({ service });
  let status, body;
  await controller.createOrder({ body: { ...state.note, cliente: { rut: '99', nombre: 'Falso' }, id_usuario: 999 }, auth: { payload: { sub: 'auth0|actor' } } }, {
    status(value) { status = value; return this; }, json(value) { body = value; return this; },
  });
  assert.equal(status, 201); assert.equal(body.id_usuario, 8);
  assert.equal(state.client.nombre_cliente, 'Empresa Real');
  assert.deepEqual(state.reads, ['123']);
});

for (const [name, update] of [
  ['cantidad invalida', (note) => { note.items[0].cantidad = -1; }],
  ['sin cliente', (note) => { note.cliente = null; }],
  ['item nulo', (note) => { note.items = [null]; }],
  ['referencia diferente', (note) => { note.numeroNota = '999'; }],
]) {
  test(`fuente invalida: ${name} no produce escrituras`, async () => {
    const { state, create } = setup(); update(state.note);
    await assert.rejects(create(), { statusCode: 400 });
    assert.deepEqual(state.writes, []);
  });
}

test('fallo de la fuente no utiliza el snapshot del navegador como respaldo', async () => {
  const { service, state, create } = setup();
  service.salesNoteSourceService = { async getByNumber() { throw new Error('Fuente indisponible'); } };
  await assert.rejects(create(state.note), /Fuente indisponible/);
  assert.deepEqual(state.writes, []);
});

test('sin sesion el id_usuario del body no reemplaza al actor', async () => {
  const { service, state } = setup();
  await assert.rejects(service.createOrder({ numeroNota: '123', id_usuario: 999 }), { statusCode: 400 });
  assert.deepEqual(state.writes, []);
});

test('adaptador JSON real relee la fuente modificada al confirmar', async (t) => {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { default: SalesNoteSourceService } = await import('../src/modules/orders/service/salesNoteSource.service.js');
  const directory = await mkdtemp(join(tmpdir(), 'h09-source-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const fixturePath = join(directory, 'notes.json');
  const { state, service, create } = setup();
  const raw = structuredClone(state.note);
  raw.items[0].importable = true;
  await writeFile(fixturePath, JSON.stringify([raw]));
  service.salesNoteSourceService = new SalesNoteSourceService({ fixturePath });
  const preview = await service.getSalesNoteByNumber('123');
  raw.items[0].cantidad = 12500;
  raw.cliente.nombre = 'Empresa revisada desde archivo sintetico';
  await writeFile(fixturePath, JSON.stringify([raw]));
  const order = await create(preview);
  assert.equal(order.detalles[0].cantidad, 12500);
  assert.equal(state.client.razon_social, raw.cliente.nombre);
});
