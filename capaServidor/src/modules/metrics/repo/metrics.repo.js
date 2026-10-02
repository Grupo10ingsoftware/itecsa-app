import getPrismaClient from "../../../database/prisma.js";

export default class MetricsRepository {
    constructor({ prisma } = {}) {
        this.prisma = prisma;
    }

    get client() {
        if (!this.prisma) this.prisma = getPrismaClient();
        return this.prisma;
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
