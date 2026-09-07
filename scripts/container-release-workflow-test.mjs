import { readFile } from 'node:fs/promises';

const workflows = [
  ['.github/workflows/ci.yml', 'ci'],
  ['.github/workflows/container-release.yml', 'release'],
  ['docker-compose.yml', 'compose'],
  ['.env.example', 'environment example']
];
const requiredSecrets = [
  'NORTHSTAR_PAYMENT_WEBHOOK_SECRET',
  'NORTHSTAR_MESSAGE_WEBHOOK_SECRET',
  'NORTHSTAR_CALL_WEBHOOK_SECRET',
  'NORTHSTAR_FINANCING_WEBHOOK_SECRET',
  'NORTHSTAR_FLEET_WEBHOOK_SECRET'
];

const dockerfile = await readFile(new URL('../Dockerfile', import.meta.url), 'utf8');
if (!dockerfile.includes('ENV NORTHSTAR_SQLITE_FILE=/app/data/northstar.sqlite') || !dockerfile.includes('ENV NORTHSTAR_REQUIRE_SQLITE=true') || !dockerfile.includes('USER node') || !dockerfile.includes('VOLUME ["/app/data"]')) throw new Error('container image must default to unprivileged SQLite-backed persistent storage');

for (const [path, label] of workflows) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  for (const secret of requiredSecrets) {
    const marker = label === 'compose' ? `${secret}:` : label === 'environment example' ? `${secret}=` : `--env ${secret}=`;
    if (!source.includes(marker)) throw new Error(`${label} readiness fixture missing ${secret}`);
  }
  if (label !== 'environment example' && !source.includes('/api/ready')) throw new Error(`${label} workflow readiness endpoint missing`);
}
console.log('Northstar container release workflow checks passed');
