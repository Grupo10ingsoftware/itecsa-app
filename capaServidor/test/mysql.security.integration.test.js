import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import getPrismaClient, { disconnectPrismaClient } from "../src/database/prisma.js";
import SecurityAuditRepository from "../src/modules/security/repo/securityAudit.repo.js";
import { SecurityThrottleService } from "../src/modules/security/service/securityThrottle.service.js";

const enabled = process.env.RUN_MYSQL_INTEGRATION === "true";
const auth0Id = "auth0|mysql-security-integration";
const email = "mysql-security-integration@example.invalid";
let prisma;
let user;

before(async () => {
    if (!enabled) return;
    prisma = getPrismaClient();
    await prisma.usuario.deleteMany({ where: { id_auth0: auth0Id } });
    user = await prisma.usuario.create({
        data: {
            id_auth0: auth0Id,
            correo_usuario: email,
            estado_usuario: "Activo",
            rol_usuario: "Soporte",
        },
    });
});

after(async () => {
    if (!enabled) return;
    await prisma.securityThrottle.deleteMany({ where: { scope: { startsWith: "integration-" } } });
    await prisma.usuario.deleteMany({ where: { id_auth0: auth0Id } });
    await disconnectPrismaClient();
});

test("MySQL serializa cuotas persistentes concurrentes", { skip: !enabled }, async () => {
    const throttle = new SecurityThrottleService({
        prisma,
        secret: Buffer.alloc(32, 4).toString("base64"),
    });
    const outcomes = await Promise.allSettled(Array.from({ length: 5 }, () => throttle.consume({
        scope: "integration-concurrency",
        subject: "actor-1",
        limit: 3,
        windowMs: 60_000,
    })));
    assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 3);
    assert.equal(outcomes.filter((outcome) => outcome.status === "rejected").length, 2);
    const row = await prisma.securityThrottle.findFirst({ where: { scope: "integration-concurrency" } });
    assert.equal(row.request_count, 5);
});

test("MySQL revierte el evento de seguridad junto con el cambio de negocio", { skip: !enabled }, async () => {
    const audit = new SecurityAuditRepository({ prisma });
    const requestId = "00000000-0000-4000-8000-000000000001";
    await assert.rejects(prisma.$transaction(async (tx) => {
        await audit.record({
            eventType: "integration.rollback",
            actorUserId: user.id_usuario,
            action: "test",
            resourceType: "user",
            resourceId: String(user.id_usuario),
            requestId,
            outcome: "allowed",
        }, { client: tx });
        throw new Error("force rollback");
    }), /force rollback/);
    assert.equal(await prisma.securityAuditEvent.count({ where: { request_id: requestId } }), 0);
});
