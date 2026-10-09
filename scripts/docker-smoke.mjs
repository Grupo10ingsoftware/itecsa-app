import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import vm from 'node:vm';

const apiImage = process.env.API_IMAGE || 'itecsa-api:ci';
const webImage = process.env.WEB_IMAGE || 'itecsa-web:ci';
const expected = process.env.RELEASE_SHA || '1111111111111111111111111111111111111111';
const prefix = `itecsa-smoke-${randomUUID().slice(0, 8)}`;
const containers = [];
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function run(image, name, port, env) {
  containers.push(name);
  docker('run', '-d', '--name', name, '-p', `127.0.0.1::${port}`, ...Object.entries(env).flatMap(([k, v]) => ['-e', `${k}=${v}`]), image);
  const address = docker('port', name, `${port}/tcp`).split('\n')[0];
  return `http://${address}`;
}

async function ready(url) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return response;
    } catch { /* container startup */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`No arranco ${url}.`);
}

try {
  for (const image of [apiImage, webImage]) {
    const user = docker('image', 'inspect', '-f', '{{.Config.User}}', image);
    assert.ok(user && user !== 'root' && user !== '0');
    const files = docker('run', '--rm', '--entrypoint', 'sh', image, '-c', 'find /app /usr/share/nginx/html -type f \\( -name ".env" -o -name ".env.*" -o -name "*.pem" -o -name "*.key" \\) 2>/dev/null || true');
    assert.equal(files, '', 'No deben quedar secretos ni certificados locales en imagen.');
  }
  const apiName = `${prefix}-api`;
  const api = run(apiImage, apiName, 3000, {
    APP_ENV: 'production', NODE_ENV: 'production',
    AUTH0_DOMAIN: 'test.example.auth0.com', AUTH0_AUDIENCE: 'https://api.example.test',
    FRONTEND_ORIGIN: 'http://localhost:8080', PIN_SECRET: Buffer.alloc(32, 1).toString('base64'),
    RATE_LIMIT_SECRET: 'smoke-only-rate-limit-secret-that-is-long-enough',
    SECURITY_LOG_HMAC_KEY: 'smoke-only-security-log-secret-that-is-long-enough',
  });
  const live = await (await ready(`${api}/api/health/live`)).json();
  assert.deepEqual(live, { status: 'ok', version: expected });
  assert.equal((await fetch(`${api}/api/health/db`)).status, 404);
  assert.equal((await fetch(`${api}/internal/ready`)).status, 404);
  assert.equal((await fetch(`${api}/api/auth/verify`)).status, 401);
  assert.equal(docker('exec', apiName, 'node', '-e', "const {PrismaClient}=require('@prisma/client');if(typeof PrismaClient!=='function')process.exit(1)"), '');

  for (const [index, domain, clientId] of [[1, 'first.example.auth0.com', 'first'], [2, 'second.example.auth0.com', '";window.injected=true;//']]) {
    const name = `${prefix}-web${index}`;
    const url = run(webImage, name, 8080, {
      VITE_AUTH0_DOMAIN: domain, VITE_AUTH0_CLIENT_ID: clientId,
      VITE_AUTH0_AUDIENCE: 'https://api.example.test', VITE_API_BASE_URL: `${api}/api`,
      DB_PASSWORD: 'server-only-never-web',
    });
    assert.deepEqual(await (await ready(`${url}/version.json`)).json(), { version: expected });
    const configResponse = await fetch(`${url}/runtime-config.js`);
    assert.equal(configResponse.headers.get('cache-control'), 'no-store');
    const config = await configResponse.text();
    assert.ok(!config.includes('server-only-never-web'));
    const sandbox = { window: {} };
    vm.runInNewContext(config, sandbox);
    assert.equal(sandbox.window.__ITECSA_CONFIG__.auth0Domain, domain);
    assert.equal(sandbox.window.__ITECSA_CONFIG__.auth0ClientId, clientId);
    assert.equal(sandbox.window.__ITECSA_CONFIG__.apiBaseUrl, `${api}/api`);
    assert.equal(sandbox.window.injected, undefined, 'La configuracion se serializa como datos.');
    const indexHtml = await (await fetch(`${url}/`)).text();
    const deepLink = await fetch(`${url}/kanban`);
    assert.equal(deepLink.status, 200);
    assert.equal(await deepLink.text(), indexHtml);
    assert.ok(indexHtml.indexOf('/runtime-config.js') < indexHtml.indexOf('/assets/'));
    assert.equal((await fetch(`${url}/assets/missing.js`)).status, 404);
    assert.equal(docker('exec', name, 'id', '-u') === '0', false);
  }
  docker('stop', '--time', '15', apiName);
  assert.equal(docker('inspect', '-f', '{{.State.ExitCode}}', apiName), '0', 'SIGTERM debe cerrar limpiamente.');
  console.log('Docker: API/Prisma, dos configuraciones de la misma imagen web, rutas SPA, secretos y SIGTERM OK.');
} finally {
  for (const name of containers) {
    try { docker('rm', '-f', name); } catch { /* already removed */ }
  }
}
