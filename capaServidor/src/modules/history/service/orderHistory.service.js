import OrderHistoryRepository from "../repo/orderHistory.repo.js";

const EVENT_TYPES = new Set(["all", "stage", "payment", "subprocess", "general"]);

function httpError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function positiveInteger(value, fallback, field) {
    if (value === undefined || value === null || value === "") return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw httpError(400, `${field} debe ser un entero positivo.`);
    }
    return parsed;
}

function dateRangeFromSearch(search) {
    const match = String(search ?? "").trim().match(/^(\d{2})-(\d{2})-(\d{4})$|^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const year = Number(match[3] ?? match[4]);
    const month = Number(match[2] ?? match[5]);
    const day = Number(match[1] ?? match[6]);
    const start = new Date(Date.UTC(year, month - 1, day));

    if (
        start.getUTCFullYear() !== year ||
        start.getUTCMonth() !== month - 1 ||
        start.getUTCDate() !== day
    ) return null;

    return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

function dateRangeFromQuery(from, to) {
    if (!from && !to) return null;
    const parse = (value, field) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ""))) {
            throw httpError(400, `${field} debe tener formato YYYY-MM-DD.`);
        }
        const date = new Date(`${value}T00:00:00.000Z`);
        if (Number.isNaN(date.getTime())) throw httpError(400, `${field} no es una fecha valida.`);
        return date;
    };
    const start = from ? parse(from, "from") : undefined;
    const selectedEnd = to ? parse(to, "to") : undefined;
    if (start && selectedEnd && start > selectedEnd) {
        throw httpError(400, "La fecha desde no puede ser posterior a la fecha hasta.");
    }
    return {
        start,
        end: selectedEnd ? new Date(selectedEnd.getTime() + 24 * 60 * 60 * 1000) : undefined,
    };
}

function personName(user) {
    if (!user) return null;
    return [user.nombre_usuario, user.apellido_usuario].filter(Boolean).join(" ") || user.correo_usuario;
}

function mapSummary(order) {
    return {
        id: order.id_pedido,
        salesNoteNumber: order.numero_nota_venta,
        clientRut: order.Cliente?.rut_cliente ?? null,
        clientName: order.Cliente?.nombre_cliente ?? order.Cliente?.razon_social ?? null,
        status: order.Estado_Pedido?.nombre_etapa ?? null,
        createdAt: order.fecha_creacion,
    };
}

function mapEvent(record) {
    const base = {
        id: record.ID_REGISTRO,
        occurredAt: record.FECHA_HORA,
        responsible: personName(record.Usuario),
        responsibleUserId: record.id_usuario,
        description: record.observacion ?? null,
    };

    if (record.Registro_Etapas) {
        const detail = record.Registro_Etapas;
        const enteredAt = detail.fecha_hora_entrada;
        const exitedAt = detail.fecha_hora_salida;
        const elapsedUntil = exitedAt ?? new Date();
        return {
            ...base,
            type: "stage",
            typeLabel: "Etapa general",
            title: detail.Estado_Pedido?.nombre_etapa ?? "Cambio de etapa",
            enteredAt,
            exitedAt,
            durationSeconds: enteredAt
                ? Math.max(0, Math.round((new Date(elapsedUntil) - new Date(enteredAt)) / 1000))
                : null,
            isOngoing: !exitedAt,
        };
    }

    if (record.Registro_Pago) {
        const detail = record.Registro_Pago;
        const previous = detail.Estado_Pago_Registro_Pago_id_estado_pago_anteriorToEstado_Pago?.nombre_estado_pago;
        const next = detail.Estado_Pago_Registro_Pago_id_estado_pago_nuevoToEstado_Pago?.nombre_estado_pago;
        return {
            ...base,
            type: "payment",
            typeLabel: "Pago",
            title: next ? `Estado de pago: ${next}` : "Actualizacion de pago",
            description: record.observacion ?? detail.observacion ?? null,
            previousStatus: previous ?? null,
            nextStatus: next ?? null,
        };
    }

    if (record.registro_subprocesos) {
        const detail = record.registro_subprocesos;
        const enteredAt = detail.fecha_hora_entrada;
        const exitedAt = detail.fecha_hora_salida;
        return {
            ...base,
            type: "subprocess",
            typeLabel: "Subproceso",
            title: detail.Estado_Subprocesos?.nombre_estado ?? "Cambio de subproceso",
            description: record.observacion ?? null,
            productType: detail.Detalle_pedido?.Tipo_Producto?.nombre_producto ?? null,
            enteredAt,
            exitedAt,
            durationSeconds: enteredAt && exitedAt
                ? Math.max(0, Math.round((new Date(exitedAt) - new Date(enteredAt)) / 1000))
                : null,
        };
    }

    return { ...base, type: "general", typeLabel: "General", title: "Actividad del pedido" };
}

function mapDetail(order, requestedType) {
    const trackedItems = order.Detalle_pedido.map((detail) => ({
        id: detail.id_detalle_pedido,
        productType: detail.Tipo_Producto?.nombre_producto ?? null,
        quantity: detail.cantidad,
        subprocessStatus: detail.Estado_Subprocesos?.nombre_estado ?? null,
        estimatedCompletionAt: detail.fecha_estimada_termino,
        completedAt: detail.fecha_real_termino,
    }));
    const untrackedItems = order.Pedido_Item_Sin_Seguimiento.map((item) => ({
        id: `untracked-${item.id_item_sin_seguimiento}`,
        productType: item.producto,
        quantity: item.cantidad,
        subprocessStatus: null,
        estimatedCompletionAt: null,
        completedAt: null,
    }));
    const allEvents = order.Registros.map(mapEvent);

    return {
        id: order.id_pedido,
        salesNoteNumber: order.numero_nota_venta,
        createdAt: order.fecha_creacion,
        estimatedCompletionAt: order.fecha_estimada_termino,
        status: order.Estado_Pedido?.nombre_etapa ?? null,
        paymentStatus: order.Estado_Pago?.nombre_estado_pago ?? null,
        client: {
            name: order.Cliente?.nombre_cliente ?? order.Cliente?.razon_social ?? null,
            rut: order.Cliente?.rut_cliente ?? null,
            businessName: order.Cliente?.razon_social ?? null,
        },
        seller: {
            id: order.Usuario?.id_usuario ?? null,
            name: personName(order.Usuario),
            email: order.Usuario?.correo_usuario ?? null,
        },
        observations: {
            general: order.observacion,
            source: order.observacion_origen,
            internal: order.observacion_interna,
        },
        managerSourceUser: order.usuario_manager_origen,
        labels: order.Pedido_Etiqueta.map((item) => item.etiqueta?.nombre_etiqueta).filter(Boolean),
        items: [...trackedItems, ...untrackedItems],
        availableEventTypes: [...new Set(allEvents.map((event) => event.type))],
        events: requestedType === "all"
            ? allEvents
            : allEvents.filter((event) => event.type === requestedType),
    };
}

export default class OrderHistoryService {
    constructor({ repo } = {}) {
        this.repo = repo ?? new OrderHistoryRepository();
    }

    async listOrders(query = {}) {
        const page = positiveInteger(query.page, 1, "page");
        const perPage = Math.min(positiveInteger(query.perPage, 20, "perPage"), 100);
        const status = String(query.status ?? "").trim();
        const search = String(query.search ?? "").trim();
        const selectedDateRange = dateRangeFromQuery(query.from, query.to);
        const { orders, total } = await this.repo.list({
            status: status || null,
            search: search || null,
            dateRange: selectedDateRange ?? dateRangeFromSearch(search),
            page,
            perPage,
        });

        return {
            orders: orders.map(mapSummary),
            total,
            page,
            perPage,
            totalPages: Math.ceil(total / perPage),
        };
    }

    async getOrderHistory(orderId, query = {}) {
        const parsedId = positiveInteger(orderId, null, "orderId");
        const type = String(query.type ?? "all").trim().toLowerCase();
        if (!EVENT_TYPES.has(type)) {
            throw httpError(400, "type debe ser all, stage, payment, subprocess o general.");
        }

        const order = await this.repo.getById(parsedId);
        if (!order) throw httpError(404, "Pedido no encontrado.");
        return mapDetail(order, type);
    }
}
