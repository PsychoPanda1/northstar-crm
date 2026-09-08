import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./validate-production-config.mjs', import.meta.url), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
for (const snippet of [
  'NORTHSTAR_ENV_FILE',
  'NORTHSTAR_SERVICE_TENANTS_JSON',
  'NORTHSTAR_SERVICE_ORIGINS_JSON',
  'unknown tenant',
  'must use HTTPS',
  'NORTHSTAR_TENANT_PROVIDER_CONFIG_JSON',
  'NORTHSTAR_REQUIRE_LIVE_PROVIDERS',
  'NORTHSTAR_BACKUP_MAX_AGE_HOURS',
  'NORTHSTAR_EXPECTED_WRITERS',
  'payment setup provider is missing'
]) assert(source.includes(snippet), `production config contract missing: ${snippet}`);
console.log('Northstar production config contract passed');
