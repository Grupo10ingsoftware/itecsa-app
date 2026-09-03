import getPrismaClient from "../../../database/prisma.js";

function mapMessageAssignment(row) {
    if (!row) return null;

    const message = row.Mensaje;

    return {
        id_mensaje: message.id_mensaje,
        contenido: message.contenido,
        fecha_publicacion: message.fecha_publicacion,
        Asunto: message.Asunto,
        id_pedido: message.id_pedido,
        leido: row.leido_,
        oculto: row.oculto_,
        pedido: message.Pedidos ?? null,
    };
}

const messageInclude = {
    Mensaje: {
        include: {
            Pedidos: {
                select: {
                    id_pedido: true,
                    numero_nota_venta: true,
                    fecha_creacion: true,
                    fecha_estimada_termino: true,
                },
            },
        },
    },
};

class MessageRepository {
    constructor({ prisma } = {}) {
        this.prisma = prisma;
    }

    get client() {
        if (!this.prisma) {
            this.prisma = getPrismaClient();
        }

        return this.prisma;
    }

    buildInboxWhere({ userId, status = "all", from, to }) {
        const where = {
            id_usuario: Number(userId),
        };

        if (status === "read") {
            where.leido_ = true;
        }

        if (status === "unread") {
            where.leido_ = false;
        }

        if (from || to) {
            where.Mensaje = {
                fecha_publicacion: {
                    ...(from ? { gte: from } : {}),
                    ...(to ? { lte: to } : {}),
                },
            };
        }

        return where;
    }

    async listInbox({ userId, status, sort, from, to, page, perPage }) {
        const where = this.buildInboxWhere({
            userId,
            status,
            from,
            to,
        });
        const direction = sort === "oldest" ? "asc" : "desc";

        const [rows, total] = await this.client.$transaction([
            this.client.mENSAJE_USUARIO.findMany({
                where,
                include: messageInclude,
                orderBy: [
                    {
                        Mensaje: {
                            fecha_publicacion: direction,
                        },
                    },
                    {
                        id_mensaje: direction,
                    },
                ],
                skip: (page - 1) * perPage,
                take: perPage,
            }),
            this.client.mENSAJE_USUARIO.count({ where }),
        ]);

        return {
            messages: rows.map(mapMessageAssignment),
            total,
            page,
            perPage,
            totalPages: Math.ceil(total / perPage),
        };
    }

    async listNotifications(userId, limit) {
        const rows = await this.client.mENSAJE_USUARIO.findMany({
            where: {
                id_usuario: Number(userId),
                leido_: false,
                oculto_: false,
            },
            include: messageInclude,
            orderBy: [
                {
                    Mensaje: {
                        fecha_publicacion: "desc",
                    },
                },
                {
                    id_mensaje: "desc",
                },
            ],
            take: limit,
        });

        return rows.map(mapMessageAssignment);
    }

    async countUnreadNotifications(userId) {
        return this.client.mENSAJE_USUARIO.count({
            where: {
                id_usuario: Number(userId),
                leido_: false,
                oculto_: false,
            },
        });
    }

    async findUserMessage(userId, messageId) {
        const row = await this.client.mENSAJE_USUARIO.findUnique({
            where: {
                id_usuario_id_mensaje: {
                    id_usuario: Number(userId),
                    id_mensaje: Number(messageId),
                },
            },
            include: messageInclude,
        });

        return mapMessageAssignment(row);
    }

    async markAsRead(userId, messageId) {
        const row = await this.client.mENSAJE_USUARIO.update({
            where: {
                id_usuario_id_mensaje: {
                    id_usuario: Number(userId),
                    id_mensaje: Number(messageId),
                },
            },
            data: {
                leido_: true,
            },
            include: messageInclude,
        });

        return mapMessageAssignment(row);
    }

    async hideNotification(userId, messageId) {
        const row = await this.client.mENSAJE_USUARIO.update({
            where: {
                id_usuario_id_mensaje: {
                    id_usuario: Number(userId),
                    id_mensaje: Number(messageId),
                },
            },
            data: {
                oculto_: true,
            },
            include: messageInclude,
        });

        return mapMessageAssignment(row);
    }

    async hideAllNotifications(userId) {
        return this.client.mENSAJE_USUARIO.updateMany({
            where: {
                id_usuario: Number(userId),
                oculto_: false,
            },
            data: {
                oculto_: true,
            },
        });
    }

    async create({
        orderId = null,
        contenido,
        asunto,
        recipientUserIds,
        fechaPublicacion = new Date(),
    }) {
        return this.client.$transaction(async (transaction) => {
            const message = await transaction.mensaje.create({
                data: {
                    contenido,
                    Asunto: asunto,
                    fecha_publicacion: fechaPublicacion,
                    id_pedido: orderId,
                },
            });

            await transaction.mENSAJE_USUARIO.createMany({
                data: recipientUserIds.map((userId) => ({
                    id_usuario: userId,
                    id_mensaje: message.id_mensaje,
                    leido_: false,
                    oculto_: false,
                })),
                skipDuplicates: true,
            });

            return transaction.mensaje.findUnique({
                where: {
                    id_mensaje: message.id_mensaje,
                },
                include: {
                    Pedidos: {
                        select: {
                            id_pedido: true,
                            numero_nota_venta: true,
                            fecha_creacion: true,
                            fecha_estimada_termino: true,
                        },
                    },
                    MENSAJE_USUARIO: {
                        select: {
                            id_usuario: true,
                            leido_: true,
                            oculto_: true,
                        },
                    },
                },
            });
        });
    }
}

export default MessageRepository;
