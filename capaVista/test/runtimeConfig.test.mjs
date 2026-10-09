import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveRuntimeConfig } from '../src/config/runtimeConfig.js';

test('runtime prevalece sobre Vite y no incorpora secretos', () => {
  const result = resolveRuntimeConfig({apiBaseUrl:' https://api.client.test/api ', auth0Domain:'client.auth0.com', DB_PASSWORD:'secret'}, {VITE_API_BASE_URL:'http://localhost:3000/api',VITE_AUTH0_CLIENT_ID:'local'});
  assert.equal(result.apiBaseUrl, 'https://api.client.test/api');
  assert.equal(result.auth0Domain, 'client.auth0.com');
  assert.equal(result.auth0ClientId, 'local');
  assert.equal('DB_PASSWORD' in result, false);
});

test('configuracion faltante conserva valores vacios para errores controlados de API', () => {
  assert.equal(resolveRuntimeConfig().apiBaseUrl, '');
  assert.equal(resolveRuntimeConfig({apiBaseUrl:''}, {VITE_API_BASE_URL:'http://localhost'}).apiBaseUrl, '');
});
