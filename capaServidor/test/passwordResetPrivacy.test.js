import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import { createPasswordResetRequestHandler } from "../src/modules/auth/controller/auth.controller.js";
import { Auth0ServiceError } from "../src/modules/users/service/auth0Management.service.js";

const EMAIL = "titular@example.test";
const ACCEPTED = {
    status: "accepted",
    message: "Si la cuenta está activa, enviaremos las instrucciones de recuperación al correo indicado.",
};
const scenarios = [
    { name: "cuenta inexistente", user: null, outcome: "not_registered", deliveries: 0 },
    { name: "cuenta desvinculada", user: { estadoUsuario: "Desvinculado" }, outcome: "disabled", deliveries: 0 },
    { name: "cuenta pendiente", user: { estadoUsuario: "Pendiente rol" }, outcome: "disabled", deliveries: 0 },
    { name: "cuenta activa", user: { estadoUsuario: "Activo" }, outcome: "sent", deliveries: 1 },
    { name: "fallo de Auth0", user: { estadoUsuario: "Activo" }, deliveryError: true, outcome: "delivery_error", deliveries: 1 },
    { name: "fallo de búsqueda", lookupError: true, outcome: "lookup_error", deliveries: 0 },
];

function dependencies(scenario, { logger = {}, elapsedMs = 125, random = () => 0.5 } = {}) {
    const state = { deliveries: 0, elapsedMs: 0, waits: [] };
    return {
        state,
        handler: createPasswordResetRequestHandler({
            users: {
                async findByEmail(email) {
                    assert.equal(email, EMAIL);
                    state.elapsedMs = elapsedMs;
                    if (scenario.lookupError) throw new Error(`detalle privado ${EMAIL}`);
                    return scenario.user;
                },
            },
            async requestPasswordEmail({ email }) {
                assert.equal(email, EMAIL);
                state.deliveries += 1;
                if (scenario.deliveryError) {
                    throw new Auth0ServiceError("AUTH0_PASSWORD_EMAIL_FAILED", `detalle privado ${EMAIL}`);
                }
            },
            logger,
            now: () => state.elapsedMs,
            random,
            async sleep(ms) {
                state.waits.push(ms);
                state.elapsedMs += ms;
            },
        }),
    };
}

test("P8: status, cuerpo y longitud HTTP indistinguibles en todos los resultados privados", async (t) => {
    const app = express();
    app.use(express.json());
    let currentHandler;
    app.post("/reset", (req, res) => currentHandler(req, res));
    const server = app.listen(0, "127.0.0.1");
    t.after(() => server.close());
    await once(server, "listening");
    let baseline;
    for (const scenario of scenarios) {
        const { handler, state } = dependencies(scenario);
        currentHandler = handler;
        const response = await fetch(`http://127.0.0.1:${server.address().port}/reset`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: `  ${EMAIL.toUpperCase()}  ` }),
        });
        const body = await response.text();
        const publicResponse = {
            status: response.status,
            contentType: response.headers.get("content-type"),
            length: response.headers.get("content-length"),
            body,
        };
        assert.equal(response.status, 202, scenario.name);
        assert.deepEqual(JSON.parse(body), ACCEPTED, scenario.name);
        baseline ??= publicResponse;
        assert.deepEqual(publicResponse, baseline, scenario.name);
        assert.equal(state.deliveries, scenario.deliveries, scenario.name);
    }
});

test("P8: espera homogénea con el mismo jitter para consultas y envíos dentro del piso temporal", async () => {
    for (const scenario of scenarios) {
        const { handler, state } = dependencies(scenario);
        const res = { status() { return this; }, json(body) { assert.deepEqual(body, ACCEPTED); } };
        await handler({ body: { email: EMAIL } }, res);
        assert.deepEqual(state.waits, [575], scenario.name);
        assert.equal(state.elapsedMs, 700, scenario.name);
    }
});

test("P8: un proveedor más lento que el piso temporal no añade otra espera", async () => {
    const { handler, state } = dependencies(scenarios[3], { elapsedMs: 1200 });
    await handler({ body: { email: EMAIL } }, { status() { return this; }, json() {} });
    assert.deepEqual(state.waits, []);
    assert.equal(state.elapsedMs, 1200);
});

test("P8: resultado real únicamente en telemetría sin correo ni detalle del error", async () => {
    for (const scenario of scenarios) {
        const entries = [];
        const logger = {
            info: (event, metadata) => entries.push({ event, metadata }),
            error: (event, metadata) => entries.push({ event, metadata }),
        };
        const { handler } = dependencies(scenario, { logger });
        await handler({ body: { email: EMAIL } }, { status() { return this; }, json(body) { assert.deepEqual(body, ACCEPTED); } });
        const entry = entries.find(({ event }) => event === "password_reset_request");
        assert.equal(entry.metadata.outcome, scenario.outcome, scenario.name);
        assert.ok(entry.metadata.correlationId);
        assert.equal(JSON.stringify(entries).includes(EMAIL), false);
        assert.equal(JSON.stringify(entries).includes("detalle privado"), false);
    }
});

test("P8: fallo de telemetría conserva respuesta y espera para cualquier cuenta", async () => {
    const logger = {
        info() { throw new Error("sink indisponible"); },
        error() { throw new Error("sink indisponible"); },
    };
    for (const scenario of scenarios) {
        const { handler, state } = dependencies(scenario, { logger });
        let status;
        await handler({ body: { email: EMAIL } }, {
            status(code) { status = code; return this; },
            json(body) { assert.deepEqual(body, ACCEPTED); },
        });
        assert.equal(status, 202, scenario.name);
        assert.equal(state.elapsedMs, 700, scenario.name);
    }
});
