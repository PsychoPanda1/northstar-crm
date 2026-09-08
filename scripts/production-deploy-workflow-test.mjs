import { readFile } from 'node:fs/promises';

const workflow = await readFile(new URL('../.github/workflows/deploy-production.yml', import.meta.url), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

for (const marker of [
  'workflow_dispatch:',
  'PRODUCTION_SSH_PRIVATE_KEY',
  'PRODUCTION_SSH_KNOWN_HOSTS',
  'docker compose -f docker-compose.production.yml pull northstar',
  'docker compose -f docker-compose.production.yml up -d --remove-orphans northstar https prometheus',
  '/api/ready',
  'deployment_url must be an HTTPS origin',
  'ghcr.io/${{ github.repository }}:${{ inputs.image_tag }}'
]) {
  assert(workflow.includes(marker), `Missing production deployment marker: ${marker}`);
}

assert(!workflow.includes('NORTHSTAR_SESSION_SECRET'), 'Deployment workflow must not accept application secrets as workflow inputs');
assert(workflow.includes('test -f .env.production'), 'Deployment must require an existing private production env file');
assert(workflow.includes('Object.values(body.checks || {}).some'), 'Deployment must fail when any readiness check is false');
console.log('Production deployment workflow contract passed.');
