import { ROLES } from '../../../config/roles.js';

export async function notifyProductionAdministratorsOperation(repository, notification) {
  return repository.notifyAdministratorsByRole(ROLES.ADMINISTRADOR, notification);
}

export async function notifyCollectionsAdministratorsOperation(repository, notification) {
  return repository.notifyAdministratorsByRole(ROLES.ADMIN_COBRANZAS, notification);
}

export async function notifyAdministratorsByRoleOperation(repository, role, {
    orderId,
    subject,
    content,
    now = new Date(),
  }) {
  const administrators = await repository.client.usuario.findMany({
    where: {
      rol_usuario: role,
      NOT: { estado_usuario: "Desvinculado" },
    },
    select: { id_usuario: true },
  });

  if (administrators.length === 0) return null;

  const message = await repository.client.mensaje.create({
    data: {
      id_pedido: Number(orderId),
      fecha_publicacion: now,
      Asunto: subject,
      contenido: content,
    },
  });

  await repository.client.mENSAJE_USUARIO.createMany({
    data: administrators.map(({ id_usuario }) => ({
      id_usuario,
      id_mensaje: message.id_mensaje,
      leido_: false,
      oculto_: false,
    })),
    skipDuplicates: true,
  });

  return message;
}

export async function notifyOrderReadyOperation(repository, order, now = new Date()) {
  const responsibleUserId = Number(order?.id_usuario);
  if (!Number.isInteger(responsibleUserId) || responsibleUserId <= 0) return null;
  return repository.client.mensaje.create({
    data: {
      id_pedido: Number(order.id_pedido),
      fecha_publicacion: now,
      Asunto: "Pedido listo para entrega",
      contenido: `El pedido ${order.numero_nota_venta ?? `#${order.id_pedido}`} pasó a la etapa Listo para Entrega.`,
      MENSAJE_USUARIO: {
        create: { id_usuario: responsibleUserId, leido_: false, oculto_: false },
      },
    },
  });
}
