import getPrismaClient from "../../../database/prisma.js";
import { ORDER_STATUS } from "../../../config/status.js";

export default class MetricsRepository {
    constructor({ prisma } = {}) {
        this.prisma = prisma;
    }

    get client() {
        if (!this.prisma) this.prisma = getPrismaClient();
        return this.prisma;
    }

    async performanceOrders({ start, end }) {
        const readyStage = { Estado_Pedido: { nombre_etapa: ORDER_STATUS.LISTO_ENTREGA } };
        // Broad UTC bounds; the service applies Chilean calendar dates, including DST.
        const entryRange = { gte: start, lt: new Date(end.getTime() + 86400000) };
        return this.client.pedidos.findMany({
            where: { Registros: { some: { Registro_Etapas: {
                ...readyStage, fecha_hora_entrada: entryRange,
            } } } },
            select: {
                fecha_estimada_termino: true,
                Registros: {
                    where: { Registro_Etapas: { ...readyStage, fecha_hora_entrada: { not: null } } },
                    orderBy: [
                        { Registro_Etapas: { fecha_hora_entrada: "desc" } },
                        { ID_REGISTRO: "desc" },
                    ],
                    take: 1,
                    select: { Registro_Etapas: { select: { fecha_hora_entrada: true } } },
                },
            },
        });
    }

    async production({ start, end }) {
        const details = await this.client.detalle_pedido.findMany({
            where: { fecha_real_termino: { gte: start, lt: end } },
            select: {
                cantidad: true,
                Tipo_Producto: { select: { nombre_producto: true } },
            },
        });

        return details.reduce((totals, detail) => {
            const productType = detail.Tipo_Producto?.nombre_producto;
            if (!productType) return totals;

            totals[productType] = (totals[productType] ?? 0) + Number(detail.cantidad ?? 0);
            return totals;
        }, {});
    }

    async dwellTime({ start, end }) {
        const [stages, subprocesses] = await Promise.all([
            this.client.registro_Etapas.findMany({
                where: {
                    fecha_hora_entrada: { gte: start, lt: end },
                    fecha_hora_salida: { not: null },
                },
                select: {
                    fecha_hora_entrada: true,
                    fecha_hora_salida: true,
                    Estado_Pedido: { select: { nombre_etapa: true } },
                },
            }),
            this.client.registro_subprocesos.findMany({
                where: {
                    fecha_hora_entrada: { gte: start, lt: end },
                    fecha_hora_salida: { not: null },
                },
                select: {
                    fecha_hora_entrada: true,
                    fecha_hora_salida: true,
                    Estado_Subprocesos: { select: { nombre_estado: true } },
                    Detalle_pedido: {
                        select: { Tipo_Producto: { select: { nombre_producto: true } } },
                    },
                },
            }),
        ]);

        return {
            stages: this.averageDurations(stages, (item) => item.Estado_Pedido?.nombre_etapa),
            subprocesses: this.averageDurations(
                subprocesses,
                (item) => item.Estado_Subprocesos?.nombre_estado,
                (item) => item.Detalle_pedido?.Tipo_Producto?.nombre_producto,
            ),
        };
    }

    async reportOrders({ start, end }) {
        return this.client.pedidos.findMany({
            where: { fecha_creacion: { gte: start, lt: end } },
            select: {
                id_pedido: true,
                numero_nota_venta: true,
                fecha_creacion: true,
                fecha_estimada_termino: true,
                Usuario: {
                    select: { nombre_usuario: true, apellido_usuario: true },
                },
                Detalle_pedido: {
                    select: {
                        cantidad: true,
                        fecha_estimada_termino: true,
                        fecha_real_termino: true,
                        Tipo_Producto: { select: { nombre_producto: true } },
                    },
                },
                Registros: {
                    select: {
                        FECHA_HORA: true,
                        Registro_Etapas: {
                            select: {
                                fecha_hora_entrada: true,
                                Estado_Pedido: { select: { nombre_etapa: true } },
                            },
                        },
                    },
                    orderBy: { FECHA_HORA: "asc" },
                },
            },
            orderBy: { fecha_creacion: "asc" },
        });
    }

    averageDurations(items, getName, getProductType = () => null) {
        const grouped = items.reduce((result, item) => {
            const name = getName(item);
            const productType = getProductType(item);
            if (!name || !item.fecha_hora_entrada || !item.fecha_hora_salida) return result;

            const groupKey = `${name}::${productType ?? ""}`;

            const seconds = Math.max(0, Math.round(
                (new Date(item.fecha_hora_salida) - new Date(item.fecha_hora_entrada)) / 1000,
            ));
            const current = result[groupKey] ?? { name, productType, totalSeconds: 0, sampleSize: 0 };
            result[groupKey] = {
                name: current.name,
                productType: current.productType,
                totalSeconds: current.totalSeconds + seconds,
                sampleSize: current.sampleSize + 1,
            };
            return result;
        }, {});

        return Object.values(grouped).map((value) => ({
            name: value.name,
            productType: value.productType,
            averageSeconds: Math.round(value.totalSeconds / value.sampleSize),
            sampleSize: value.sampleSize,
        }));
    }
}
