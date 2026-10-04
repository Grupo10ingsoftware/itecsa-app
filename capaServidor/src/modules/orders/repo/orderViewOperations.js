import { readSelect } from './orderReadSelect.js';
import { toOrderSummaryDTO } from './orderMapping.js';

const client = { select: { nombre_cliente: true, razon_social: true } };
const product = { select: { nombre_producto: true } };
const item = { select: { id_detalle_pedido: true, cantidad: true, fecha_estimada_termino: true, Tipo_Producto: product } };
const base = {
  id_pedido: true, numero_nota_venta: true, fecha_estimada_termino: true,
  Cliente: client,
  Estado_Pedido: { select: { orden_kanban: true, nombre_etapa: true } },
  Detalle_pedido: item,
};
const labels = { select: { etiqueta: { select: { nombre_etiqueta: true } } } };
const kanbanSelect = {
  ...base, id_estado_pago: true, fecha_creacion: true,
  Estado_Pago: { select: { nombre_estado_pago: true } },
  Pedido_Etiqueta: labels,
};
const calendarSelect = { ...base, Pedido_Etiqueta: labels };
const calendarDetailSelect = { ...calendarSelect, usuario_manager_origen: true };

function products(row) {
  return (row.Detalle_pedido ?? []).map((detail) => ({
    id_detalle_pedido: detail.id_detalle_pedido,
    product: detail.Tipo_Producto?.nombre_producto ?? null,
    quantity: detail.cantidad ?? null,
    dueDate: detail.fecha_estimada_termino ?? null,
  }));
}

export function mapKanbanSummary(row) {
  return {
    id_pedido: row.id_pedido,
    numero_nota_venta: row.numero_nota_venta,
    nombre_cliente: row.Cliente?.nombre_cliente ?? row.Cliente?.razon_social ?? null,
    fecha_creacion: row.fecha_creacion,
    fecha_estimada_termino: row.fecha_estimada_termino,
    id_etapa_general: row.Estado_Pedido?.orden_kanban ?? null,
    nombre_etapa_general: row.Estado_Pedido?.nombre_etapa ?? null,
    id_estado_pago: row.id_estado_pago,
    estado_pago: row.Estado_Pago?.nombre_estado_pago ?? null,
    etiquetas: (row.Pedido_Etiqueta ?? []).map((entry) => entry.etiqueta).filter(Boolean),
    detalles: products(row),
  };
}

export function mapCalendarSummary(row) {
  return {
    id_pedido: row.id_pedido,
    numero_nota_venta: row.numero_nota_venta,
    nombre_cliente: row.Cliente?.nombre_cliente ?? row.Cliente?.razon_social ?? null,
    fecha_estimada_termino: row.fecha_estimada_termino,
    id_etapa_general: row.Estado_Pedido?.orden_kanban ?? null,
    etiquetas: (row.Pedido_Etiqueta ?? []).map((entry) => entry.etiqueta).filter(Boolean),
    detalles: products(row),
  };
}

export async function listOrderViewsOperation(repository, { view, limit, cursor, status, search, productType, from, to, unscheduled = false }) {
  const where = {
    ...(cursor ? { id_pedido: { lt: cursor.id } } : {}),
    ...(view === 'kanban'
      ? { Estado_Pedido: { is: { nombre_etapa: { notIn: ['Terminado', 'Cancelado'], ...(status ? { equals: status } : {}) } } } }
      : status ? { Estado_Pedido: { is: { nombre_etapa: status } } } : {}),
    ...(search ? { OR: [
      { numero_nota_venta: { contains: search } },
      { Cliente: { is: { nombre_cliente: { contains: search } } } },
      { Cliente: { is: { razon_social: { contains: search } } } },
    ] } : {}),
    ...(productType ? { Detalle_pedido: { some: { Tipo_Producto: { is: { nombre_producto: { contains: productType } } } } } } : {}),
    ...(unscheduled
      ? { fecha_estimada_termino: null }
      : (from || to) ? { fecha_estimada_termino: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } } : {}),
  };
  const rows = await repository.client.pedidos.findMany({
    where, select: view === 'calendar' ? calendarSelect : kanbanSelect,
    orderBy: { id_pedido: 'desc' }, take: limit + 1,
  });
  return rows.map(view === 'calendar' ? mapCalendarSummary : mapKanbanSummary);
}

export async function getOrderViewOperation(repository, id, view) {
  const row = await repository.client.pedidos.findUnique({
    where: { id_pedido: Number(id) },
    select: view === 'calendar' ? calendarDetailSelect : await readSelect(repository.client),
  });
  if (!row) return null;
  if (view === 'calendar') return { ...mapCalendarSummary(row), seller: row.usuario_manager_origen ?? null };
  const full = toOrderSummaryDTO(row);
  const summary = mapKanbanSummary(row);
  return {
    ...summary,
    detalles: full.detalles.map(({ id_detalle_pedido, nombre_producto, cantidad, fecha_estimada_termino, lanyardProgress, subProcesses }) => ({
      id_detalle_pedido, nombre_producto, cantidad, fecha_estimada_termino, lanyardProgress, subProcesses,
    })),
  };
}

export async function listPaymentViewsOperation(repository, { limit, cursor, status, search, from, to }) {
  const baseWhere = {
    ...(search ? { OR: [
      { numero_nota_venta: { contains: search } },
      { Cliente: { is: { nombre_cliente: { contains: search } } } },
      { Cliente: { is: { razon_social: { contains: search } } } },
      { Cliente: { is: { rut_cliente: { contains: search } } } },
    ] } : {}),
    ...((from || to) ? { fecha_creacion: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } } : {}),
  };
  const select = {
    id_pedido: true, numero_nota_venta: true, fecha_creacion: true, id_estado_pago: true,
    Cliente: { select: { nombre_cliente: true, razon_social: true, rut_cliente: true } },
    Estado_Pago: { select: { nombre_estado_pago: true } },
  };
  const [rows, counts] = await Promise.all([
    repository.client.pedidos.findMany({
      where: {
        ...baseWhere,
        ...(cursor ? { id_pedido: { lt: cursor.id } } : {}),
        ...(status ? { Estado_Pago: { is: { nombre_estado_pago: status } } } : {}),
      }, select, orderBy: { id_pedido: 'desc' }, take: limit + 1,
    }),
    Promise.all(['Pendiente', 'Rechazado', 'Confirmado'].map((name) =>
      repository.client.pedidos.count({ where: { ...baseWhere, Estado_Pago: { is: { nombre_estado_pago: name } } } }),
    )),
  ]);
  return {
    rows: rows.map((row) => ({
      id_pedido: row.id_pedido,
      numero_nota_venta: row.numero_nota_venta,
      fecha_creacion: row.fecha_creacion,
      id_estado_pago: row.id_estado_pago,
      nombre_cliente: row.Cliente?.nombre_cliente ?? null,
      razon_social: row.Cliente?.razon_social ?? null,
      rut_cliente: row.Cliente?.rut_cliente ?? null,
      estado_pago: row.Estado_Pago?.nombre_estado_pago ?? null,
    })),
    counts: { pending: counts[0], rejected: counts[1], confirmed: counts[2] },
  };
}
