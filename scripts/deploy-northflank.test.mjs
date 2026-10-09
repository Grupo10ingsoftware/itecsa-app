import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deployRelease, deploymentConfig, waitForVersion, createNorthflankClient, createProbe, snapshotDeployment } from './deploy-northflank.mjs';

const newVersion = 'a'.repeat(40);
const oldVersion = 'b'.repeat(40);
const image = (kind, digest) => `ghcr.io/example/app-${kind}@sha256:${digest.repeat(64)}`;
const services = ['API', 'WEB'].map(kind => ({ kind, id: kind.toLowerCase(), image: image(kind.toLowerCase(), 'a'), url: `https://${kind.toLowerCase()}.example.test` }));
const config = { version: newVersion, services };

function fixture() {
  const calls = [];
  const deployed = { api: image('api', 'b'), web: image('web', 'b') };
  let saved = false;
  return {
    calls, deployed,
    options: {
      request: async (id, method = 'GET', payload) => {
        if (method === 'GET') return { external: { imagePath: deployed[id], credentials: 'registry-credential' }, docker: { configType: 'default' } };
        assert.ok(saved, 'Guardar metadata antes de cualquier escritura.');
        calls.push({ id, payload });
        deployed[id] = payload.external.imagePath;
        return {};
      },
      persist: async () => { saved = true; },
      probe: async service => deployed[service.id] === service.image ? newVersion : oldVersion,
      isCurrent: async () => true,
      wait: async (service, expected, probe) => assert.equal(await probe(service), expected),
      log: () => {},
    },
  };
}

test('despliega API primero, despues WEB, conservando credencial de registro', async () => {
  const f = fixture();
  assert.equal((await deployRelease(config, f.options)).status, 'deployed');
  assert.deepEqual(f.calls.map(c => c.id), ['api', 'web']);
  assert.ok(f.calls.every(c => c.payload.external.credentials === 'registry-credential'));
});

test('Docker ausente o vacio usa la configuracion predeterminada', async () => {
  const f = fixture();
  const previous = { external: { imagePath: image('api', 'b'), credentials: 'registry-credential' } };
  assert.deepEqual(snapshotDeployment(previous).docker, { configType: 'default' });
  assert.deepEqual(snapshotDeployment({ ...previous, docker: {} }).docker, { configType: 'default' });
  const request = async (id, method = 'GET', payload) => {
    if (method === 'GET') return { external: { imagePath: f.deployed[id], credentials: 'registry-credential' } };
    return f.options.request(id, method, payload);
  };
  assert.equal((await deployRelease(config, { ...f.options, request })).status, 'deployed');
  assert.ok(f.calls.every(({ payload }) => payload.docker.configType === 'default'));
});

test('conserva opciones Docker explicitas y rechaza una configuracion parcial sin escribir', async () => {
  const previous = { external: { imagePath: image('api', 'b'), credentials: 'registry-credential' } };
  const docker = { configType: 'custom', customCommand: 'node app.js', customEntrypoint: '/start.sh' };
  assert.deepEqual(snapshotDeployment({ ...previous, docker }).docker, docker);

  const f = fixture();
  await assert.rejects(deployRelease(config, {
    ...f.options,
    request: async () => ({ ...previous, docker: { customCommand: 'node app.js' } }),
  }), /Falta configuracion Docker/);
  assert.equal(f.calls.length, 0);
});

test('una ejecucion obsoleta no modifica servicios', async () => {
  const f = fixture();
  assert.equal((await deployRelease(config, { ...f.options, isCurrent: async () => false })).status, 'skipped');
  assert.equal(f.calls.length, 0);
});

test('si main cambia durante preflight, no modifica servicios', async () => {
  const f = fixture();
  let calls = 0;
  await deployRelease(config, { ...f.options, isCurrent: async () => ++calls === 1 });
  assert.equal(f.calls.length, 0);
});

test('fallo de WEB restaura ambos y deja el despliegue fallido', async () => {
  const f = fixture();
  await assert.rejects(deployRelease(config, { ...f.options,
    wait: async (service, expected, probe) => {
      if (service.kind === 'WEB' && expected === newVersion) throw new Error('bad web');
      assert.equal(await probe(service), expected);
    },
  }), /pareja anterior restaurada/);
  assert.deepEqual(f.calls.map(c => c.id), ['api', 'web', 'api', 'web']);
  assert.equal(f.deployed.api, image('api', 'b'));
  assert.equal(f.deployed.web, image('web', 'b'));
});

test('timeout de PATCH aceptado tambien obliga restaurar; fallo de API no impide restaurar WEB', async () => {
  const f = fixture();
  const original = f.options.request;
  const request = async (id, method, payload) => {
    const result = await original(id, method, payload);
    if (method === 'PATCH' && id === 'api') throw new Error('lost response');
    return result;
  };
  await assert.rejects(deployRelease(config, { ...f.options, request }), /restauracion de API/);
  assert.deepEqual(f.calls.map(c => c.id), ['api', 'api', 'web']);
});

test('respuesta sana de version antigua no confirma rollout', async () => {
  let now = 0;
  await assert.rejects(waitForVersion(services[0], newVersion, async () => oldVersion, {
    timeoutMs: 20, intervalMs: 10, now: () => now, sleep: async ms => { now += ms; },
  }), /no alcanzo/);
});

test('fallo de preflight o snapshot sin digest no escribe', async () => {
  const f = fixture();
  await assert.rejects(deployRelease(config, { ...f.options, request: async () => ({external:{imagePath:'nginx:latest'}}) }), /digest/);
  assert.equal(f.calls.length, 0);
});

test('cliente Northflank usa PATCH vigente con deployment JSON', async () => {
  const request = createNorthflankClient({token:'secret', project:'project'}, async (url, opts) => {
    assert.equal(url, 'https://api.northflank.com/v1/projects/project/services/deployment/api');
    assert.equal(opts.method, 'PATCH');
    assert.equal(opts.headers.Authorization, 'Bearer secret');
    assert.deepEqual(JSON.parse(opts.body), {deployment:{docker:{configType:'default'}}});
    return {ok:true, json:async () => ({data:{deployment:{docker:{configType:'default'}}}})};
  });
  assert.deepEqual(await request('api','PATCH',{docker:{configType:'default'}}), {docker:{configType:'default'}});
});

test('config exige SHA/digests y origen HTTPS antes de usar credenciales', () => {
  const env = {RELEASE_SHA:newVersion, API_IMAGE:services[0].image, WEB_IMAGE:services[1].image,
    API_URL:services[0].url, WEB_URL:services[1].url, NORTHFLANK_PROJECT_ID:'p', NORTHFLANK_API_SERVICE_ID:'api',
    NORTHFLANK_WEB_SERVICE_ID:'web', NORTHFLANK_API_TOKEN:'test'};
  assert.equal(deploymentConfig(env).checkMain, true);
  assert.equal(deploymentConfig({...env, DEPLOY_MODE:'rollback'}).checkMain, false);
  assert.throws(() => deploymentConfig({...env, API_IMAGE:'nginx:latest'}), /digest/);
  assert.throws(() => deploymentConfig({...env, API_URL:'http://localhost'}), /HTTPS/);
});

test('la comprobacion API valida estado y version sin consultar readiness interna', async () => {
  const requests = [];
  const probe = createProbe(async url => {
    requests.push(url);
    return {ok:true, json:async () => ({status:'ok',version:newVersion})};
  });
  assert.equal(await probe(services[0]), newVersion);
  assert.equal(requests.length, 1);
  assert.ok(requests[0].includes('/api/health/live?'));
});

test('la comprobacion web valida la version sin consultar BD', async () => {
  const requests = [];
  const probe = createProbe(async url => {
    requests.push(url);
    return {ok:true, json:async () => ({version:newVersion})};
  });
  assert.equal(await probe(services[1]), newVersion);
  assert.equal(requests.length, 1);
  assert.ok(requests[0].includes('/version.json?'));
});
