import { payloadFor } from "./authorization.fixture.js";
import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import { createOrderHistoryRouter } from "../src/modules/history/routes/orderHistory.routes.js";

test("protege listado y detalle con checkJwt", async (t) => {
    const calls = [];
    const router = createOrderHistoryRouter({
        authenticate(req, res, next) {
            req.auth = {payload:payloadFor()};
            calls.push("checkJwt");
            next();
        },
        controller: {
            listOrders(req, res) {
                calls.push("listOrders");
                res.status(200).json({ orders: [] });
            },
            getOrderHistory(req, res) {
                calls.push(`getOrderHistory:${req.params.orderId}`);
                res.status(200).json({ id: Number(req.params.orderId) });
            },
            listOrderEvents(req, res) {
                calls.push(`listOrderEvents:${req.params.orderId}`);
                res.status(200).json({ events: [] });
            },
        },
    });
    const app = express();
    app.use("/api/history", router);
    const server = app.listen(0);
    t.after(() => server.close());
    await once(server, "listening");

    let response = await fetch(`http://127.0.0.1:${server.address().port}/api/history/orders`);
    assert.equal(response.status, 200);
    response = await fetch(`http://127.0.0.1:${server.address().port}/api/history/orders/9`);
    assert.equal(response.status, 200);
    response = await fetch(`http://127.0.0.1:${server.address().port}/api/history/orders/9/events`);
    assert.equal(response.status, 200);
    assert.deepEqual(calls, ["checkJwt", "listOrders", "checkJwt", "getOrderHistory:9", "checkJwt", "listOrderEvents:9"]);
});
