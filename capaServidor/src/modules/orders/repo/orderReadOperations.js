import { readSelect } from './orderReadSelect.js';
import { mapOrderRow, mapPaymentOrderRow, toOrderDetailDTO } from './orderMapping.js';

export async function getBySalesNoteNumberOperation(repository, numeroNota) {
  return repository.client.pedidos.findFirst({
    where: { numero_nota_venta: String(numeroNota) },
    select: await readSelect(repository.client),
  });
}

export async function existsBySalesNoteNumberOperation(repository, numeroNota) {
  const order = await repository.client.pedidos.findFirst({
    where: { numero_nota_venta: String(numeroNota) },
    select: { id_pedido: true },
  });

  return Boolean(order);
}

export async function getAllOrdersOperation(repository, { limit = 50, cursor, status, search, productType, from, to } = {}) {
  const where = {
    ...(cursor ? { id_pedido: { lt: cursor.id } } : {}),
    ...(status ? { Estado_Pedido: { is: { nombre_etapa: status } } } : {}),
    ...(search ? {
      OR: [
        { numero_nota_venta: { contains: search } },
        { Cliente: { is: { nombre_cliente: { contains: search } } } },
        { Cliente: { is: { razon_social: { contains: search } } } },
      ],
    } : {}),
    ...(productType ? {
      Detalle_pedido: {
        some: { Tipo_Producto: { is: { nombre_producto: { contains: productType } } } },
      },
    } : {}),
    ...((from || to) ? {
      fecha_estimada_termino: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lt: to } : {}),
      },
    } : {}),
  };
  const orders = await repository.client.pedidos.findMany({
    where,
    select: await readSelect(repository.client),
    orderBy: { id_pedido: "desc" },
    take: limit + 1,
  });

  return orders.map((order) => mapOrderRow(order));
}

export async function getPaymentOrdersOperation(repository) {
  const orders = await repository.client.$queryRaw`
      SELECT
        p.id_pedido,
        p.numero_nota_venta,
        p.fecha_creacion,
        p.id_estado_pago,
        p.id_estado_pedido,
        c.nombre_cliente,
        c.razon_social,
        c.rut_cliente,
        ep.nombre_etapa AS nombre_etapa_general,
        ep.orden_kanban AS id_etapa_general,
        epa.nombre_estado_pago AS estado_pago
      FROM Pedidos p
      LEFT JOIN Cliente c ON c.id_cliente = p.id_cliente
      LEFT JOIN Estado_Pedido ep ON ep.id_estado_pedido = p.id_estado_pedido
      LEFT JOIN Estado_Pago epa ON epa.id_estado_pago = p.id_estado_pago
      ORDER BY p.id_pedido DESC
    `;

  return orders.map(mapPaymentOrderRow);
}

export async function getPaymentOrderOperation(repository, id) {
  const orders = await repository.client.$queryRaw`
      SELECT
        p.id_pedido,
        p.numero_nota_venta,
        p.fecha_creacion,
        p.id_estado_pago,
        p.id_estado_pedido,
        c.nombre_cliente,
        c.razon_social,
        c.rut_cliente,
        ep.nombre_etapa AS nombre_etapa_general,
        ep.orden_kanban AS id_etapa_general,
        epa.nombre_estado_pago AS estado_pago
      FROM Pedidos p
      LEFT JOIN Cliente c ON c.id_cliente = p.id_cliente
      LEFT JOIN Estado_Pedido ep ON ep.id_estado_pedido = p.id_estado_pedido
      LEFT JOIN Estado_Pago epa ON epa.id_estado_pago = p.id_estado_pago
      WHERE p.id_pedido = ${Number(id)}
      LIMIT 1
    `;

  return mapPaymentOrderRow(orders[0]);
}

export async function getOperation(repository, id) {
  const order = await repository.client.pedidos.findUnique({
    where: { id_pedido: Number(id) },
    select: await readSelect(repository.client),
  });

  return toOrderDetailDTO(order);
}

export async function getTransitionStateOperation(repository, id) {
  const order = await repository.client.pedidos.findUnique({
    where: { id_pedido: Number(id) },
    select: {
      id_pedido: true,
      id_estado_pedido: true,
      id_estado_pago: true,
      Estado_Pedido: { select: { orden_kanban: true, nombre_etapa: true } },
      Estado_Pago: { select: { nombre_estado_pago: true } },
    },
  });

  if (!order) return null;

  return {
    id_pedido: order.id_pedido,
    id_estado_pedido: order.id_estado_pedido,
    id_estado_pago: order.id_estado_pago,
    id_etapa_general: order.Estado_Pedido?.orden_kanban ?? null,
    generalStepId: order.Estado_Pedido?.orden_kanban ?? null,
    nombre_etapa_general: order.Estado_Pedido?.nombre_etapa ?? null,
    estado_pago: order.Estado_Pago?.nombre_estado_pago ?? null,
    paymentStatus: order.Estado_Pago?.nombre_estado_pago ?? null,
  };
}

export async function getProductSubprocessesOperation(repository, productTypeId) {
  return repository.client.producto_Subproceso.findMany({
    where: { id_tipo_producto: Number(productTypeId) },
    include: { Estado_Subprocesos: true },
    orderBy: { orden_flujo: "asc" },
  });
}
