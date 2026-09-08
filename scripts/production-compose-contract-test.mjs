import { readFile } from 'node:fs/promises';

const [compose, envExample, caddy] = await Promise.all([
  readFile(new URL('../docker-compose.production.yml', import.meta.url), 'utf8'),
  readFile(new URL('../.env.production.example', import.meta.url), 'utf8'),
  readFile(new URL('../deploy/Caddyfile', import.meta.url), 'utf8')
]);
const assert = (condition, message) => { if (!condition) throw new Error(message); };

for (const snippet of [
  'image: ${NORTHSTAR_IMAGE:-ghcr.io/psychopanda1/northstar-crm:latest}',
  'NORTHSTAR_REQUIRE_SQLITE: "true"',
  'NORTHSTAR_EXPECTED_WRITERS: "1"',
  'NORTHSTAR_BACKUP_FILE: /app/data/northstar.sqlite.backup',
  'condition: service_healthy',
  './deploy/Caddyfile:/etc/caddy/Caddyfile:ro',
  '443:443'
]) assert(compose.includes(snippet), `production compose contract missing: ${snippet}`);
assert(compose.includes('body.ok !== true || Object.values(body.checks || {}).some(value => value !== true)'), 'production Compose healthcheck must verify every readiness check');
for (const snippet of ['NORTHSTAR_HOST=', 'NORTHSTAR_IMAGE=', 'NORTHSTAR_TENANTS_JSON=', 'NORTHSTAR_SERVICE_TENANTS_JSON=', 'NORTHSTAR_SERVICE_ORIGINS_JSON=', 'NORTHSTAR_REQUIRE_LIVE_PROVIDERS']) assert(envExample.includes(snippet), `production env template missing: ${snippet}`);
assert(caddy.includes('reverse_proxy northstar:4173') && caddy.includes('encode gzip'), 'Caddy HTTPS proxy contract missing');
console.log('Northstar production compose contract passed');
