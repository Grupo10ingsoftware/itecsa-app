import getPrismaClient from "../../../database/prisma.js";

const orderSummarySelect = {
    id_pedido: true,
    numero_nota_venta: true,
    fecha_creacion: true,
    Cliente: {
        select: {
            rut_cliente: true,
            nombre_cliente: true,
            razon_social: true,
        },
    },
    Estado_Pedido: {
        select: {
            id_estado_pedido: true,
            nombre_etapa: true,
            orden_kanban: true,
        },
    },
};

const orderDetailInclude = {
    Cliente: true,
    Usuario: {
        select: {
            id_usuario: true,
            nombre_usuario: true,
            apellido_usuario: true,
            correo_usuario: true,
        },
    },
    Estado_Pedido: true,
    Estado_Pago: true,
    Detalle_pedido: {
        include: {
            Tipo_Producto: true,
            Estado_Subprocesos: true,
        },
    },
    Pedido_Item_Sin_Seguimiento: true,
    Pedido_Etiqueta: {
        include: { etiqueta: true },
    },
    Registros: {
        include: {
            Usuario: {
                select: {
                    id_usuario: true,
                    nombre_usuario: true,
                    apellido_usuario: true,
                    correo_usuario: true,
                },
            },
            Registro_Etapas: {
                include: { Estado_Pedido: true },
            },
            Registro_Pago: {
                include: {
                    Estado_Pago_Registro_Pago_id_estado_pago_anteriorToEstado_Pago: true,
                    Estado_Pago_Registro_Pago_id_estado_pago_nuevoToEstado_Pago: true,
                },
            },
            registro_subprocesos: {
                include: {
                    Estado_Subprocesos: true,
                    Detalle_pedido: {
                        include: { Tipo_Producto: true },
                    },
                },
            },
        },
        orderBy: [
            { FECHA_HORA: "asc" },
            { ID_REGISTRO: "asc" },
        ],
    },
};

export default class OrderHistoryRepository {
    constructor({ prisma } = {}) {
        this.prisma = prisma;
    }

    get client() {
        if (!this.prisma) this.prisma = getPrismaClient();
        return this.prisma;
    }

    async list({ status, search, dateRange, page, perPage }) {
        const searchConditions = search
            ? [
                { numero_nota_venta: { contains: search } },
                { Cliente: { is: { rut_cliente: { contains: search } } } },
                { Cliente: { is: { nombre_cliente: { contains: search } } } },
                { Cliente: { is: { razon_social: { contains: search } } } },
            ]
            : [];

        if (dateRange) {
            searchConditions.push({
                fecha_creacion: {
                    gte: dateRange.start,
                    lt: dateRange.end,
                },
            });
        }

        const where = {
            ...(status
                ? { Estado_Pedido: { is: { nombre_etapa: status } } }
                : {}),
            ...(searchConditions.length > 0 ? { OR: searchConditions } : {}),
        };

        const [orders, total] = await this.client.$transaction([
            this.client.pedidos.findMany({
                where,
                select: orderSummarySelect,
                orderBy: [
                    { fecha_creacion: "desc" },
                    { id_pedido: "desc" },
                ],
                skip: (page - 1) * perPage,
                take: perPage,
            }),
            this.client.pedidos.count({ where }),
        ]);

        return { orders, total };
    }

    getById(orderId) {
        return this.client.pedidos.findUnique({
            where: { id_pedido: Number(orderId) },
            include: orderDetailInclude,
        });
    }
}
