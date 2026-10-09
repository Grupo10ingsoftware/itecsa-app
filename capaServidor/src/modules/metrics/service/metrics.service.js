import { AppError } from "../../../errors/AppError.js";
import MetricsRepository from "../repo/metrics.repo.js";

function httpError(statusCode, message) {
    const error = new AppError(statusCode, message);
    return error;
}

function dateRange(from, to) {
    const parse = (value, field) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ""))) {
            throw httpError(400, `${field} debe tener formato YYYY-MM-DD.`);
        }
        const date = new Date(`${value}T00:00:00.000Z`);
        if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw httpError(400, `${field} no es una fecha valida.`);
        return date;
    };

    const start = parse(from, "from");
    const selectedEnd = parse(to, "to");
    if (start > selectedEnd) throw httpError(400, "from no puede ser posterior a to.");
    const rangeDays = Math.floor((selectedEnd - start) / (24 * 60 * 60 * 1000)) + 1;
    if (rangeDays > 366) throw httpError(400, "El intervalo de metricas no puede superar 366 dias.");

    return { start, end: new Date(selectedEnd.getTime() + 24 * 60 * 60 * 1000) };
}

function sellerName(user) {
    return [user?.nombre_usuario, user?.apellido_usuario].filter(Boolean).join(" ") || "Sin vendedor";
}

function latestDate(values) {
    return values.filter(Boolean).map((value) => new Date(value)).sort((left, right) => right - left)[0] ?? null;
}

function buildSellerCompliance(orders) {
    const highLoadByDate = new Map();
    for (const order of orders) {
        const dueDate = order.fecha_estimada_termino?.toISOString().slice(0, 10);
        const lanyardQuantity = order.Detalle_pedido
            .filter((detail) => String(detail.Tipo_Producto?.nombre_producto ?? "").toLowerCase().includes("lanyard"))
            .reduce((sum, detail) => sum + Number(detail.cantidad ?? 0), 0);
        if (dueDate) highLoadByDate.set(dueDate, (highLoadByDate.get(dueDate) ?? 0) + lanyardQuantity);
    }

    const sellers = new Map();
    for (const order of orders) {
        const name = sellerName(order.Usuario);
        const current = sellers.get(name) ?? {
            seller: name,
            salesNotes: 0,
            deliveredOnTime: 0,
            deliveredLate: 0,
            enteredDuringHighLoad: 0,
        };
        const completedAt = latestDate(order.Detalle_pedido.map((detail) => detail.fecha_real_termino));
        const expectedAt = latestDate([
            order.fecha_estimada_termino,
            ...order.Detalle_pedido.map((detail) => detail.fecha_estimada_termino),
        ]);
        const delivered = order.Detalle_pedido.length > 0 && order.Detalle_pedido.every((detail) => detail.fecha_real_termino);
        const dueDate = expectedAt?.toISOString().slice(0, 10);

        current.salesNotes += 1;
        if (delivered && completedAt && expectedAt) {
            if (completedAt <= expectedAt) current.deliveredOnTime += 1;
            else current.deliveredLate += 1;
        }
        if (dueDate && (highLoadByDate.get(dueDate) ?? 0) > 900) current.enteredDuringHighLoad += 1;
        sellers.set(name, current);
    }

    return [...sellers.values()];
}

function buildFlowTime(orders) {
    return orders.map((order) => {
        const readyEvent = order.Registros.find((record) => record.Registro_Etapas?.Estado_Pedido?.nombre_etapa === "Listo para entrega");
        const start = order.fecha_creacion ? new Date(order.fecha_creacion) : null;
        const end = readyEvent?.Registro_Etapas?.fecha_hora_entrada
            ? new Date(readyEvent.Registro_Etapas.fecha_hora_entrada)
            : null;

        return {
            orderId: order.id_pedido,
            salesNoteNumber: order.numero_nota_venta,
            seller: sellerName(order.Usuario),
            createdAt: order.fecha_creacion,
            readyForDeliveryAt: end,
            durationSeconds: start && end ? Math.max(0, Math.round((end - start) / 1000)) : null,
        };
    });
}

export default class MetricsService {
    constructor({ repo } = {}) {
        this.repo = repo ?? new MetricsRepository();
    }

    async productionPerformance({ from, to }) {
        const range = dateRange(from, to);
        const orders = await this.repo.performanceOrders(range);
        const dayFormatter = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit",
        });
        const result = {
            period: { from, to },
            totalOrders: 0, deliveredOnTime: 0, deliveredLate: 0, missingDeadline: 0,
        };
        for (const order of orders) {
            const entry = order.Registros[0]?.Registro_Etapas?.fecha_hora_entrada;
            if (!entry) continue;
            const parts = Object.fromEntries(dayFormatter.formatToParts(new Date(entry)).map(({ type, value }) => [type, value]));
            const readyDay = `${parts.year}-${parts.month}-${parts.day}`;
            if (readyDay < from || readyDay > to) continue;
            result.totalOrders += 1;
            // The requested deadline is SQL DATE, not a UTC timestamp to shift to Chile.
            const dueDay = order.fecha_estimada_termino?.toISOString().slice(0, 10);
            if (!dueDay) result.missingDeadline += 1;
            else if (readyDay <= dueDay) result.deliveredOnTime += 1;
            else result.deliveredLate += 1;
        }
        return result;
    }

    async summary({ from, to }) {
        const range = dateRange(from, to);
        const [totals, dwellTime, orders] = await Promise.all([
            this.repo.production(range),
            this.repo.dwellTime(range),
            this.repo.reportOrders(range),
        ]);
        const products = Object.entries(totals).map(([productType, quantity]) => ({
            productType,
            quantity,
        }));

        return {
            period: { from, to },
            production: {
                total: products.reduce((sum, product) => sum + product.quantity, 0),
                products,
            },
            dwellTime,
            sellerCompliance: buildSellerCompliance(orders),
            flowTime: buildFlowTime(orders),
        };
    }
}
