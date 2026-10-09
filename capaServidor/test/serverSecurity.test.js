import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";

import Server from "../src/server.js";

test("produccion no monta rutas demo", async (t) => {
    const instance = new Server({ appEnvironment: "production", logger: { info() {}, error() {} } });
    const server = instance.app.listen(0);
    t.after(() => server.close());
    await once(server, "listening");
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/demo-orders`);
    assert.equal(response.status, 404);
    assert.equal((await response.json()).code, "NOT_FOUND");
});
