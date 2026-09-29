import assert from "node:assert/strict";
import { test } from "node:test";
import { EventEmitter } from "node:events";

import MetricsService from "../src/modules/metrics/service/metrics.service.js";
import OrderService from "../src/modules/orders/service/order.service.js";
import { createLineSnapshots, salesNoteLineIdentity } from "../src/modules/orders/service/salesOrder.snapshot.js";
import { decodeCursor, encodeCursor, parseLimit } from "../src/shared/pagination.js";
import { createSupportAudit } from "../src/middlewares/supportAudit.js";
import { TemporaryDataCleanupService } from "../src/modules/security/service/temporaryDataCleanup.service.js";
import {
    MemoryThrottleService,
    SecurityThrottleService,
    createDefaultThrottle,
} from "../src/modules/security/service/securityThrottle.service.js";

test("desarrollo no depende de DDL pendiente y producción conserva cuotas persistentes", () => {
    assert.ok(createDefaultThrottle("development") instanceof MemoryThrottleService);
    assert.ok(createDefaultThrottle("test") instanceof MemoryThrottleService);
    assert.ok(createDefaultThrottle("production") instanceof SecurityThrottleService);
});

test("cursores son opacos, estrictos y los limites no superan 100", () => {
    const cursor = encodeCursor({ id: 42 });
    assert.doesNotMatch(cursor, /42/);
    assert.deepEqual(decodeCursor(cursor), { id: 42 });
    assert.equal(parseLimit(undefined), 50);
    assert.equal(parseLimit("100"), 100);
    assert.throws(() => parseLimit("101"), { code: "INVALID_PAGE_LIMIT" });
    assert.throws(() => decodeCursor("no-es-cursor"), { code: "INVALID_CURSOR" });
    assert.throws(() => decodeCursor(`${cursor.slice(0, -1)}x`), { code: "INVALID_CURSOR" });
    assert.throws(() => decodeCursor(encodeCursor({ id: 42, injected: true })), { code: "INVALID_CURSOR" });
});

test("Orders aplica filtros de servidor y pagina de forma estable", async () => {
    let filters;
    const service = new OrderService({
        repo: {
            async getAllOrders(received) {
                filters = received;
                return [{ id_pedido: 9 }, { id_pedido: 8 }, { id_pedido: 7 }];
            },
        },
    });
    const result = await service.getAllOrders({
        limit: "2",
        cursor: encodeCursor({ id: 10 }),
        status: "En produccion",
        search: "NV-123",
        productType: "Lanyard",
        from: "2026-09-01",
        to: "2026-09-30",
    });
    assert.equal(filters.limit, 2);
    assert.deepEqual(filters.cursor, { id: 10 });
    assert.equal(filters.status, "En produccion");
    assert.equal(filters.search, "NV-123");
    assert.equal(filters.productType, "Lanyard");
    assert.equal(filters.from.toISOString(), "2026-09-01T00:00:00.000Z");
    assert.equal(filters.to.toISOString(), "2026-10-01T00:00:00.000Z");
    assert.deepEqual(result.items.map((item) => item.id_pedido), [9, 8]);
    assert.equal(result.pageInfo.hasMore, true);
    assert.deepEqual(decodeCursor(result.pageInfo.nextCursor), { id: 8 });
});

test("metricas rechaza periodos mayores a 366 dias antes de consultar SQL", async () => {
    let calls = 0;
    const repo = {
        async production() { calls += 1; },
        async dwellTime() { calls += 1; },
        async reportOrders() { calls += 1; },
    };
    const service = new MetricsService({ repo });
    await assert.rejects(
        service.summary({ from: "2025-01-01", to: "2026-01-02" }),
        { statusCode: 400 },
    );
    assert.equal(calls, 0);
});

test("la identidad de linea no depende de la posicion y detecta ambiguedad", () => {
    const first = { codigo: "SKU-A", producto: "A", cantidad: 10, tipoProducto: "Lanyard" };
    const second = { codigo: "SKU-B", producto: "B", cantidad: 20, tipoProducto: "Tarjeta" };
    const original = createLineSnapshots([first, second]);
    const reordered = createLineSnapshots([second, first]);
    assert.equal(original[0].linea_origen, reordered[1].linea_origen);
    assert.equal(original[1].linea_origen, reordered[0].linea_origen);
    assert.equal(salesNoteLineIdentity(first), salesNoteLineIdentity({ ...first, cantidad: 999 }));
    assert.equal(new Set([first, { ...first }].map(salesNoteLineIdentity)).size, 1);
});

test("Soporte conserva capacidades pero cada solicitud genera auditoria reforzada", async () => {
    const events = [];
    const middleware = createSupportAudit({
        repository: { async record(event) { events.push(event); } },
        logger: { error() {} },
    });
    const req = {
        method: "PATCH",
        baseUrl: "/api/orders",
        path: "/8/move",
        params: { orderId: "8" },
        requestId: "request-support",
        currentUser: { idUsuario: 99, rolUsuario: "Soporte" },
    };
    const res = new EventEmitter();
    res.statusCode = 200;
    let continued = false;
    middleware(req, res, () => { continued = true; });
    res.emit("finish");
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(continued, true);
    assert.deepEqual(events, [{
        eventType: "support.request",
        actorUserId: 99,
        action: "PATCH /api/orders",
        resourceType: "http_request",
        resourceId: "8",
        requestId: "request-support",
        outcome: "allowed",
        reasonCode: "HTTP_200",
    }]);
});

test("una denegacion administrativa sin identidad se audita sin romper la respuesta", async () => {
    const events = [];
    const middleware = createSupportAudit({
        repository: { async record(event) { events.push(event); } },
        logger: { error() {} },
    });
    const req = {
        method: "POST",
        originalUrl: "/api/admin/users",
        baseUrl: "/api/admin",
        path: "/users",
        params: {},
        requestId: "request-denied",
    };
    const res = new EventEmitter();
    res.statusCode = 401;
    middleware(req, res, () => {});
    res.emit("finish");
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(events.length, 1);
    assert.equal(events[0].actorUserId, null);
    assert.equal(events[0].outcome, "denied");
    assert.equal(events[0].reasonCode, "HTTP_401");
});

test("la limpieza automatica elimina sólo cuotas vencidas y caché temporal", async () => {
    const now = new Date("2026-09-26T12:00:00.000Z");
    let where;
    let cacheCleared = false;
    const service = new TemporaryDataCleanupService({
        now: () => now,
        prisma: {
            securityThrottle: {
                async deleteMany(query) {
                    where = query.where;
                    return { count: 4 };
                },
            },
        },
        salesNotes: { clearExpired() { cacheCleared = true; } },
    });
    assert.deepEqual(await service.run(), { throttles: 4 });
    assert.deepEqual(where, { expires_at: { lte: now } });
    assert.equal(cacheCleared, true);
});
