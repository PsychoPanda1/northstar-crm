import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../release-readiness-owner.js', import.meta.url), 'utf8');
for (const snippet of [
  "repository.session?.owner?.role || ''",
  'const remediation = {',
  'NORTHSTAR_ALLOWED_ORIGINS',
  'NORTHSTAR_SESSION_SECRET',
  'NORTHSTAR_PUBLIC_URL',
  'Resolve this configuration or persistence check before production use.'
]) {
  if (!source.includes(snippet)) throw new Error(`release readiness UI wiring missing: ${snippet}`);
}
console.log('Northstar release readiness UI checks passed');
