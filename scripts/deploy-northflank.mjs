import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DIGEST_IMAGE = /^ghcr\.io\/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;

function required(env, key) {
  if (!env[key]?.trim()) throw new Error(`Falta ${key}.`);
  return env[key].trim();
}

export function deploymentConfig(env) {
  const version = required(env, 'RELEASE_SHA');
  if (!COMMIT.test(version)) throw new Error('RELEASE_SHA debe ser un SHA completo.');
  const services = ['API', 'WEB'].map(kind => {
    const image = required(env, `${kind}_IMAGE`);
    if (!DIGEST_IMAGE.test(image)) throw new Error(`${kind}_IMAGE debe usar un digest GHCR.`);
    const url = new URL(required(env, `${kind}_URL`));
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new Error(`${kind}_URL debe ser un origen HTTPS sin credenciales.`);
    }
    return { kind, id: required(env, `NORTHFLANK_${kind}_SERVICE_ID`), image, url: url.origin };
  });
  if (services[0].id === services[1].id) throw new Error('Los servicios API y WEB deben ser distintos.');
  return {
    token: required(env, 'NORTHFLANK_API_TOKEN'),
    project: required(env, 'NORTHFLANK_PROJECT_ID'),
    version,
    services,
    // Rollouts are serialized by the GitHub workflow. Manual rollback intentionally allows an older SHA.
    checkMain: env.DEPLOY_MODE !== 'rollback',
    githubToken: env.GITHUB_TOKEN,
    repository: env.GITHUB_REPOSITORY,
  };
}

export function snapshotDeployment(data) {
  if (!data.external || !DIGEST_IMAGE.test(data.external.imagePath)) {
    throw new Error('El servicio previo debe usar una imagen externa fijada por digest. Completar bootstrap antes de automatizar.');
  }
  if (!data.external.credentials) throw new Error('El servicio debe tener una credencial de lectura GHCR configurada.');
  if (!data.docker?.configType) throw new Error('Falta configuracion Docker del servicio.');
  return {
    external: { imagePath: data.external.imagePath, credentials: data.external.credentials },
    docker: Object.fromEntries(['configType', 'customCommand', 'customEntrypoint'].filter(key => data.docker[key] !== undefined).map(key => [key, data.docker[key]])),
  };
}

export function createNorthflankClient({ token, project }, fetchImpl = fetch) {
  return async function request(id, method = 'GET', payload) {
    const resource = method === 'GET' ? `services/${encodeURIComponent(id)}` : `services/deployment/${encodeURIComponent(id)}`;
    const response = await fetchImpl(
      `https://api.northflank.com/v1/projects/${encodeURIComponent(project)}/${resource}`,
      {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: payload === undefined ? undefined : JSON.stringify({ deployment: payload }),
        signal: AbortSignal.timeout(30_000),
      },
    );
    // Do not print API response bodies, headers, configuration or tokens.
    if (!response.ok) throw new Error(`Northflank ${method}: HTTP ${response.status}.`);
    const result = await response.json();
    if (!result.data?.deployment) throw new Error('Respuesta Northflank sin deployment.');
    return result.data.deployment;
  };
}

export async function mainHead(config, fetchImpl = fetch) {
  if (!config.checkMain) return true;
  if (!config.githubToken || !config.repository) throw new Error('Falta acceso GitHub para comprobar main.');
  const response = await fetchImpl(`https://api.github.com/repos/${config.repository}/git/ref/heads/main`, {
    headers: { Authorization: `Bearer ${config.githubToken}`, Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`No se pudo verificar main: HTTP ${response.status}.`);
  return (await response.json()).object?.sha === config.version;
}

export function createProbe(fetchImpl = fetch) {
  return async function probe(service) {
    const path = service.kind === 'API' ? '/api/health/live' : '/version.json';
    const response = await fetchImpl(`${service.url}${path}?release-check=${Date.now()}`, {
      cache: 'no-store', signal: AbortSignal.timeout(10_000), redirect: 'error',
    });
    if (!response.ok) throw new Error(`Chequeo ${service.kind}: HTTP ${response.status}.`);
    const body = await response.json();
    if (service.kind === 'API' && body.status !== 'ok') throw new Error('API sin estado saludable.');
    if (!COMMIT.test(body.version)) throw new Error(`Version ${service.kind} no valida.`);
    return body.version;
  };
}

export async function waitForVersion(service, version, probe, {
  timeoutMs = 600_000, intervalMs = 10_000,
  now = Date.now, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
} = {}) {
  const deadline = now() + timeoutMs;
  do {
    try {
      if (await probe(service) === version) return;
    } catch { /* Transient routing/startup failures are retried within the deadline. */ }
    await sleep(intervalMs);
  } while (now() < deadline);
  throw new Error(`${service.kind} no alcanzo la version esperada dentro del plazo.`);
}

export async function deployRelease(config, {
  request = createNorthflankClient(config), probe = createProbe(),
  isCurrent = () => mainHead(config), wait = waitForVersion,
  persist = async () => {}, log = console.log,
} = {}) {
  if (!await isCurrent()) {
    log('Commit obsoleto: despliegue omitido.');
    return { status: 'skipped', version: config.version };
  }
  const previous = [];
  // Finish all read-only checks and persist rollback metadata before the first mutation.
  for (const service of config.services) {
    previous.push({ service, deployment: snapshotDeployment(await request(service.id)), version: await probe(service) });
  }
  await persist(previous);
  if (!await isCurrent()) {
    log('main cambio durante la preparacion: despliegue omitido.');
    return { status: 'skipped', version: config.version };
  }
  let mutated = false;
  try {
    for (const { service, deployment } of previous) {
      // Mark before PATCH: a timeout may hide an update already accepted by Northflank.
      mutated = true;
      await request(service.id, 'PATCH', {
        external: { ...deployment.external, imagePath: service.image },
        docker: deployment.docker,
      });
      await wait(service, config.version, probe);
      log(`${service.kind}: version ${config.version} verificada.`);
    }
    // Check the pair again after the second service has changed.
    for (const service of config.services) {
      if (await probe(service) !== config.version) throw new Error('La pareja desplegada no coincide.');
    }
    return { status: 'deployed', version: config.version };
  } catch {
    const failed = [];
    if (mutated) {
      // Attempt BOTH restores even if the first fails. Do not cancel a rollout mid-mutation.
      for (const { service, deployment, version } of previous) {
        try {
          await request(service.id, 'PATCH', deployment);
          await wait(service, version, probe);
        } catch { failed.push(service.kind); }
      }
    }
    if (failed.length) throw new Error(`Fallo despliegue y restauracion de ${failed.join(', ')}. Revisar Northflank; metadata previa guardada.`);
    throw new Error('Fallo despliegue; pareja anterior restaurada y verificada.');
  }
}

async function run() {
  const config = deploymentConfig(process.env);
  const directory = process.env.DEPLOY_METADATA_DIR || '/tmp/itecsa-deployment';
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const persist = previous => writeFile(`${directory}/previous.json`, JSON.stringify(previous.map(({service, deployment, version}) => ({
    kind: service.kind, id: service.id, image: deployment.external.imagePath, version,
  })), null, 2), { mode: 0o600 });
  let result;
  let failure;
  try {
    result = await deployRelease(config, { persist });
  } catch (error) {
    failure = error;
    result = { status: 'failed', version: config.version };
  }
  const release = { ...result, images: config.services.map(({ kind, image }) => ({ kind, image })) };
  await writeFile(`${directory}/release.json`, JSON.stringify(release, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `\nDespliegue: **${result.status}**\n\nCommit: \`${config.version}\`\n\n${config.services.map(s => `- ${s.kind}: \`${s.image}\``).join('\n')}\n`);
  }
  if (failure) throw failure;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch(error => { console.error(error.message); process.exitCode = 1; });
}
