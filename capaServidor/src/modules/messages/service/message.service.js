import { AppError } from "../../../errors/AppError.js";
import MessageRepository from "../repo/message.repo.js";
import { UserRepository } from "../../users/repo/users.repo.js";

const VALID_STATUSES = new Set(["all", "read", "unread"]);
const VALID_SORTS = new Set(["latest", "oldest"]);

function createHttpError(statusCode, message) {
    const error = new AppError(statusCode, message);
    return error;
}

function parsePositiveInteger(value, fieldName) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw createHttpError(400, `${fieldName} debe ser un entero positivo.`);
    }

    return parsed;
}

function parseDate(value, fieldName, endOfDay = false) {
    if (!value) return undefined;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw createHttpError(400, `${fieldName} no contiene una fecha valida.`);
    }

    if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        date.setUTCHours(23, 59, 59, 999);
    }

    return date;
}

class MessageService {
    constructor({ repo, userRepo } = {}) {
        this.repo = repo ?? new MessageRepository();
        this.userRepo = userRepo ?? new UserRepository();
    }

    async resolveUser(auth0UserId) {
        if (!auth0UserId) {
            throw createHttpError(401, "No se pudo identificar al usuario.");
        }

        const user = await this.userRepo.findByAuth0Id(auth0UserId);

        if (!user) {
            throw createHttpError(404, "Usuario interno no encontrado.");
        }

        return user;
    }

    async getInbox(auth0UserId, query = {}) {
        const user = await this.resolveUser(auth0UserId);
        const status = query.status ?? "all";
        const sort = query.sort ?? "latest";

        if (!VALID_STATUSES.has(status)) {
            throw createHttpError(400, "status debe ser all, read o unread.");
        }

        if (!VALID_SORTS.has(sort)) {
            throw createHttpError(400, "sort debe ser latest u oldest.");
        }

        const page = query.page ? parsePositiveInteger(query.page, "page") : 1;
        const requestedPerPage = query.perPage
            ? parsePositiveInteger(query.perPage, "perPage")
            : 20;
        const perPage = Math.min(requestedPerPage, 100);
        const from = parseDate(query.from, "from");
        const to = parseDate(query.to, "to", true);

        if (from && to && from > to) {
            throw createHttpError(400, "La fecha inicial no puede ser posterior a la final.");
        }

        return this.repo.listInbox({
            userId: user.idUsuario,
            status,
            sort,
            from,
            to,
            page,
            perPage,
        });
    }

    async getNotifications(auth0UserId, query = {}) {
        const user = await this.resolveUser(auth0UserId);
        const requestedLimit = query.limit
            ? parsePositiveInteger(query.limit, "limit")
            : 10;
        const limit = Math.min(requestedLimit, 50);

        const [notifications, unreadCount] = await Promise.all([
            this.repo.listNotifications(user.idUsuario, limit),
            this.repo.countUnreadNotifications(user.idUsuario),
        ]);

        return {
            notifications,
            unreadCount,
        };
    }

    async getMessage(auth0UserId, messageId) {
        const user = await this.resolveUser(auth0UserId);
        const parsedMessageId = parsePositiveInteger(messageId, "messageId");
        const message = await this.repo.findUserMessage(user.idUsuario, parsedMessageId);

        if (!message) {
            throw createHttpError(404, "Mensaje no encontrado.");
        }

        return message;
    }

    async markAsRead(auth0UserId, messageId) {
        const user = await this.resolveUser(auth0UserId);
        const parsedMessageId = parsePositiveInteger(messageId, "messageId");
        const current = await this.repo.findUserMessage(user.idUsuario, parsedMessageId);

        if (!current) {
            throw createHttpError(404, "Mensaje no encontrado.");
        }

        if (current.leido) {
            return current;
        }

        return this.repo.markAsRead(user.idUsuario, parsedMessageId);
    }

    async hideNotification(auth0UserId, messageId) {
        const user = await this.resolveUser(auth0UserId);
        const parsedMessageId = parsePositiveInteger(messageId, "messageId");
        const current = await this.repo.findUserMessage(user.idUsuario, parsedMessageId);

        if (!current) {
            throw createHttpError(404, "Notificacion no encontrada.");
        }

        if (current.oculto) {
            return current;
        }

        return this.repo.hideNotification(user.idUsuario, parsedMessageId);
    }

    async clearNotifications(auth0UserId) {
        const user = await this.resolveUser(auth0UserId);
        const result = await this.repo.hideAllNotifications(user.idUsuario);

        return {
            hiddenCount: result.count,
        };
    }

    async createMessage({ orderId = null, contenido, asunto, recipientUserIds, fechaPublicacion }) {
        if (typeof contenido !== "string" || !contenido.trim()) {
            throw createHttpError(400, "El contenido del mensaje es obligatorio.");
        }

        if (typeof asunto !== "string" || !asunto.trim()) {
            throw createHttpError(400, "El asunto del mensaje es obligatorio.");
        }

        if (!Array.isArray(recipientUserIds) || recipientUserIds.length === 0) {
            throw createHttpError(400, "El mensaje debe tener al menos un destinatario.");
        }

        const normalizedUserIds = [
            ...new Set(
                recipientUserIds.map((userId) => parsePositiveInteger(userId, "recipientUserId")),
            ),
        ];
        const normalizedOrderId =
            orderId === null || orderId === undefined
                ? null
                : parsePositiveInteger(orderId, "orderId");
        const normalizedDate = fechaPublicacion
            ? parseDate(fechaPublicacion, "fechaPublicacion")
            : new Date();

        return this.repo.create({
            orderId: normalizedOrderId,
            contenido: contenido.trim(),
            asunto: asunto.trim(),
            recipientUserIds: normalizedUserIds,
            fechaPublicacion: normalizedDate,
        });
    }
}

export default MessageService;
