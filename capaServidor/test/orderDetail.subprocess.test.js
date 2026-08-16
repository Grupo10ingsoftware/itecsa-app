import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import { createOrderDetailRouter } from "../src/modules/orders/routes/orderDetail.routes.js";
import OrderDetailService from "../src/modules/orders/service/orderDetail.service.js";

function createTestApp(router) {
  const app = express();
  app.use(express.json());
  app.use("/api/order-details", router);
  return app;
}

async function listen(app, t) {
  const server = app.listen(0);
  t.after(() => server.close());
  await once(server, "listening");
  return server;
}

test("POST complete subprocess monta checkJwt antes del controlador", async (t) => {
  const calls = [];
  const app = createTestApp(
    createOrderDetailRouter({
      authenticate(req, res, next) {
        calls.push("checkJwt");
        req.auth = { payload: { sub: "auth0|operator" } };
        next();
      },
      controller: {
        getDetailsByOrderId(req, res) {
          return res.status(200).json([]);
        },
        getOrderDetail(req, res) {
          return res.status(200).json({});
        },
        postOrderDetail(req, res) {
          return res.status(201).json({});
        },
        completeSubprocess(req, res) {
          calls.push("completeSubprocess");
          return res.status(201).json({
            detailId: req.params.detailId,
            subprocessId: req.params.subprocessId,
            comment: req.body.comment,
            auth0UserId: req.auth.payload.sub,
          });
        },
      },
    }),
  );
  const server = await listen(app, t);

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/order-details/10/subprocesses/3/complete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment: "Revision terminada" }),
    },
  );
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.deepEqual(calls, ["checkJwt", "completeSubprocess"]);
  assert.deepEqual(body, {
    detailId: "10",
    subprocessId: "3",
    comment: "Revision terminada",
    auth0UserId: "auth0|operator",
  });
});

test("completeSubprocess resuelve usuario interno desde Auth0", async () => {
  const calls = [];
  const service = new OrderDetailService({
    userRepo: {
      async findByAuth0Id(auth0UserId) {
        calls.push(["findByAuth0Id", auth0UserId]);
        return { idUsuario: 42 };
      },
    },
    repo: {
      async completeSubprocess(detailId, subprocessId, data) {
        calls.push(["completeSubprocess", detailId, subprocessId, data]);
        return { record: { id_registro_subproceso: 7 }, comment: null };
      },
    },
  });

  const result = await service.completeSubprocess(10, 3, {
    auth0UserId: "auth0|operator",
    comment: "Listo",
  });

  assert.deepEqual(result, {
    record: { id_registro_subproceso: 7 },
    comment: null,
  });
  assert.deepEqual(calls, [
    ["findByAuth0Id", "auth0|operator"],
    [
      "completeSubprocess",
      10,
      3,
      {
        id_usuario: 42,
        comment: "Listo",
      },
    ],
  ]);
});

test("completeSubprocess rechaza si no hay usuario interno vinculado", async () => {
  const service = new OrderDetailService({
    userRepo: {
      async findByAuth0Id() {
        return null;
      },
    },
    repo: {
      async completeSubprocess() {
        throw new Error("No deberia llamarse");
      },
    },
  });

  await assert.rejects(
    () => service.completeSubprocess(10, 3, { auth0UserId: "auth0|missing" }),
    {
      statusCode: 403,
      message: "No existe un usuario interno vinculado a la sesion.",
    },
  );
});
