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
                },
            }),
        ]);

        return {
            stages: this.averageDurations(stages, (item) => item.Estado_Pedido?.nombre_etapa),
            subprocesses: this.averageDurations(subprocesses, (item) => item.Estado_Subprocesos?.nombre_estado),
        };
    }

    averageDurations(items, getName) {
        const grouped = items.reduce((result, item) => {
            const name = getName(item);
            if (!name || !item.fecha_hora_entrada || !item.fecha_hora_salida) return result;

            const seconds = Math.max(0, Math.round(
                (new Date(item.fecha_hora_salida) - new Date(item.fecha_hora_entrada)) / 1000,
            ));
            const current = result[name] ?? { totalSeconds: 0, sampleSize: 0 };
            result[name] = {
                totalSeconds: current.totalSeconds + seconds,
                sampleSize: current.sampleSize + 1,
            };
            return result;
        }, {});

        return Object.entries(grouped).map(([name, value]) => ({
            name,
            averageSeconds: Math.round(value.totalSeconds / value.sampleSize),
            sampleSize: value.sampleSize,
        }));
    }
}