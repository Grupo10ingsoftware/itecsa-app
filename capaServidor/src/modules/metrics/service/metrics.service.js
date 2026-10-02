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

export default class MetricsService {
    constructor({ repo } = {}) {
        this.repo = repo ?? new MetricsRepository();
    }

    async summary({ from, to }) {
        const range = dateRange(from, to);
        const [totals, dwellTime] = await Promise.all([
            this.repo.production(range),
            this.repo.dwellTime(range),
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
        };
    }
}
