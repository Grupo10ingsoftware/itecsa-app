import assert from "node:assert/strict";
import { test } from "node:test";

import { AppError } from "../src/errors/AppError.js";
import ClientController from "../src/modules/clients/controller/clients.controller.js";
import ClientService from "../src/modules/clients/service/clients.service.js";

test("createClient propagates repository failures unchanged", async () => {
  const repositoryError = Object.assign(new Error("database details"), {
    code: "P2022",
  });
  const service = new ClientService({
    repo: {
      async create() {
        throw repositoryError;
      },
    },
  });

  await assert.rejects(
    () => service.createClient({ rut_cliente: "12345678-9" }),
    (error) => error === repositoryError,
  );
});

test("getClient reports a missing client as a typed 404", async () => {
  const service = new ClientService({ repo: { async get() { return null; } } });

  await assert.rejects(() => service.getClient(42), (error) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.statusCode, 404);
    assert.equal(error.code, "NOT_FOUND");
    assert.equal(error.message, "Cliente no encontrado");
    return true;
  });
});

test("getClient uses the shared validation error response when the ID is missing", async () => {
  const controller = new ClientController();
  controller.service = { async getClient() { assert.fail("service must not run"); } };
  const req = {
    params: {},
    method: "GET",
    route: { path: "/:id_cliente" },
    app: { locals: { errorLogger: { error() {} } } },
  };
  const res = {
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    setHeader() {},
  };

  await controller.getClient(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, "VALIDATION_ERROR");
  assert.equal(res.body.message, "El ID del cliente es obligatorio");
});