import getPrismaClient from '../../database/prisma.js';
import { AppError } from '../../errors/AppError.js';

// Borradores para un revisor habilitado. Nunca son la respuesta automática al titular.
export async function discoverSubject(row, { category = 'profile', cursor, limit = 50 } = {}, database = getPrismaClient()) {
  if (!row.verified_at || !row.subject_id || !['user', 'client'].includes(row.subject_kind)) throw new AppError(409, 'Verifica y vincula el titular antes de localizar datos estructurados.');
  limit = Number(limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || (cursor !== undefined && (!/^\d+$/.test(String(cursor)) || Number(cursor) < 1 || !Number.isSafeInteger(Number(cursor))))) throw new AppError(400, 'Paginación inválida.');
  const user = row.subject_kind === 'user'; const id = row.subject_id;
  const orders = user ? { OR: [{ id_usuario: id }, { Registros: { some: { id_usuario: id } } }, { Pedido_Etiqueta: { some: { id_usuario_asigna: id } } }, { Detalle_pedido: { some: { OR: [{ Avance_Lanyard: { some: { id_usuario_registra: id } } }, { Comentario_Produccion: { some: { id_usuario: id } } }] } } }] } : { id_cliente: id };
  const definitions = {
    profile: user ? ['usuario', 'id_usuario', { id_usuario: id }, { id_usuario: true, id_auth0: true, correo_usuario: true, rut_usuario: true, nombre_usuario: true, apellido_usuario: true, rol_usuario: true, estado_usuario: true, pin_accepted_at: true, pin_failed_attempts: true, pin_locked_until: true }] : ['cliente', 'id_cliente', { id_cliente: id }, { id_cliente: true, rut_cliente: true, nombre_cliente: true, razon_social: true, estado_cliente: true }],
    orders: ['pedidos', 'id_pedido', orders, { id_pedido: true, fecha_creacion: true, fecha_estimada_termino: true, numero_nota_venta: true, id_usuario: true, id_cliente: true, observacion: true, observacion_origen: true, observacion_interna: true, usuario_manager_origen: true }],
    records: ['registros', 'ID_REGISTRO', user ? { id_usuario: id } : { Pedidos: { is: orders } }, { ID_REGISTRO: true, FECHA_HORA: true, id_pedido: true, id_usuario: true, observacion: true, Registro_Pago: true, Registro_Etapas: true, registro_subprocesos: true }],
    messages: ['mensaje', 'id_mensaje', user ? { MENSAJE_USUARIO: { some: { id_usuario: id } } } : { Pedidos: { is: orders } }, { id_mensaje: true, Asunto: true, contenido: true, fecha_publicacion: true, id_pedido: true, ...(user ? { MENSAJE_USUARIO: { where: { id_usuario: id }, select: { leido_: true, oculto_: true } } } : {}) }],
    comments: ['comentario_Produccion', 'id_comentario_produccion', user ? { id_usuario: id } : { Detalle_pedido: { is: { Pedidos: { is: orders } } } }, { id_comentario_produccion: true, comentario: true, fecha_comentario: true, id_detalle_pedido: true, id_usuario: true }],
    advances: ['avance_Lanyard', 'id_avance_lanyard', user ? { id_usuario_registra: id } : { Detalle_pedido: { is: { Pedidos: { is: orders } } } }, { id_avance_lanyard: true, id_detalle_pedido: true, fecha_produccion: true, cantidad_dia: true, cantidad_acumulada: true, observacion: true, id_usuario_registra: true }],
    recovery: ['pinRecoveryChallenge', 'id_pin_recovery_challenge', user ? { id_usuario: id } : { id_usuario: -1 }, { id_pin_recovery_challenge: true, created_at: true, expires_at: true, used_at: true, failed_attempts: true, delivery_status: true }],
    audit: ['securityAuditEvent', 'id_security_audit_event', user ? { actor_user_id: id } : { actor_user_id: -1 }, { id_security_audit_event: true, occurred_at: true, event_type: true, action: true, resource_type: true, resource_id: true, outcome: true, reason_code: true }],
    details: ['detalle_pedido', 'id_detalle_pedido', { Pedidos: { is: orders } }, { id_detalle_pedido: true, id_pedido: true, linea_origen: true, producto_origen: true, codigo_origen: true, cantidad: true, fecha_estimada_termino: true, fecha_real_termino: true, Dise_o: { include: { Dise_o_Lanyard: true, Dise_o_Tarjeta: true } } }],
    items: ['pedido_Item_Sin_Seguimiento', 'id_item_sin_seguimiento', { Pedidos: { is: orders } }, { id_item_sin_seguimiento: true, id_pedido: true, codigo: true, producto: true, cantidad: true, subfamilia: true, fecha_registro: true }],
  };
  if (!Object.hasOwn(definitions, category)) throw new AppError(400, 'Categoría de búsqueda inválida.');
  const [model, key, where, select] = definitions[category];
  const next = cursor === undefined ? {} : { [key]: { gt: key === 'id_security_audit_event' ? BigInt(cursor) : Number(cursor) } };
  const rows = await database[model].findMany({ where: { AND: [where, next] }, select, orderBy: { [key]: 'asc' }, take: limit + 1 });
  const data = JSON.parse(JSON.stringify(rows.slice(0, limit), (_key, value) => typeof value === 'bigint' ? value.toString() : value));
  return { draft: true, requiresThirdPartyReview: true, category, data, nextCursor: rows.length > limit ? String(rows[limit - 1][key]) : null,
    remainingChecks: ['Auth0 y proveedores', 'texto libre y menciones sin relación estructurada', 'fuente de NV y snapshots', 'métricas y exportaciones', 'logs/cuotas relacionables', 'tablas históricas', 'copias y respaldos', 'etiquetas y actores asociados'] };
}
