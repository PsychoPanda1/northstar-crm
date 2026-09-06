import { readFile } from 'node:fs/promises';

const workflows = [
  ['.github/workflows/ci.yml', 'ci'],
  ['.github/workflows/container-release.yml', 'release']
];
const requiredSecrets = [
  'NORTHSTAR_PAYMENT_WEBHOOK_SECRET',
  'NORTHSTAR_MESSAGE_WEBHOOK_SECRET',
  'NORTHSTAR_CALL_WEBHOOK_SECRET',
  'NORTHSTAR_FINANCING_WEBHOOK_SECRET',
  'NORTHSTAR_FLEET_WEBHOOK_SECRET'
];

for (const [path, label] of workflows) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  for (const secret of requiredSecrets) {
    if (!source.includes(`--env ${secret}=`)) throw new Error(`${label} workflow readiness fixture missing ${secret}`);
  }
  if (!source.includes('/api/ready')) throw new Error(`${label} workflow readiness endpoint missing`);
}
console.log('Northstar container release workflow checks passed');
