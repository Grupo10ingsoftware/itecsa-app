import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import Server from '../src/server.js';

test('proxy local ignora X-Forwarded-For; un salto confia solo en el mas cercano', async t => {
  const previous = process.env.TRUST_PROXY_HOPS;
  t.after(() => { if (previous === undefined) delete process.env.TRUST_PROXY_HOPS; else process.env.TRUST_PROXY_HOPS = previous; });
  for (const hops of [0, 1]) {
    process.env.TRUST_PROXY_HOPS = String(hops);
    const app = new Server().app;
    app.get('/probe-ip', (req, res) => res.json({ ip: req.ip }));
    const http = app.listen(0, '127.0.0.1');
    await once(http, 'listening');
    try {
      const response = await fetch(`http://127.0.0.1:${http.address().port}/probe-ip`, {
        headers: { 'X-Forwarded-For': '198.51.100.8, 203.0.113.10' },
      });
      assert.equal((await response.json()).ip, hops === 0 ? '127.0.0.1' : '203.0.113.10');
    } finally { await new Promise(resolve => http.close(resolve)); }
  }
});
