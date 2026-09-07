const rawOrigin = String(process.env.NORTHSTAR_DEPLOYMENT_URL || '').trim();
if (!rawOrigin) {
  console.error('Set NORTHSTAR_DEPLOYMENT_URL to the deployed CRM origin.');
  process.exit(2);
}

let origin;
try {
  origin = new URL(rawOrigin);
  origin.pathname = origin.pathname.replace(/\/+$/, '');
  origin.search = '';
  origin.hash = '';
} catch {
  console.error('NORTHSTAR_DEPLOYMENT_URL must be a valid URL.');
  process.exit(2);
}

const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
if (origin.protocol !== 'https:' && !(isLoopback && process.env.NORTHSTAR_DEPLOYMENT_ALLOW_HTTP === 'true')) {
  console.error('Deployment verification requires HTTPS; HTTP is allowed only for an explicit loopback check.');
  process.exit(2);
}

const fetchJson = async (path) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(new URL(path, origin), { signal: controller.signal, headers: { accept: 'application/json' } });
    const body = await response.json().catch(() => ({}));
    return { response, body };
  } finally {
    clearTimeout(timeout);
  }
};

const failures = [];
const requiredReadinessChecks = ['configuration', 'storageConfiguration', 'persistentState', 'persistentStorage', 'backupConfiguration', 'backupStorage', 'backupSnapshot', 'tenantDataIntegrity', 'auditLedger'];
const check = async (label, path, validator) => {
  try {
    const result = await fetchJson(path);
    if (!result.response.ok) failures.push(`${label}: HTTP ${result.response.status}`);
    else if (!validator(result.body)) failures.push(`${label}: response contract failed`);
    else console.log(`${label}: ready`);
  } catch (error) {
    failures.push(`${label}: ${error.name === 'AbortError' ? 'timeout' : 'unreachable'}`);
  }
};

await check('health', '/api/health', (body) => body?.ok === true);
await check('readiness', '/api/ready', (body) => body?.ok === true && requiredReadinessChecks.every((key) => Object.prototype.hasOwnProperty.call(body.checks || {}, key) && body.checks[key] === true) && Object.values(body.checks || {}).every(Boolean));

try {
  const response = await fetch(new URL('/api/openapi.yaml', origin), { headers: { accept: 'text/yaml' } });
  const body = await response.text();
  if (!response.ok) failures.push(`openapi: HTTP ${response.status}`);
  else if (!body.includes('openapi: 3.0.3') || !body.includes('/api/public/customer-portal/message:')) failures.push('openapi: response contract failed');
  else console.log('openapi: ready');
} catch {
  failures.push('openapi: unreachable');
}

const service = String(process.env.NORTHSTAR_DEPLOYMENT_SERVICE || '').trim();
if (service) await check('tenant manifest', `/api/public/tenant?service=${encodeURIComponent(service)}`, (body) => body?.tenant?.slug && body?.service === service);

if (failures.length) {
  console.error(`Deployment verification failed: ${failures.join(' · ')}`);
  process.exit(1);
}
console.log('Deployment verification passed. Provider delivery, identity, backups, and real customer flow still require deployment-owner validation.');
