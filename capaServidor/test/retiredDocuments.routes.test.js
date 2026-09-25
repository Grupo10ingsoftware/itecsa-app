import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import Server from "../src/server.js";

test("el servidor no publica el antiguo repositorio PDF de notas de venta", async (t) => {
  const server = new Server().app.listen(0, "127.0.0.1");
  t.after(() => server.close());
  await once(server, "listening");

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/documents/nvs/Pedido1.pdf`,
  );

  assert.equal(response.status, 404);
  assert.doesNotMatch(response.headers.get("content-type") ?? "", /application\/pdf/);
});
