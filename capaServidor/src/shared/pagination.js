import { AppError } from "./appError.js";
import { createHmac, timingSafeEqual } from "node:crypto";

export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 100;

export function parseLimit(value, fallback = DEFAULT_PAGE_LIMIT) {
    if (value === undefined || value === null || value === "") return fallback;
    const limit = Number(value);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_LIMIT) {
        throw new AppError("INVALID_PAGE_LIMIT", `limit debe ser un entero entre 1 y ${MAX_PAGE_LIMIT}.`);
    }
    return limit;
}

export function encodeCursor(value) {
    const payload = Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
    const signature = createHmac("sha256", cursorSecret()).update(payload).digest("base64url");
    return `${payload}.${signature}`;
}

export function decodeCursor(value) {
    if (!value) return null;
    try {
        const [payload, signature, extra] = String(value).split(".");
        if (!payload || !signature || extra) throw new Error("invalid");
        const expected = createHmac("sha256", cursorSecret()).update(payload).digest("base64url");
        const receivedBuffer = Buffer.from(signature);
        const expectedBuffer = Buffer.from(expected);
        if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) throw new Error("invalid");
        const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        if (!decoded || !Number.isInteger(decoded.id) || decoded.id <= 0 || Object.keys(decoded).some((key) => key !== "id")) {
            throw new Error("invalid");
        }
        return decoded;
    } catch {
        throw new AppError("INVALID_CURSOR", "El cursor de paginacion no es valido.");
    }
}

function cursorSecret() {
    if (process.env.APP_ENV === "test") return "itecsa-test-cursor-secret";
    const secret = process.env.CURSOR_SECRET ?? process.env.RATE_LIMIT_SECRET;
    if (!secret) throw new Error("CURSOR_SECRET o RATE_LIMIT_SECRET debe estar configurado.");
    return secret;
}

export function pageResult(rows, limit, map = (row) => row) {
    const hasMore = rows.length > limit;
    const visibleRows = hasMore ? rows.slice(0, limit) : rows;
    const last = visibleRows.at(-1);
    return {
        items: visibleRows.map(map),
        pageInfo: {
            limit,
            nextCursor: hasMore && last ? encodeCursor({ id: Number(last.id_pedido ?? last.id) }) : null,
            hasMore,
        },
    };
}
